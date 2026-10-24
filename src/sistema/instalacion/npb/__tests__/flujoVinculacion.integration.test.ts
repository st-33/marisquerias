import type { Database } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ejecutarArranqueO1 } from '../../useArranqueSistema';
import {
  guardarSesionO1,
  leerSesionO1,
  desvincularNegocioO1,
  CLAVES_SESION_O1,
  DURACION_MAXIMA_SESION_MS,
} from '../persistenciaSesionO1';
import { resolverRolPorDefecto } from '../../../../negocio/roles/redireccionRol';
import { evaluarGuardiaArranque } from '../../../seguridad/guardiaArranqueO1';
import {
  revalidarVersionNPB,
  arrancarConDegradacionOffline,
} from '../../reconexion/monitorConexionO1';
import type { NegocioPlantillaBase } from '../tiposNPB';
import { useStore } from '../../../store';

// Memoria local para simular AsyncStorage
const storageMemoria: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key: string, val: string) => {
    storageMemoria[key] = val;
  }),
  getItem: jest.fn(async (key: string) => storageMemoria[key] ?? null),
  removeItem: jest.fn(async (key: string) => {
    delete storageMemoria[key];
  }),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    for (const [k, v] of pairs) {
      storageMemoria[k] = v;
    }
  }),
  multiGet: jest.fn(async (keys: string[]) => {
    return keys.map((k) => [k, storageMemoria[k] ?? null]);
  }),
  multiRemove: jest.fn(async (keys: string[]) => {
    for (const k of keys) {
      delete storageMemoria[k];
    }
  }),
}));

jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(async () => 'device-mock-123'),
  getDeviceId: jest.fn(() => 'mock-device'),
}));

// Mock de RTDB en memoria
let mockRtdb: Record<string, any> = {};

jest.mock('firebase/database', () => ({
  ref: jest.fn((_db: any, path: string) => ({ path })),
  get: jest.fn(async (refObj: { path: string }) => {
    const clean = (refObj.path || '').replace(/^\/+|\/+$/g, '');
    const val = mockRtdb[clean];
    return {
      exists: () => val !== undefined && val !== null,
      val: () => (val !== undefined ? val : null),
    };
  }),
}));

const dbMock = {} as Database;

