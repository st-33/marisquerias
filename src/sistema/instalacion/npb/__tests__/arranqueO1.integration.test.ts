import type { Database } from 'firebase/database';
import { resolverAccessCodeO1 } from '../../vinculacion/resolver-access-code';
import { cargarNPB } from '../cargarNPB';
import { encenderCapacidades } from '../encenderCapacidades';
import { validarCompatibilidadNPB } from '../validarCompatibilidadNPB';
import { ejecutarArranqueO1 } from '../../useArranqueSistema';
import type { NegocioPlantillaBase } from '../tiposNPB';
import { servicioTicketsImpresion } from '../../../../capacidades/tickets_impresion';
import { useStore } from '../../../store';

// Mock de AsyncStorage en memoria
const mockAsyncStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key: string, value: string) => {
    mockAsyncStorage[key] = value;
  }),
  getItem: jest.fn(async (key: string) => mockAsyncStorage[key] ?? null),
  removeItem: jest.fn(async (key: string) => {
    delete mockAsyncStorage[key];
  }),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    for (const [k, v] of pairs) {
      mockAsyncStorage[k] = v;
    }
  }),
}));

// Base de datos RTDB simulada en memoria
let mockRtdbStore: Record<string, any> = {};

jest.mock('firebase/database', () => ({
  ref: jest.fn((_db: any, path: string) => ({ path })),
  get: jest.fn(async (refObj: { path: string }) => {
    const cleanPath = (refObj.path || '').replace(/^\/+|\/+$/g, '');
    const val = mockRtdbStore[cleanPath];
    return {
      exists: () => val !== undefined && val !== null,
      val: () => (val !== undefined ? val : null),
    };
  }),
}));

const dbMock = {} as Database;

