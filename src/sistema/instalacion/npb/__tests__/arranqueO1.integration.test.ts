import type { Database } from 'firebase/database';
import { resolverAccessCodeO1 } from '../../vinculacion/resolver-access-code';
import { encenderCapacidades } from '../encenderCapacidades';
import { ejecutarArranqueO1 } from '../../useArranqueSistema';
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

describe('Arranque O(1) End-to-End — Integración con Unidad Secundaria sin consultar NPB 00', () => {
  const rutaNegocio01 = 'comedores_y_servicios_de_mesa/marisquerias/negocio/mar-01';
  const rutaNegocio02 = 'comedores_y_servicios_de_mesa/marisquerias/negocio/mar-02';

  beforeEach(() => {
    for (const key of Object.keys(mockAsyncStorage)) {
      delete mockAsyncStorage[key];
    }
    useStore.getState().setEstadoEncendido(null);
    mockRtdbStore = {
      'codigo_de_acceso/TEST123': rutaNegocio01,
      'codigo_de_acceso/TEST456': rutaNegocio02,
      [rutaNegocio01]: {
        id: 'mar-01',
        estado: 'activo',
        url_unidad: 'https://mar-01-operativa.firebaseio.com',
        capacidades_autorizadas: {
          menu: true,
          control_mesas: true,
          comanda_cocina: true,
          mostrador_y_pos: true,
          inventario: true,
          tickets_impresion: true,
        },
        roles_autorizados: ['administrador', 'mesero', 'cocina', 'mostrador', 'cajero'],
      },
      [rutaNegocio02]: {
        id: 'mar-02',
        estado: 'revocado',
        url_unidad: 'https://mar-02-operativa.firebaseio.com',
      },
    };
  });

  test('1. Arranque feliz: resuelve código a ruta, consulta solo al negocio y enciende capacidades autorizadas', async () => {
    const resCodigo = await resolverAccessCodeO1(dbMock, 'TEST123');
    expect(resCodigo.negocio).toMatchObject({
      negocio_id: 'mar-01',
      categoria_id: 'marisquerias',
      slug_categoria: 'marisquerias',
      ruta_configuracion_secundaria: rutaNegocio01,
    });
    expect(resCodigo.db_url_operativa).toBe('https://mar-01-operativa.firebaseio.com');

    const estado = encenderCapacidades(resCodigo.negocio);

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

    expect(estado.cajones_activos).toContain('menu');
    expect(estado.cajones_activos).toContain('tickets');
    expect(estado.cajones_dormidos).toContain('reparto_ajustes');
  });

  test('2. Código inválido: rechaza de forma bloqueante', async () => {
    await expect(resolverAccessCodeO1(dbMock, 'INVALIDO')).rejects.toThrow();
  });

  test('3. Código revocado: detiene el arranque con error explícito', async () => {
    await expect(resolverAccessCodeO1(dbMock, 'TEST456')).rejects.toThrow(/revocado/i);
  });

  test('4. Capacidad no soportada por la aplicación: detecta faltantes y bloquea arranque', async () => {
    mockRtdbStore[rutaNegocio01] = {
      ...mockRtdbStore[rutaNegocio01],
      capacidades_autorizadas: ['menu', 'reservaciones'],
    };

    const resultado = await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.errorInfo?.tipo).toBe('npb_incompatible');
      expect(resultado.errorInfo?.faltantes).toEqual(['capacidad:reservaciones']);
    }
  });

  test('5. Subordinación automática de perfiles a capacidades activas cuando no se fijan roles_permitidos', () => {
    const estado = encenderCapacidades({
      negocio_id: 'mar-solo-mesas',
      capacidades_autorizadas: ['menu', 'control_mesas'],
    });

    // Solo administrador (requiere menu) y mesero (requiere control_mesas) pueden activarse
    expect(estado.roles_activos).toEqual(['administrador', 'mesero']);
    expect(estado.roles_dormidos).toContain('cocina');
    expect(estado.roles_dormidos).toContain('mostrador');
    expect(estado.roles_dormidos).toContain('repartidor');
  });

  test('6. tickets_impresion activo: la capacidad se enciende y el módulo de tickets queda operativo', () => {
    const estado = encenderCapacidades({
      negocio_id: 'mar-01',
      capacidades_autorizadas: ['menu', 'tickets_impresion'],
    });
    expect(estado.capacidades_activas).toContain('tickets_impresion');

    expect(typeof servicioTicketsImpresion.imprimirVenta).toBe('function');
    expect(typeof servicioTicketsImpresion.imprimirComanda).toBe('function');
    expect(typeof servicioTicketsImpresion.imprimirCuenta).toBe('function');
    expect(typeof servicioTicketsImpresion.imprimirEtiquetaBascula).toBe('function');
    expect(typeof servicioTicketsImpresion.estaListoParaImprimir()).toBe('boolean');
  });

  test('7. Ejecución integrada O(1) con persistencia en store sin consultar NPB 00', async () => {
    const resultado = await ejecutarArranqueO1(dbMock, 'TEST123');
    expect(resultado.ok).toBe(true);

    if (resultado.ok) {
      expect(resultado.negocio.negocio_id).toBe('mar-01');
      expect(resultado.estadoEncendido.capacidades_activas).toContain('tickets_impresion');
      expect(resultado.requiereSeleccionRol).toBe(true);
      expect(resultado.rolPorDefecto).toBe('administrador');

      const estadoEnStore = useStore.getState().estadoEncendido;
      expect(estadoEnStore).not.toBeNull();
      expect(estadoEnStore?.capacidades_activas).toEqual(
        resultado.estadoEncendido.capacidades_activas
      );
      expect(estadoEnStore?.cajones_dormidos).toContain('reparto_ajustes');
    }
  });
});