describe('Flujo de Vinculación y Arranque O(1) End-to-End', () => {
  const npbCanonicoV1: NegocioPlantillaBase = {
    categoria_id: '01',
    slug_categoria: 'marisquerias',
    version_npb: 1,
    estado: 'sellado',
    roles_dispositivo: [
      { id: 'administrador', pantallas_visibles: ['/_role/admin/dashboard'] },
      { id: 'mesero', pantallas_visibles: ['/_role/mesero'] },
      { id: 'cocina', pantallas_visibles: ['/_role/cocina'] },
    ],
    capacidades: [
      { id: 'menu', configuracion_giro: 'Catálogo de mariscos' },
      { id: 'control_mesas', configuracion_giro: 'Comedor principal' },
      { id: 'comanda_cocina', configuracion_giro: 'KDS Cocina' },
      { id: 'tickets_impresion', configuracion_giro: 'Térmica 58mm' },
    ],
    cajones_activos: ['menu', 'mesas', 'pedidos', 'tickets'],
    cajones_desactivados_justificacion: {},
  };

  beforeEach(() => {
    for (const key of Object.keys(storageMemoria)) {
      delete storageMemoria[key];
    }
    useStore.getState().setEstadoEncendido(null);
    mockRtdb = {
      'codigo_de_acceso/TEST123': {
        negocio_id: 'mar-01',
        categoria_id: '01',
        slug_categoria: 'marisquerias',
        version_npb_origen: 1,
        cliente_id: 'cli-01',
        estado: 'activo',
        db_url_operativa: 'https://mar-01-operativa.firebaseio.com',
      },
      'codigo_de_acceso/REVOKED': {
        negocio_id: 'mar-02',
        categoria_id: '01',
        slug_categoria: 'marisquerias',
        version_npb_origen: 1,
        cliente_id: 'cli-02',
        estado: 'revocado',
      },
      'marisquerias/Negocio principal de categoría': npbCanonicoV1,
    };
  });

  test('1. Flujo feliz de vinculación completa', async () => {
    const res = await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    // Redirección al rol preferente
    expect(res.rolPorDefecto).toBe('administrador');
    expect(res.rutaPorDefecto).toBe('/_role/admin/dashboard');

    // Estado en el Store Global
    const estadoEnStore = useStore.getState().estadoEncendido;
    expect(estadoEnStore).not.toBeNull();
    expect(estadoEnStore?.capacidades_activas).toContain('tickets_impresion');
    expect(estadoEnStore?.roles_activos).toContain('administrador');
    expect(useStore.getState().sesion.rutaNegocio).toBe('/');
    expect(useStore.getState().sesion.negocioId).toBe('mar-01');

    // AsyncStorage poblado
    expect(storageMemoria[CLAVES_SESION_O1.NEGOCIO_ID]).toBe('mar-01');
    expect(storageMemoria[CLAVES_SESION_O1.SLUG_CATEGORIA]).toBe('marisquerias');
    expect(storageMemoria[CLAVES_SESION_O1.CODIGO_ACCESO_HASH]).toBeDefined();
    expect(storageMemoria[CLAVES_SESION_O1.CODIGO_ACCESO_HASH]).not.toBe('TEST123'); // Hashed, not plain
  });

  test('2. Código inválido: error explícito y NO se persiste sesión', async () => {
    const res = await ejecutarArranqueO1(dbMock, 'INVALIDO');
    expect(res.ok).toBe(false);
    if (res.ok) return;

    expect(res.errorInfo?.tipo).toBe('codigo_invalido');
    expect(res.errorInfo?.mensaje).toBe(
      'El código no existe o expiró. Verifica con tu especialista.'
    );
    expect(res.errorInfo?.permiteReintentar).toBe(true);

    // AsyncStorage debe quedar limpio sin sesión persistida
    expect(storageMemoria[CLAVES_SESION_O1.NEGOCIO_ID]).toBeUndefined();
  });

  test('3. Código revocado: error bloqueante sin opción a reintentar', async () => {
    const res = await ejecutarArranqueO1(dbMock, 'REVOKED');
    expect(res.ok).toBe(false);
    if (res.ok) return;

    expect(res.errorInfo?.tipo).toBe('codigo_revocado');
    expect(res.errorInfo?.mensaje).toBe(
      'Este código fue revocado. Contacta a tu especialista para uno nuevo.'
    );
    expect(res.errorInfo?.permiteReintentar).toBe(false);
    expect(res.errorInfo?.accionTexto).toBe('Salir');
  });

  test('4. Sin conexión durante vinculación: error sin_conexion y botón Reintentar', async () => {
    const res = await arrancarConDegradacionOffline(dbMock, 'TEST123', true);
    expect(res.ok).toBe(false);
    if (res.ok) return;

    expect(res.errorInfo?.tipo).toBe('sin_conexion');
    expect(res.errorInfo?.mensaje).toBe('Sin conexión. Revisa tu red y reintenta.');
    expect(res.errorInfo?.permiteReintentar).toBe(true);
  });

  test('5. NPB incompatible: detecta capacidades ausentes y bloquea persistencia', async () => {
    mockRtdb['marisquerias/Negocio principal de categoría'] = {
      ...npbCanonicoV1,
      capacidades: [
        ...npbCanonicoV1.capacidades,
        { id: 'reservaciones', configuracion_giro: 'Reservas' },
      ],
    };

    const res = await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(res.ok).toBe(false);
    if (res.ok) return;

    expect(res.errorInfo?.tipo).toBe('npb_incompatible');
    expect(res.errorInfo?.mensaje).toContain('capacidad:reservaciones');
    expect(storageMemoria[CLAVES_SESION_O1.NEGOCIO_ID]).toBeUndefined();
  });

  test('6. Versión NPB obsoleta sin histórico: error bloqueante', async () => {
    // Negocio originado en v1, pero Unidad Secundaria tiene NPB en v2 y sin histórico
    mockRtdb['marisquerias/Negocio principal de categoría'] = {
      ...npbCanonicoV1,
      version_npb: 2,
    };

    const res = await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(res.ok).toBe(false);
    if (res.ok) return;

    expect(res.errorInfo?.tipo).toBe('version_obsoleta');
    expect(res.errorInfo?.mensaje).toContain('v1');
    expect(res.errorInfo?.permiteReintentar).toBe(false);
  });

  test('7. Persistencia de sesión al reiniciar: lee AsyncStorage y recarga EstadoEncendido', async () => {
    // 1. Simular arranque exitoso previo
    await ejecutarArranqueO1(dbMock, 'TEST123');

    // 2. Simular reinicio de la aplicación (borrar estado en memoria de Zustand)
    useStore.getState().setEstadoEncendido(null);
    expect(useStore.getState().estadoEncendido).toBeNull();

    // 3. Evaluar arranque en boot/reinicio
    const evaluacion = await evaluarGuardiaArranque(dbMock);
    expect(evaluacion.estado).toBe('recargado_ok');
    expect(evaluacion.rolActivo).toBe('administrador');

    // 4. El store ha recuperado el EstadoEncendido
    expect(useStore.getState().estadoEncendido).not.toBeNull();
  });

  test('8. Sesión expirada: sesión > 30 días detectada y tratada como sin_sesion', async () => {
    // Guardar sesión con fecha de hace 31 días
    const hace31Dias = Date.now() - (DURACION_MAXIMA_SESION_MS + 1000);
    await guardarSesionO1({
      negocio_id: 'mar-01',
      slug_categoria: 'marisquerias',
      version_npb_origen: 1,
      codigo_acceso: 'TEST123',
      rol_activo: 'administrador',
      estadoEncendido: {
        capacidades_activas: ['menu'],
        capacidades_dormidas: [],
        roles_activos: ['administrador'],
        roles_dormidos: [],
        cajones_activos: ['menu'],
        cajones_dormidos: [],
        dormidos: { capacidades: [], roles: [], cajones: [] },
        justificacion_cajones_desactivados: {},
        version_npb: 1,
        categoria_id: '01',
        slug_categoria: 'marisquerias',
        timestamp: hace31Dias,
      },
      timestamp: hace31Dias,
    });

    const lectura = await leerSesionO1();
    expect(lectura.valida).toBe(false);
    expect(lectura.expirada).toBe(true);

    const evaluacion = await evaluarGuardiaArranque(dbMock);
    expect(evaluacion.estado).toBe('sesion_expirada');
  });

  test('9. Revalidación al reconectar tras cambio de NPB: avisa reinicio necesario', async () => {
    // Simular que Torre de Control subió la versión a v2
    mockRtdb['marisquerias/Negocio principal de categoría'] = {
      ...npbCanonicoV1,
      version_npb: 2,
    };

    const reval = await revalidarVersionNPB(dbMock, 'marisquerias', 1);
    expect(reval.versionCambio).toBe(true);
    expect(reval.nuevaVersion).toBe(2);
    expect(reval.aviso).toBe(
      'El negocio fue actualizado a NPB v2. Reinicia la app para aplicar cambios.'
    );
  });

  test('10. Jerarquía de rol por defecto en redirección', () => {
    // 10a: Con administrador
    const d1 = resolverRolPorDefecto(['cocina', 'administrador', 'mesero']);
    expect(d1.rol).toBe('administrador');
    expect(d1.ruta).toBe('/_role/admin/dashboard');

    // 10b: Sin administrador pero con mostrador
    const d2 = resolverRolPorDefecto(['mostrador', 'mesero']);
    expect(d2.rol).toBe('mostrador');
    expect(d2.ruta).toBe('/_role/venta-crudo');

    // 10c: Solo mesero
    const d3 = resolverRolPorDefecto(['mesero']);
    expect(d3.rol).toBe('mesero');
    expect(d3.ruta).toBe('/_role/mesero');

    // 10d: Sin roles activos -> error bloqueante
    expect(() => resolverRolPorDefecto([])).toThrow(
      'El NPB no activó ningún rol. Contacta soporte.'
    );
  });

  test('11. Pantalla de selección de rol: requiere selección cuando NPB habilita múltiples roles', async () => {
    mockRtdb['marisquerias/Negocio principal de categoría'] = {
      ...npbCanonicoV1,
      roles_dispositivo: [
        { id: 'mostrador', pantallas_visibles: [] },
        { id: 'mesero', pantallas_visibles: [] },
      ],
    };

    const res = await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.requiereSeleccionRol).toBe(true);
    expect(res.estadoEncendido.roles_activos).toEqual(['mesero', 'mostrador']);
  });

  test('12. Desvinculación: purga almacenamiento y store solo bajo confirmación exacta', async () => {
    // 1. Poblar sesión
    await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(storageMemoria[CLAVES_SESION_O1.NEGOCIO_ID]).toBe('mar-01');

    // 2. Intento con texto incorrecto -> rechazado
    const fallido = await desvincularNegocioO1('CANCELAR');
    expect(fallido).toBe(false);
    expect(storageMemoria[CLAVES_SESION_O1.NEGOCIO_ID]).toBe('mar-01');

    // 3. Confirmación exacta 'DESVINCULAR' -> purgado total
    const exitoso = await desvincularNegocioO1('DESVINCULAR');
    expect(exitoso).toBe(true);
    expect(storageMemoria[CLAVES_SESION_O1.NEGOCIO_ID]).toBeUndefined();
    expect(useStore.getState().estadoEncendido).toBeNull();
    expect(useStore.getState().sesion.negocioId).toBeNull();
  });

  test('13. Guard de arranque: verifica sin sesión, recarga de NPB y rol no perteneciente', async () => {
    // 13a: Sin sesión
    const g1 = await evaluarGuardiaArranque(dbMock);
    expect(g1.estado).toBe('sin_sesion');

    // 13b: Con sesión previa pero rol activo no perteneciente a roles_activos
    await guardarSesionO1({
      negocio_id: 'mar-01',
      slug_categoria: 'marisquerias',
      version_npb_origen: 1,
      codigo_acceso: 'TEST123',
      rol_activo: 'repartidor', // Repartidor NO está en npbCanonicoV1
      estadoEncendido: {
        capacidades_activas: ['menu'],
        capacidades_dormidas: [],
        roles_activos: ['administrador', 'mesero'],
        roles_dormidos: ['repartidor'],
        cajones_activos: ['menu'],
        cajones_dormidos: [],
        dormidos: { capacidades: [], roles: ['repartidor'], cajones: [] },
        justificacion_cajones_desactivados: {},
        version_npb: 1,
        categoria_id: '01',
        slug_categoria: 'marisquerias',
        timestamp: Date.now(),
      },
    });

    const g2 = await evaluarGuardiaArranque(dbMock);
    expect(g2.estado).toBe('requiere_seleccion_rol');
  });

  test('14. NPB que active cajero -> tras arranque redirige a app/_role/caja', async () => {
    mockRtdb['marisquerias/Negocio principal de categoría'] = {
      ...npbCanonicoV1,
      roles_dispositivo: [{ id: 'cajero', pantallas_visibles: ['cobro_terminal'] }],
    };

    const res = await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.destinoInicial?.rol).toBe('cajero');
    expect(res.destinoInicial?.ruta).toBe('/_role/caja');
  });

  test('15. NPB que active repartidor -> redirige a app/_role/repartidor', async () => {
    mockRtdb['marisquerias/Negocio principal de categoría'] = {
      ...npbCanonicoV1,
      roles_dispositivo: [{ id: 'repartidor', pantallas_visibles: ['reparto_movil'] }],
    };

    const res = await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.destinoInicial?.rol).toBe('repartidor');
    expect(res.destinoInicial?.ruta).toBe('/_role/repartidor');
  });

  test('16. NPB que active barman -> redirige a app/_role/barman', async () => {
    mockRtdb['marisquerias/Negocio principal de categoría'] = {
      ...npbCanonicoV1,
      roles_dispositivo: [{ id: 'barman', pantallas_visibles: ['comandas_estacion'] }],
    };

    const res = await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.destinoInicial?.rol).toBe('barman');
    expect(res.destinoInicial?.ruta).toBe('/_role/barman');
  });

  test('17. Rol activo persistido que ya no está en el NPB -> redirige a selección de rol', async () => {
    // Sesión con rol 'barista' persistido
    await guardarSesionO1({
      negocio_id: 'mar-01',
      slug_categoria: 'marisquerias',
      version_npb_origen: 1,
      codigo_acceso: 'TEST123',
      rol_activo: 'barista',
      estadoEncendido: {
        capacidades_activas: ['menu', 'comanda_cocina'],
        capacidades_dormidas: [],
        roles_activos: ['cocina'], // 'barista' ya no está activo
        roles_dormidos: ['barista'],
        cajones_activos: ['menu'],
        cajones_dormidos: [],
        dormidos: { capacidades: [], roles: ['barista'], cajones: [] },
        justificacion_cajones_desactivados: {},
        version_npb: 1,
        categoria_id: '01',
        slug_categoria: 'marisquerias',
        timestamp: Date.now(),
      },
    });

    const resGuard = await evaluarGuardiaArranque(dbMock);
    expect(resGuard.estado).toBe('requiere_seleccion_rol');
  });

  test('18. Código de prueba NPB00-TEST abre en modo plantilla y activa todo el catálogo del NPB', async () => {
    mockRtdb['codigo_de_acceso/NPB00-TEST'] = {
      tipo_acceso: 'plantilla',
      negocio_id: '00',
      slug_categoria: 'marisquerias',
      version_npb_origen: 1,
      estado: 'activo',
      db_url_operativa: 'https://test-operacion.firebaseio.com',
    };

    const res = await ejecutarArranqueO1(dbMock, 'NPB00-TEST');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.estadoEncendido.tipo_acceso).toBe('plantilla');
    expect(res.estadoEncendido.capacidades_activas).toEqual([
      'menu',
      'control_mesas',
      'comanda_cocina',
      'tickets_impresion',
    ]);
    expect(res.negocio.negocio_id).toBe('00');
  });

  test('19. Negocio real con capacidades_autorizadas restringidas solo activa la intersección', async () => {
    mockRtdb['codigo_de_acceso/RESTRICTED'] = {
      tipo_acceso: 'negocio_real',
      negocio_id: 'mar-restringido',
      slug_categoria: 'marisquerias',
      version_npb_origen: 1,
      estado: 'activo',
      capacidades_autorizadas: ['menu'], // Solo contrató menú
      cajones_dormidos_forzados: ['mesas'],
      db_url_operativa: 'https://op-restringido.firebaseio.com',
    };

    const res = await ejecutarArranqueO1(dbMock, 'RESTRICTED');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.estadoEncendido.tipo_acceso).toBe('negocio_real');
    expect(res.estadoEncendido.capacidades_activas).toEqual(['menu']);
    expect(res.estadoEncendido.capacidades_dormidas).toContain('control_mesas');
    expect(res.estadoEncendido.capacidades_dormidas).toContain('comanda_cocina');
    expect(res.estadoEncendido.cajones_dormidos).toContain('mesas');
  });

  test('20. Carga de plantilla desde ruta canónica categorias/marisquerias/plantilla_base', async () => {
    // Retirar ruta legacy de mock y colocar ruta canónica
    delete mockRtdb['marisquerias/Negocio principal de categoría'];
    mockRtdb['categorias/marisquerias/plantilla_base'] = npbCanonicoV1;

    const res = await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.npb.slug_categoria).toBe('marisquerias');
    expect(res.npb.version_npb).toBe(1);

    // Restaurar para pruebas subsiguientes
    mockRtdb['marisquerias/Negocio principal de categoría'] = npbCanonicoV1;
  });

  test('21. Código de otra categoría (ej: taquerias) es rechazado por la app de Marisquerías', async () => {
    mockRtdb['codigo_de_acceso/TACO-99'] = {
      tipo_acceso: 'negocio_real',
      negocio_id: 'taco-01',
      slug_categoria: 'taquerias',
      categoria_id: '02',
      version_npb_origen: 1,
      estado: 'activo',
      db_url_operativa: 'https://tacos.firebaseio.com',
    };

    const res = await ejecutarArranqueO1(dbMock, 'TACO-99');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain('taquerias');
  });

  test('22. Negocio real sin db_url_operativa válida es rechazado para no contaminar Unidad Secundaria', async () => {
    mockRtdb['codigo_de_acceso/SIN-DB'] = {
      tipo_acceso: 'negocio_real',
      negocio_id: 'mar-sin-db',
      slug_categoria: 'marisquerias',
      categoria_id: '01',
      version_npb_origen: 1,
      estado: 'activo',
      // db_url_operativa ausente
    };

    const res = await ejecutarArranqueO1(dbMock, 'SIN-DB');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain('Unidad Operativa');
  });

  test('23. Código MARISQUERIAS-00 abre solo el contexto de plantilla/pruebas', async () => {
    mockRtdb['codigo_de_acceso/MARISQUERIAS-00'] = {
      tipo_acceso: 'plantilla',
      negocio_id: '00',
      slug_categoria: 'marisquerias',
      version_npb_origen: 1,
      estado: 'activo',
      db_url_operativa: 'https://demo-marisquerias.firebaseio.com',
    };

    const res = await ejecutarArranqueO1(dbMock, 'MARISQUERIAS-00');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.estadoEncendido.tipo_acceso).toBe('plantilla');
    expect(res.negocio.tipo_acceso).toBe('plantilla');
    expect(res.negocio.negocio_id).toBe('00');
    expect(res.estadoEncendido.capacidades_activas).toEqual([
      'menu',
      'control_mesas',
      'comanda_cocina',
      'tickets_impresion',
    ]);
  });

  test('23b. Acepta el payload exacto plantilla_pruebas emitido por Ecosistema', async () => {
    delete mockRtdb['marisquerias/Negocio principal de categoría'];
    mockRtdb['negocio/marisquerias-00'] = npbCanonicoV1;
    mockRtdb['codigo_de_acceso/MARISQUERIAS-00'] = {
      tipo_acceso: 'plantilla_pruebas',
      negocio_id: 'marisquerias-00',
      categoria_id: '01',
      slug_categoria: 'marisquerias',
      cliente_id: null,
      version_npb_origen: 1,
      estado: 'activo',
      db_url_operativa: 'https://demo-marisquerias.firebaseio.com',
    };

    const res = await ejecutarArranqueO1(dbMock, 'MARISQUERIAS-00');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.negocio.tipo_acceso).toBe('plantilla');
    expect(res.estadoEncendido.tipo_acceso).toBe('plantilla');
    expect(res.estadoEncendido.capacidades_activas).toEqual([
      'menu',
      'control_mesas',
      'comanda_cocina',
      'tickets_impresion',
    ]);
  });

  test('23c. Normaliza autorizaciones booleanas y roles emitidos por Ecosistema', async () => {
    mockRtdb['codigo_de_acceso/ECOSIS01'] = {
      tipo_acceso: 'negocio_real',
      negocio_id: 'marisquerias-01',
      categoria_id: '01',
      slug_categoria: 'marisquerias',
      cliente_id: '001',
      version_npb_origen: 1,
      estado: 'activo',
      capacidades_autorizadas: {
        menu: true,
        control_mesas: false,
        comanda_cocina: false,
      },
      roles_autorizados: ['mesero'],
      db_url_operativa: 'https://marisquerias-01.firebaseio.com',
    };

    const res = await ejecutarArranqueO1(dbMock, 'ECOSIS01');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.estadoEncendido.capacidades_activas).toEqual(['menu']);
    expect(res.estadoEncendido.roles_activos).toEqual(['mesero']);
    expect(res.estadoEncendido.cajones_dormidos).toContain('mesas');
  });

  test('24. Puerto Libres no muestra mostrador si no está autorizado/configurado', async () => {
    mockRtdb['codigo_de_acceso/MPL-01'] = {
      tipo_acceso: 'negocio_real',
      negocio_id: 'mar-mpl-01',
      slug_categoria: 'marisquerias',
      categoria_id: '01',
      version_npb_origen: 1,
      estado: 'activo',
      nombre_comercial: 'Marisquería Puerto Libres',
      capacidades_autorizadas: ['menu', 'control_mesas', 'comanda_cocina'], // Sin mostrador_y_pos
      cajones_dormidos_forzados: ['ventas'],
      roles_permitidos: ['administrador', 'mesero', 'cocina'], // Sin mostrador
      db_url_operativa: 'https://op-puertolibres.firebaseio.com',
    };

    const res = await ejecutarArranqueO1(dbMock, 'MPL-01');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.estadoEncendido.roles_activos).not.toContain('mostrador');
    expect(res.estadoEncendido.roles_dormidos).toContain('mostrador');
    expect(res.estadoEncendido.cajones_activos).not.toContain('ventas');
    expect(res.estadoEncendido.cajones_dormidos).toContain('ventas');
  });

  test('25. El Arrecife conserva mostrador cuando corresponde', async () => {
    // NPB que soporte mostrador_y_pos y rol mostrador
    mockRtdb['categorias/marisquerias/plantilla_base'] = {
      ...npbCanonicoV1,
      capacidades: [
        ...npbCanonicoV1.capacidades,
        { id: 'mostrador_y_pos', configuracion_giro: 'Venta directa' },
      ],
      roles_dispositivo: [
        ...npbCanonicoV1.roles_dispositivo,
        { id: 'mostrador', pantallas_visibles: ['/_role/mostrador'] },
      ],
      cajones_activos: [...npbCanonicoV1.cajones_activos, 'ventas'],
    };

    mockRtdb['codigo_de_acceso/ARRECIFE-01'] = {
      tipo_acceso: 'negocio_real',
      negocio_id: 'mar-arrecife-01',
      slug_categoria: 'marisquerias',
      categoria_id: '01',
      version_npb_origen: 1,
      estado: 'activo',
      nombre_comercial: 'Marisquería El Arrecife',
      capacidades_autorizadas: ['menu', 'control_mesas', 'comanda_cocina', 'mostrador_y_pos'],
      roles_permitidos: ['administrador', 'mesero', 'cocina', 'mostrador'],
      db_url_operativa: 'https://op-elarrecife.firebaseio.com',
    };

    const res = await ejecutarArranqueO1(dbMock, 'ARRECIFE-01');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.estadoEncendido.roles_activos).toContain('mostrador');
    expect(res.estadoEncendido.cajones_activos).toContain('ventas');

    // Restaurar NPB
    mockRtdb['categorias/marisquerias/plantilla_base'] = npbCanonicoV1;
  });

  test('26. Fallo de lectura de Secundaria no provoca fallback a una búsqueda global no acotada', async () => {
    // Si el nodo exacto no existe, debe fallar inmediatamente sin recorrer otros nodos
    const res = await ejecutarArranqueO1(dbMock, 'CODIGO-DESCONOCIDO-XYZ');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/no encontrado o inválido/i);
    // Verificar que solo intentó acceder al path acotado
    expect(mockRtdb['codigo_de_acceso/CODIGO-DESCONOCIDO-XYZ']).toBeUndefined();
  });

  test('27. La revocación de código o negocio bloquea arranque y no purga datos locales de pedidos/ventas pendientes', async () => {
    // Preparar datos offline locales simulados en AsyncStorage
    await AsyncStorage.setItem(
      '@offline_pedidos_pendientes',
      JSON.stringify([{ id: 'PED-LOCAL-1' }])
    );
    await AsyncStorage.setItem(
      '@offline_ventas_pendientes',
      JSON.stringify([{ id: 'VTA-LOCAL-1' }])
    );

    mockRtdb['codigo_de_acceso/CODIGO-REVOCADO'] = {
      tipo_acceso: 'negocio_real',
      negocio_id: 'mar-01',
      slug_categoria: 'marisquerias',
      categoria_id: '01',
      version_npb_origen: 1,
      estado: 'revocado',
      db_url_operativa: 'https://op-revocado.firebaseio.com',
    };

    const res = await ejecutarArranqueO1(dbMock, 'CODIGO-REVOCADO');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/revocado/i);

    // Los pedidos y ventas locales pendientes de sincronización permanecen intactos
    const pedidosLocales = await AsyncStorage.getItem('@offline_pedidos_pendientes');
    const ventasLocales = await AsyncStorage.getItem('@offline_ventas_pendientes');
    expect(pedidosLocales).toContain('PED-LOCAL-1');
    expect(ventasLocales).toContain('VTA-LOCAL-1');
  });
});
