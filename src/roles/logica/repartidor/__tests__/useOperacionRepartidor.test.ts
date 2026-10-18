import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Linking } from 'react-native';
import { useOperacionRepartidor } from '../useOperacionRepartidor';

(global as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../../../sistema/firebase', () => ({
  getRtdb: jest.fn(() => ({})),
}));

jest.mock('../../../../sistema/store', () => ({
  useStore: jest.fn((selector: any) =>
    typeof selector === 'function'
      ? selector({
          sesion: {
            rutaNegocio: 'negocios/marisqueria-01',
            usuario: { nombre: 'Beto Rider' },
          },
          dataSources: {},
        })
      : {
          sesion: {
            rutaNegocio: 'negocios/marisqueria-01',
            usuario: { nombre: 'Beto Rider' },
          },
          dataSources: {},
        }
  ),
}));

function renderCustomHook<T>(hook: () => T) {
  const result = { current: null as unknown as T };
  function TestComponent() {
    result.current = hook();
    return null;
  }
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(React.createElement(TestComponent));
  });
  return { result, renderer };
}

describe('useOperacionRepartidor — Operación Móvil de Reparto', () => {
  let mockRepartoRepo: any;
  let mockAjustesRepo: any;
  let listenerMisiones: ((data: any) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    listenerMisiones = null;

    mockRepartoRepo = {
      suscribirMisiones: jest.fn((cb) => {
        listenerMisiones = cb;
        return () => {};
      }),
      asignarRepartidor: jest.fn().mockResolvedValue(undefined),
      actualizarEstado: jest.fn().mockResolvedValue(undefined),
    };

    mockAjustesRepo = {
      suscribirUmbrales: jest.fn(() => () => {}),
      actualizarUmbrales: jest.fn().mockResolvedValue(undefined),
    };
  });

  test('1. Asignación de pedido a uno mismo funciona', async () => {
    const { result } = renderCustomHook(() =>
      useOperacionRepartidor({
        repartoRepo: mockRepartoRepo,
        ajustesRepo: mockAjustesRepo,
      })
    );

    // Simular llegada de una misión pendiente
    act(() => {
      if (listenerMisiones) {
        listenerMisiones({
          'mision-101': {
            id: 'mision-101',
            tipo: 'delivery',
            estado: 'pendiente',
            cliente: { nombre: 'Juan Pérez' },
            items: {},
            totales: { total: 250 },
          },
        });
      }
    });

    expect(result.current.pedidosDisponibles.length).toBe(1);
    expect(result.current.pedidosAsignados.length).toBe(0);

    // Asignar pedido
    await act(async () => {
      await result.current.asignarPedido('mision-101');
    });

    expect(mockRepartoRepo.asignarRepartidor).toHaveBeenCalledTimes(1);
    expect(mockRepartoRepo.asignarRepartidor).toHaveBeenCalledWith(
      'mision-101',
      expect.objectContaining({
        nombre: 'Beto Rider',
      })
    );
  });

  test('2. Cambios de estado persisten en el repositorio', async () => {
    const { result } = renderCustomHook(() =>
      useOperacionRepartidor({
        repartoRepo: mockRepartoRepo,
        ajustesRepo: mockAjustesRepo,
      })
    );

    // Cambiar estado a 'en_camino'
    await act(async () => {
      await result.current.cambiarEstado('mision-101', 'en_camino');
    });

    expect(mockRepartoRepo.actualizarEstado).toHaveBeenCalledWith('mision-101', 'en_camino');

    // Cambiar estado a 'entregado' (mapea a 'completada')
    await act(async () => {
      await result.current.cambiarEstado('mision-101', 'entregado');
    });

    expect(mockRepartoRepo.actualizarEstado).toHaveBeenCalledWith('mision-101', 'completada');

    // Cambiar estado a 'no_entregado' (mapea a 'fallida')
    await act(async () => {
      await result.current.cambiarEstado('mision-101', 'no_entregado');
    });

    expect(mockRepartoRepo.actualizarEstado).toHaveBeenCalledWith('mision-101', 'fallida');
  });

  test('3. Modo offline encola y sincroniza al reconectar', async () => {
    const { result } = renderCustomHook(() =>
      useOperacionRepartidor({
        repartoRepo: mockRepartoRepo,
        ajustesRepo: mockAjustesRepo,
        forzarOffline: true,
      })
    );

    expect(result.current.esOffline).toBe(true);

    // En modo offline, asignar pedido y cambiar estado
    await act(async () => {
      await result.current.asignarPedido('mision-offline-1');
      await result.current.cambiarEstado('mision-offline-1', 'en_camino');
    });

    // No se llamó al repositorio inmediatamente
    expect(mockRepartoRepo.asignarRepartidor).not.toHaveBeenCalled();
    expect(mockRepartoRepo.actualizarEstado).not.toHaveBeenCalled();

    // Se encolaron 2 acciones
    expect(result.current.colaOffline.length).toBe(2);

    // Sincronizar cola
    await act(async () => {
      await result.current.sincronizarOffline();
    });

    // Ahora sí se llamaron los repositorios
    expect(mockRepartoRepo.asignarRepartidor).toHaveBeenCalledTimes(1);
    expect(mockRepartoRepo.actualizarEstado).toHaveBeenCalledWith('mision-offline-1', 'en_camino');
    expect(result.current.colaOffline.length).toBe(0);
  });

  test('4. Segmentación precisa en pedidosDisponibles, pedidosAsignados e historial', () => {
    const { result } = renderCustomHook(() =>
      useOperacionRepartidor({
        repartoRepo: mockRepartoRepo,
        ajustesRepo: mockAjustesRepo,
      })
    );

    act(() => {
      if (listenerMisiones) {
        listenerMisiones({
          'm-1': {
            id: 'm-1',
            tipo: 'delivery',
            estado: 'pendiente',
            cliente: { nombre: 'Cliente Uno' },
          },
          'm-2': {
            id: 'm-2',
            tipo: 'delivery',
            estado: 'asignada',
            repartidor: { id: 'rep_beto_rider', nombre: 'Beto Rider' },
            cliente: { nombre: 'Cliente Dos' },
          },
          'm-3': {
            id: 'm-3',
            tipo: 'delivery',
            estado: 'completada',
            repartidor: { id: 'rep_beto_rider', nombre: 'Beto Rider' },
            cliente: { nombre: 'Cliente Tres' },
          },
        });
      }
    });

    expect(result.current.pedidosDisponibles.length).toBe(1);
    expect(result.current.pedidosDisponibles[0].id).toBe('m-1');

    expect(result.current.pedidosAsignados.length).toBe(1);
    expect(result.current.pedidosAsignados[0].id).toBe('m-2');

    expect(result.current.historial.length).toBe(1);
    expect(result.current.historial[0].id).toBe('m-3');
  });

  test('5. abrirEnGoogleMaps construye y abre URL correctamente', () => {
    const spyOpenURL = jest
      .spyOn(Linking, 'openURL')
      .mockImplementation(() => Promise.resolve(true));

    const { result } = renderCustomHook(() =>
      useOperacionRepartidor({
        repartoRepo: mockRepartoRepo,
        ajustesRepo: mockAjustesRepo,
      })
    );

    act(() => {
      result.current.abrirEnGoogleMaps({
        direccion: 'Av. Costera 123, Acapulco',
      } as any);
    });

    expect(spyOpenURL).toHaveBeenCalledWith(
      expect.stringContaining(
        'https://www.google.com/maps/search/?api=1&query=Av.%20Costera%20123%2C%20Acapulco'
      )
    );

    spyOpenURL.mockRestore();
  });

  test('6. registrarAjuste actualiza umbrales online y offline', async () => {
    const { result } = renderCustomHook(() =>
      useOperacionRepartidor({
        repartoRepo: mockRepartoRepo,
        ajustesRepo: mockAjustesRepo,
      })
    );

    await act(async () => {
      await result.current.registrarAjuste({ tiempoMaxEntregaMin: 30 });
    });

    expect(mockAjustesRepo.actualizarUmbrales).toHaveBeenCalledWith({ tiempoMaxEntregaMin: 30 });
  });

  test('7. Notificación push opcional se invoca si __notificarClienteEntrega está presente', async () => {
    const mockNotif = jest.fn();
    (global as any).__notificarClienteEntrega = mockNotif;

    const { result } = renderCustomHook(() =>
      useOperacionRepartidor({
        repartoRepo: mockRepartoRepo,
        ajustesRepo: mockAjustesRepo,
      })
    );

    await act(async () => {
      await result.current.cambiarEstado('m-test-push', 'entregado');
    });

    expect(mockNotif).toHaveBeenCalledWith('m-test-push', 'completada');

    delete (global as any).__notificarClienteEntrega;
  });
});
