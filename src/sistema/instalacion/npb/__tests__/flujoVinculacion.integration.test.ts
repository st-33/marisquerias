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
import { arrancarConDegradacionOffline } from '../../reconexion/monitorConexionO1';
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

describe('Flujo de Vinculación y Arranque O(1) End-to-End (Contrato Canónico sin Versionado NPB)', () => {
  beforeEach(() => {
    for (const key of Object.keys(storageMemoria)) {
      delete storageMemoria[key];
    }
    useStore.getState().setEstadoEncendido(null);
    mockRtdb = {
      'codigo_de_acceso/TEST123':
        'comedores_y_servicios_de_mesa/marisquerias/negocio/marisquerias-01',
      'comedores_y_servicios_de_mesa/marisquerias/negocio/marisquerias-01': {
        estado: 'activo',
        url_unidad: 'https://mar-01-operativa.firebaseio.com',
        capacidades_autorizadas: {
          menu: { id: 'menu', estado: 'activo' },
          control_mesas: { id: 'control_mesas', estado: 'activo' },
          comanda_cocina: { id: 'comanda_cocina', estado: 'activo' },
          tickets_impresion: { id: 'tickets_impresion', estado: 'activo' },
        },
        roles_autorizados: ['administrador', 'mesero', 'cocina'],
        unidad: {
          menu: {},
          mesas: {},
          pedidos: {},
          tickets: {},
        },
      },
      'codigo_de_acceso/REVOKED':
        'comedores_y_servicios_de_mesa/marisquerias/negocio/marisquerias-02',
      'comedores_y_servicios_de_mesa/marisquerias/negocio/marisquerias-02': {
        estado: 'revocado',
        url_unidad: 'https://mar-02-operativa.firebaseio.com',
        capacidades_autorizadas: ['menu'],
      },
    };
  });

  test('1. Flujo feliz de vinculación completa mediante ruta secundaria canónica', async () => {
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

    // AsyncStorage poblado
    expect(storageMemoria[CLAVES_SESION_O1.NEGOCIO_ID]).toBe('marisquerias-01');
    expect(storageMemoria[CLAVES_SESION_O1.SLUG_CATEGORIA]).toBe('marisquerias');
    expect(storageMemoria[CLAVES_SESION_O1.CODIGO_ACCESO_HASH]).toBeDefined();
    expect(storageMemoria[CLAVES_SESION_O1.CODIGO_ACCESO_HASH]).not.toBe('TEST123');
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

  test('5. Persistencia de sesión al reiniciar: lee AsyncStorage y recarga EstadoEncendido sin reconsultar NPB 00', async () => {
    await ejecutarArranqueO1(dbMock, 'TEST123');

    useStore.getState().setEstadoEncendido(null);
    expect(useStore.getState().estadoEncendido).toBeNull();

    const evaluacion = await evaluarGuardiaArranque(dbMock);
    expect(evaluacion.estado).toBe('recargado_ok');
    expect(evaluacion.rolActivo).toBe('administrador');
    expect(useStore.getState().estadoEncendido).not.toBeNull();
  });

  test('6. Sesión expirada: sesión > 30 días detectada y tratada como sin_sesion', async () => {
    const hace31Dias = Date.now() - (DURACION_MAXIMA_SESION_MS + 1000);
    await guardarSesionO1({
      negocio_id: 'marisquerias-01',
      slug_categoria: 'marisquerias',
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

  test('7. Jerarquía de rol por defecto en redirección', () => {
    const d1 = resolverRolPorDefecto(['cocina', 'administrador', 'mesero']);
    expect(d1.rol).toBe('administrador');
    expect(d1.ruta).toBe('/_role/admin/dashboard');

    const d2 = resolverRolPorDefecto(['mostrador', 'mesero']);
    expect(d2.rol).toBe('mostrador');
    expect(d2.ruta).toBe('/_role/venta-crudo');

    const d3 = resolverRolPorDefecto(['mesero']);
    expect(d3.rol).toBe('mesero');
    expect(d3.ruta).toBe('/_role/mesero');

    expect(() => resolverRolPorDefecto([])).toThrow(
      'El NPB no activó ningún rol. Contacta soporte.'
    );
  });

  test('8. Pantalla de selección de rol: requiere selección cuando el negocio habilita múltiples perfiles operativos', async () => {
    mockRtdb['comedores_y_servicios_de_mesa/marisquerias/negocio/marisquerias-01'] = {
      estado: 'activo',
      url_unidad: 'https://mar-01-operativa.firebaseio.com',
      capacidades_autorizadas: ['menu', 'control_mesas', 'mostrador_y_pos'],
      roles_autorizados: ['mostrador', 'mesero'],
      unidad: { menu: {}, mesas: {}, pedidos: {}, ventas: {} },
    };

    const res = await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.requiereSeleccionRol).toBe(true);
    expect(res.estadoEncendido.roles_activos).toEqual(['mesero', 'mostrador']);
  });

  test('9. Desvinculación: purga almacenamiento y store solo bajo confirmación exacta', async () => {
    await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(storageMemoria[CLAVES_SESION_O1.NEGOCIO_ID]).toBe('marisquerias-01');

    const fallido = await desvincularNegocioO1('CANCELAR');
    expect(fallido).toBe(false);
    expect(storageMemoria[CLAVES_SESION_O1.NEGOCIO_ID]).toBe('marisquerias-01');

    const exitoso = await desvincularNegocioO1('DESVINCULAR');
    expect(exitoso).toBe(true);
    expect(storageMemoria[CLAVES_SESION_O1.NEGOCIO_ID]).toBeUndefined();
    expect(useStore.getState().estadoEncendido).toBeNull();
    expect(useStore.getState().sesion.negocioId).toBeNull();
  });

  test('10. Guard de arranque: verifica sin sesión y rol no perteneciente a roles_activos', async () => {
    const g1 = await evaluarGuardiaArranque(dbMock);
    expect(g1.estado).toBe('sin_sesion');

    await guardarSesionO1({
      negocio_id: 'marisquerias-01',
      slug_categoria: 'marisquerias',
      codigo_acceso: 'TEST123',
      rol_activo: 'repartidor',
      estadoEncendido: {
        capacidades_activas: ['menu'],
        capacidades_dormidas: [],
        roles_activos: ['administrador', 'mesero'],
        roles_dormidos: ['repartidor'],
        cajones_activos: ['menu'],
        cajones_dormidos: [],
        dormidos: { capacidades: [], roles: ['repartidor'], cajones: [] },
        justificacion_cajones_desactivados: {},
        categoria_id: '01',
        slug_categoria: 'marisquerias',
        timestamp: Date.now(),
      },
    });

    const g2 = await evaluarGuardiaArranque(dbMock);
    expect(g2.estado).toBe('requiere_seleccion_rol');
  });

  test('11. Negocio que active cajero -> tras arranque redirige a /_role/caja', async () => {
    mockRtdb['comedores_y_servicios_de_mesa/marisquerias/negocio/marisquerias-01'] = {
      estado: 'activo',
      url_unidad: 'https://mar-01-operativa.firebaseio.com',
      capacidades_autorizadas: ['mostrador_y_pos'],
      roles_autorizados: ['cajero'],
      unidad: { ventas: {}, pedidos: {} },
    };

    const res = await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.destinoInicial?.rol).toBe('cajero');
    expect(res.destinoInicial?.ruta).toBe('/_role/caja');
  });

  test('12. Negocio que active repartidor -> redirige a /_role/repartidor', async () => {
    mockRtdb['comedores_y_servicios_de_mesa/marisquerias/negocio/marisquerias-01'] = {
      estado: 'activo',
      url_unidad: 'https://mar-01-operativa.firebaseio.com',
      capacidades_autorizadas: ['reparto_logistica'],
      roles_autorizados: ['repartidor'],
      unidad: { reparto_ajustes: {}, pedidos: {} },
    };

    const res = await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.destinoInicial?.rol).toBe('repartidor');
    expect(res.destinoInicial?.ruta).toBe('/_role/repartidor');
  });

  test('13. Negocio que active barman -> redirige a /_role/barman', async () => {
    mockRtdb['comedores_y_servicios_de_mesa/marisquerias/negocio/marisquerias-01'] = {
      estado: 'activo',
      url_unidad: 'https://mar-01-operativa.firebaseio.com',
      capacidades_autorizadas: ['menu', 'comanda_cocina'],
      roles_autorizados: ['barman'],
      unidad: { menu: {}, pedidos: {} },
    };

    const res = await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.destinoInicial?.rol).toBe('barman');
    expect(res.destinoInicial?.ruta).toBe('/_role/barman');
  });

  test('14. Código de prueba de plantilla abre en modo plantilla y activa el catálogo completo', async () => {
    mockRtdb['codigo_de_acceso/NPB00-TEST'] =
      'comedores_y_servicios_de_mesa/marisquerias/negocio_plantilla_base';
    mockRtdb['comedores_y_servicios_de_mesa/marisquerias/negocio_plantilla_base'] = {
      estado: 'activo',
      url_unidad: 'https://test-operacion.firebaseio.com',
    };

    const res = await ejecutarArranqueO1(dbMock, 'NPB00-TEST');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.estadoEncendido.tipo_acceso).toBe('plantilla');
    expect(res.estadoEncendido.capacidades_activas.length).toBe(9);
    expect(res.negocio.negocio_id).toBe('00');
  });

  test('15. Negocio real con capacidades_autorizadas restringidas solo activa la intersección autorizada', async () => {
    mockRtdb['codigo_de_acceso/RESTRICTED'] =
      'comedores_y_servicios_de_mesa/marisquerias/negocio/mar-restringido';
    mockRtdb['comedores_y_servicios_de_mesa/marisquerias/negocio/mar-restringido'] = {
      estado: 'activo',
      url_unidad: 'https://op-restringido.firebaseio.com',
      capacidades_autorizadas: ['menu'],
      cajones_dormidos_forzados: ['mesas'],
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

  test('16. Código de otra categoría (ej: taquerias) es rechazado por la app de Marisquerías', async () => {
    mockRtdb['codigo_de_acceso/TACO-99'] =
      'comedores_y_servicios_de_mesa/taquerias/negocio/taco-01';
    mockRtdb['comedores_y_servicios_de_mesa/taquerias/negocio/taco-01'] = {
      estado: 'activo',
      url_unidad: 'https://tacos.firebaseio.com',
    };

    const res = await ejecutarArranqueO1(dbMock, 'TACO-99');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain('taquerias');
  });

  test('17. Negocio real sin url_unidad válida es rechazado para no contaminar Unidad Secundaria', async () => {
    mockRtdb['codigo_de_acceso/SIN-DB'] =
      'comedores_y_servicios_de_mesa/marisquerias/negocio/mar-sin-db';
    mockRtdb['comedores_y_servicios_de_mesa/marisquerias/negocio/mar-sin-db'] = {
      estado: 'activo',
      capacidades_autorizadas: ['menu'],
    };

    const res = await ejecutarArranqueO1(dbMock, 'SIN-DB');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain('Unidad Operativa');
  });

  test('18. Puerto Libres no muestra mostrador si mostrador_y_pos no está autorizado', async () => {
    mockRtdb['codigo_de_acceso/MPL-01'] =
      'comedores_y_servicios_de_mesa/marisquerias/negocio/mar-mpl-01';
    mockRtdb['comedores_y_servicios_de_mesa/marisquerias/negocio/mar-mpl-01'] = {
      estado: 'activo',
      nombre_comercial: 'Marisquería Puerto Libres',
      capacidades_autorizadas: ['menu', 'control_mesas', 'comanda_cocina'],
      cajones_dormidos_forzados: ['ventas'],
      roles_autorizados: ['administrador', 'mesero', 'cocina', 'mostrador'],
      url_unidad: 'https://op-puertolibres.firebaseio.com',
    };

    const res = await ejecutarArranqueO1(dbMock, 'MPL-01');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    // Aunque roles_autorizados incluya mostrador, mostrador_y_pos está deshabilitado -> rol subordinado dormido
    expect(res.estadoEncendido.roles_activos).not.toContain('mostrador');
    expect(res.estadoEncendido.roles_dormidos).toContain('mostrador');
    expect(res.estadoEncendido.cajones_activos).not.toContain('ventas');
    expect(res.estadoEncendido.cajones_dormidos).toContain('ventas');
  });

  test('19. El Arrecife conserva mostrador cuando mostrador_y_pos está autorizado', async () => {
    mockRtdb['codigo_de_acceso/ARRECIFE-01'] =
      'comedores_y_servicios_de_mesa/marisquerias/negocio/mar-arrecife-01';
    mockRtdb['comedores_y_servicios_de_mesa/marisquerias/negocio/mar-arrecife-01'] = {
      estado: 'activo',
      nombre_comercial: 'Marisquería El Arrecife',
      capacidades_autorizadas: ['menu', 'control_mesas', 'comanda_cocina', 'mostrador_y_pos'],
      roles_autorizados: ['administrador', 'mesero', 'cocina', 'mostrador'],
      url_unidad: 'https://op-elarrecife.firebaseio.com',
    };

    const res = await ejecutarArranqueO1(dbMock, 'ARRECIFE-01');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.estadoEncendido.roles_activos).toContain('mostrador');
    expect(res.estadoEncendido.cajones_activos).toContain('ventas');
  });

  test('20. La revocación de código o negocio bloquea arranque y no purga datos locales de pedidos/ventas pendientes', async () => {
    await AsyncStorage.setItem(
      '@offline_pedidos_pendientes',
      JSON.stringify([{ id: 'PED-LOCAL-1' }])
    );
    await AsyncStorage.setItem(
      '@offline_ventas_pendientes',
      JSON.stringify([{ id: 'VTA-LOCAL-1' }])
    );

    mockRtdb['codigo_de_acceso/CODIGO-REVOCADO'] =
      'comedores_y_servicios_de_mesa/marisquerias/negocio/mar-revocado';
    mockRtdb['comedores_y_servicios_de_mesa/marisquerias/negocio/mar-revocado'] = {
      estado: 'revocado',
      url_unidad: 'https://op-revocado.firebaseio.com',
    };

    const res = await ejecutarArranqueO1(dbMock, 'CODIGO-REVOCADO');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/revocado/i);

    const pedidosLocales = await AsyncStorage.getItem('@offline_pedidos_pendientes');
    const ventasLocales = await AsyncStorage.getItem('@offline_ventas_pendientes');
    expect(pedidosLocales).toContain('PED-LOCAL-1');
    expect(ventasLocales).toContain('VTA-LOCAL-1');
  });
});