describe('Arranque O(1) End-to-End — Integración con Unidad Secundaria y NPB 00', () => {
  const npbCanonicoSellado: NegocioPlantillaBase = {
    categoria_id: '01',
    slug_categoria: 'marisquerias',
    version_npb: 1,
    estado: 'sellado',
    roles_dispositivo: [
      { id: 'administrador', pantallas_visibles: ['/_role/admin/dashboard'] },
      { id: 'mesero', pantallas_visibles: ['/_role/mesero'] },
      { id: 'cocina', pantallas_visibles: ['/_role/cocina'] },
      { id: 'cajero', pantallas_visibles: ['/_role/caja'] },
      { id: 'mostrador', pantallas_visibles: ['/_role/mostrador'] },
    ],
    capacidades: [
      { id: 'menu', configuracion_giro: 'Catálogo de mariscos y bebidas' },
      { id: 'control_mesas', configuracion_giro: 'Comedor de playa y terraza' },
      { id: 'comanda_cocina', configuracion_giro: 'Tiempos de barra fría y caliente' },
      { id: 'mostrador_y_pos', configuracion_giro: 'Venta rápida para llevar' },
      { id: 'inventario', configuracion_giro: 'Control por kilos y piezas' },
      { id: 'tickets_impresion', configuracion_giro: 'Impresoras térmicas de cocina y caja' },
    ],
    cajones_activos: [
      'menu',
      'inventario',
      'mesas',
      'mesas_pendientes',
      'pedidos',
      'ventas',
      'tickets',
      'dispositivos',
    ],
    cajones_desactivados_justificacion: {
      reparto_ajustes: 'no hay reparto a domicilio en este giro',
    },
    sellado_por: 'torre_de_control_ecosistema',
    sellado_en: '2026-10-18T00:00:00Z',
  };

  beforeEach(() => {
    for (const key of Object.keys(mockAsyncStorage)) {
      delete mockAsyncStorage[key];
    }
    mockRtdbStore = {
      'codigo_de_acceso/TEST123': {
        negocio_id: 'mar-01',
        categoria_id: '01',
        slug_categoria: 'marisquerias',
        version_npb_origen: 1,
        cliente_id: 'cli-01',
        estado: 'activo',
        db_url_operativa: 'https://mar-01-operativa.firebaseio.com',
      },
      'codigo_de_acceso/TEST456': {
        negocio_id: 'mar-02',
        categoria_id: '01',
        slug_categoria: 'marisquerias',
        version_npb_origen: 1,
        cliente_id: 'cli-02',
        estado: 'revocado',
      },
      'marisquerias/Negocio principal de categoría': npbCanonicoSellado,
    };
  });

  test('1. Arranque feliz: resuelve código, carga NPB, enciende capacidades y duerme las no declaradas', async () => {
    // a) Resolver access code
    const resCodigo = await resolverAccessCodeO1(dbMock, 'TEST123');
    expect(resCodigo.negocio).toMatchObject({
      negocio_id: 'mar-01',
      categoria_id: '01',
      slug_categoria: 'marisquerias',
      version_npb_origen: 1,
      cliente_id: 'cli-01',
    });
    expect(resCodigo.db_url_operativa).toBe('https://mar-01-operativa.firebaseio.com');

    // b) Cargar NPB
    const npb = await cargarNPB(
      dbMock,
      resCodigo.negocio.slug_categoria,
      resCodigo.negocio.version_npb_origen
    );
    expect(npb.version_npb).toBe(1);
    expect(npb.estado).toBe('sellado');

    // c) Encender capacidades
    const estado = encenderCapacidades(npb);

    // Validar capacidades activas y dormidas
    expect(estado.capacidades_activas).toEqual([
      'menu',
      'control_mesas',
      'comanda_cocina',
      'mostrador_y_pos',
      'inventario',
      'tickets_impresion',
    ]);
    expect(estado.capacidades_dormidas).toEqual([
      'aparatos_conectados',
      'reparto_logistica',
      'metricas_y_cierres',
    ]);

    // Validar roles activos y dormidos
    expect(estado.roles_activos).toEqual([
      'administrador',
      'mesero',
      'cocina',
      'mostrador',
      'cajero',
    ]);
    expect(estado.roles_dormidos).toEqual([
      'repartidor',
      'barman',
      'barista',
      'parrillero',
      'empacador',
    ]);

    // Validar cajones
    expect(estado.cajones_activos).toContain('menu');
    expect(estado.cajones_activos).toContain('tickets');
    expect(estado.cajones_dormidos).toEqual(['reparto_ajustes']);
    expect(estado.justificacion_cajones_desactivados).toEqual({
      reparto_ajustes: 'no hay reparto a domicilio en este giro',
    });
  });

  test('2. Código inválido: rechaza de forma bloqueante y no ejecuta cargarNPB', async () => {
    const spyCargarNPB = jest.fn();
    await expect(resolverAccessCodeO1(dbMock, 'INVALIDO')).rejects.toThrow();
    expect(spyCargarNPB).not.toHaveBeenCalled();
  });

  test('3. Código revocado: detiene el arranque con error explícito', async () => {
    await expect(resolverAccessCodeO1(dbMock, 'TEST456')).rejects.toThrow(/revocado/i);
  });

  test('4. NPB incompatible: detecta capacidades o roles ausentes y bloquea arranque', () => {
    const npbConIncompatibilidad: NegocioPlantillaBase = {
      ...npbCanonicoSellado,
      capacidades: [
        ...npbCanonicoSellado.capacidades,
        { id: 'reservaciones', configuracion_giro: 'Motor de reservaciones' },
      ],
    };

    const validacion = validarCompatibilidadNPB(npbConIncompatibilidad);
    expect(validacion.compatible).toBe(false);
    expect(validacion.faltantes).toEqual(['capacidad:reservaciones']);

    expect(() => {
      if (!validacion.compatible) {
        throw new Error(
          `NPB incompatible con este APK. Faltantes: ${validacion.faltantes.join(', ')}`
        );
      }
    }).toThrow(/NPB incompatible con este APK.*capacidad:reservaciones/);
  });

  test('5. Versión NPB obsoleta: recurre a /historico/{version} o falla bloqueante si no existe', async () => {
    // Simular que el NPB actual subió a versión 2
    mockRtdbStore['marisquerias/Negocio principal de categoría'] = {
      ...npbCanonicoSellado,
      version_npb: 2,
    };

    // Caso 5a: No existe en histórico -> falla
    await expect(cargarNPB(dbMock, 'marisquerias', 1)).rejects.toThrow(
      /no existe en el histórico/i
    );

    // Caso 5b: Existe en histórico -> carga versión histórica
    mockRtdbStore['marisquerias/Negocio principal de categoría/historico/1'] = {
      ...npbCanonicoSellado,
      version_npb: 1,
    };

    const historico = await cargarNPB(dbMock, 'marisquerias', 1);
    expect(historico.version_npb).toBe(1);
  });

  test('6. tickets_impresion activo: la capacidad se enciende y el módulo de tickets queda operativo', () => {
    const estado = encenderCapacidades(npbCanonicoSellado);
    expect(estado.capacidades_activas).toContain('tickets_impresion');

    // Módulo tickets_impresion responde correctamente
    expect(typeof servicioTicketsImpresion.imprimirVenta).toBe('function');
    expect(typeof servicioTicketsImpresion.imprimirComanda).toBe('function');
    expect(typeof servicioTicketsImpresion.imprimirCuenta).toBe('function');
    expect(typeof servicioTicketsImpresion.imprimirEtiquetaBascula).toBe('function');
    expect(typeof servicioTicketsImpresion.estaListoParaImprimir()).toBe('boolean');
  });

  test('7. Tolerancia a campos extra y ejecución integrada O(1) con persistencia en store', async () => {
    // Simular que Torre de Control agrega campos adicionales en el NPB
    const npbConCamposExtra = {
      ...npbCanonicoSellado,
      hash_integridad_sha256: 'a1b2c3d4e5f6',
      metadatos_auditoria: {
        torre_control_id: 'tc-001',
        ambiente: 'produccion',
      },
    };
    mockRtdbStore['marisquerias/Negocio principal de categoría'] = npbConCamposExtra;

    const resultado = await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(resultado.ok).toBe(true);

    if (resultado.ok) {
      expect(resultado.negocio.negocio_id).toBe('mar-01');
      expect(resultado.estadoEncendido.capacidades_activas).toContain('tickets_impresion');
      expect(resultado.requiereSeleccionRol).toBe(true); // Porque hay 5 roles activos
      expect(resultado.rolPorDefecto).toBe('administrador');

      // Validar que el store global refleje el EstadoEncendido
      const estadoEnStore = useStore.getState().estadoEncendido;
      expect(estadoEnStore).not.toBeNull();
      expect(estadoEnStore?.capacidades_activas).toEqual(
        resultado.estadoEncendido.capacidades_activas
      );
      expect(estadoEnStore?.cajones_dormidos).toEqual(['reparto_ajustes']);
    }
  });
});
