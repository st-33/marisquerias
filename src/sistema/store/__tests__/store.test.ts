// Mock de Dependencias Nativas y de Almacenamiento
// Ahora importamos los elementos bajo prueba
import { useStore, cargarEstadoPersistido } from '../index';
import type { DispositivoConfig } from '../../../sistema/tipos/contratos';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getActiveRutaNegocio,
  registerNegocioCleanup,
  switchNegocioLifecycle,
} from '../../ciclo_de_vida/NegocioLifecycleController';

jest.mock(
  'react-native',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    return {
      Platform: {
        OS: 'ios',
        select: (objs: any) => objs.ios || objs.default,
      },
      NativeModules: {
        RNCNetInfo: {
          getCurrentState: jest.fn().mockResolvedValue({ isConnected: true }),
          addListener: jest.fn(),
          removeListeners: jest.fn(),
        },
      },
    };
  },
  { virtual: true }
);

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] || null),
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    clear: jest.fn(async () => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
  };
});

// Mock de firebase para evitar llamadas reales en el test
jest.mock('../../firebase', () => ({
  getRtdb: jest.fn(() => ({})),
}));

// Mock de monitoring
jest.mock('../../monitoreo', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
  initSentry: jest.fn(),
}));

// Mock de deviceBinding para logout
jest.mock('../../seguridad', () => ({
  deviceBinding: {
    unregisterDevice: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock de EnsambladorInstalacion para logout
jest.mock('../../instalacion', () => ({
  EnsambladorInstalacion: jest.fn().mockImplementation(() => ({
    desvincularLocalmente: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('Store Centralizado Unificado ADI - Pruebas de Carga y Persistencia', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Limpiar el estado del store de Zustand antes de cada test
    const store = useStore.getState();
    await store.clearSession();
  });

  it('debe inicializarse con un estado vacío de sesión y hardware', () => {
    const state = useStore.getState();
    expect(state.sesion.access_code).toBeNull();
    expect(state.sesion.rutaNegocio).toBeNull();
    expect(state.hardware.dispositivos).toEqual({});
    expect(state.hardware.preferidos).toEqual({});
  });

  it('debe registrar un dispositivo de hardware y persistirlo', async () => {
    const store = useStore.getState();
    await store.setSession({
      access_code: 'ACCESS-HW',
      rutaNegocio: '2 alimentos_y_bebidas/marisquerias/negocio-hw',
      negocioId: 'negocio-hw',
      niche: '2 alimentos_y_bebidas',
      category: 'marisquerias',
      rol: 'admin',
    });
    const dispositivo: DispositivoConfig = {
      id: 'HW-PRINTER-01',
      nombre: 'Impresora Térmica',
      tipo: 'impresora-termica',
      protocolo: 'bluetooth-classic',
      direccion: '00:11:22:33:44:55',
      estado: 'desconectado',
      configuracion: {},
    };

    await store.registrarDispositivo(dispositivo);

    expect(useStore.getState().hardware.dispositivos['HW-PRINTER-01']).toEqual(dispositivo);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@2 alimentos_y_bebidas/marisquerias/negocio-hw:hardware:dispositivos',
      expect.stringContaining('HW-PRINTER-01')
    );
  });

  it('guarda y expone claramente negocio_id canónico, ruta_negocio y categoria_id', async () => {
    const store = useStore.getState();
    await store.setSession({
      access_code: 'PUERTO-24',
      rutaNegocio: 'marisquerias/marisqueria-puerto-libres',
      negocioId: 'marisqueria-puerto-libres',
      niche: 'alimentos_y_bebidas',
      category: 'marisquerias',
      rol: 'admin',
    });

    const state = useStore.getState();
    expect(state.sesion.negocio_id).toBe('puerto_libres');
    expect(state.sesion.ruta_negocio).toBe('marisquerias/marisqueria-puerto-libres');
    expect(state.sesion.categoria_id).toBe('marisquerias');
  });

  it('debe asignar dispositivo preferido y persistirlo', async () => {
    const store = useStore.getState();
    await store.setSession({
      access_code: 'ACCESS-HW',
      rutaNegocio: '2 alimentos_y_bebidas/marisquerias/negocio-hw',
      negocioId: 'negocio-hw',
      niche: '2 alimentos_y_bebidas',
      category: 'marisquerias',
      rol: 'admin',
    });
    await store.setDispositivoPreferido('impresora-termica', 'HW-PRINTER-01');

    expect(useStore.getState().hardware.preferidos['impresora-termica']).toBe('HW-PRINTER-01');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@2 alimentos_y_bebidas/marisquerias/negocio-hw:hardware:preferidos',
      JSON.stringify({ 'impresora-termica': 'HW-PRINTER-01' })
    );
  });

  it('debe cargar sesión y features desde almacenamiento persistido al arrancar', async () => {
    const sesionData = {
      access_code: 'ACCESS-123',
      rutaNegocio: '2 alimentos_y_bebidas/marisquerias/puerto-libres',
      negocioId: 'marisquerias/puerto-libres',
      niche: '2 alimentos_y_bebidas',
      rol: 'admin',
    };

    const featuresData = {
      admin_menu: { enabled: true },
      venta_crudo: { enabled: false },
    };

    // Pre-cargar mocks en AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'sesion') return JSON.stringify(sesionData);
      if (key === 'features') return JSON.stringify(featuresData);
      return null;
    });

    await cargarEstadoPersistido();

    const state = useStore.getState();
    expect(state.sesion.access_code).toBe('ACCESS-123');
    expect(state.sesion.rutaNegocio).toBe('2 alimentos_y_bebidas/marisquerias/puerto-libres');
    expect(state.negocio.features.admin_menu.enabled).toBe(true);
  });

  it('no debe purgar la sesión al desmontar un cleanup de navegación', async () => {
    const store = useStore.getState();
    const rutaNegocio = '2 alimentos_y_bebidas/marisquerias/negocio-navigation';
    await store.setSession({
      access_code: 'ACCESS-NAV',
      rutaNegocio,
      negocioId: 'negocio-navigation',
      niche: '2 alimentos_y_bebidas',
      category: 'marisquerias',
      rol: 'admin',
    });

    const localCleanup = jest.fn();
    const unregister = registerNegocioCleanup(rutaNegocio, localCleanup);
    unregister();

    const generation = switchNegocioLifecycle(rutaNegocio);
    expect(switchNegocioLifecycle(rutaNegocio)).toBe(generation);
    expect(localCleanup).not.toHaveBeenCalled();
    expect(useStore.getState().sesion.rutaNegocio).toBe(rutaNegocio);
    expect(getActiveRutaNegocio()).toBe(rutaNegocio);
  });

  it('debe purgar los datos scoped al cambiar explícitamente de negocio', async () => {
    const store = useStore.getState();
    await store.setSession({
      access_code: 'ACCESS-A',
      rutaNegocio: 'marisquerias/negocio-a',
      negocioId: 'negocio-a',
      niche: '2 alimentos_y_bebidas',
      category: 'marisquerias',
      rol: 'admin',
    });
    store.actualizarMesaLocal('mesa-a', { estado: 'ocupada' });

    await store.setSession({
      access_code: 'ACCESS-B',
      rutaNegocio: 'cafeterias/negocio-b',
      negocioId: 'negocio-b',
      niche: '2 alimentos_y_bebidas',
      category: 'cafeterias',
      rol: 'admin',
    });

    expect(useStore.getState().sesion.rutaNegocio).toBe('cafeterias/negocio-b');
    expect(useStore.getState().mesas).toEqual({});
  });

  it('debe purgar estado negocio y desconectar listeners al limpiar la sesión', async () => {
    const store = useStore.getState();
    await store.setSession({
      access_code: 'ACCESS-RESET',
      rutaNegocio: '2 alimentos_y_bebidas/marisquerias/negocio-reset',
      negocioId: 'negocio-reset',
      niche: '2 alimentos_y_bebidas',
      category: 'marisquerias',
      rol: 'admin',
    });
    store.actualizarMesaLocal('mesa-1', { estado: 'ocupada' });
    store.actualizarPedidoLocal('pedido-1', { estatus: 'nuevo' });
    const listenerCleanup = jest.fn();
    registerNegocioCleanup('2 alimentos_y_bebidas/marisquerias/negocio-reset', listenerCleanup);

    await store.clearSession();

    const state = useStore.getState();
    expect(listenerCleanup).toHaveBeenCalledTimes(1);
    expect(state.sesion.rutaNegocio).toBeNull();
    expect(state.mesas).toEqual({});
    expect(state.pedidos).toEqual({});
    expect(state.catalog).toEqual({});
  });

  it('debe limpiar toda la sesión y revocar el hardware en el logout', async () => {
    const store = useStore.getState();

    // Settear datos iniciales
    await store.setSession({
      access_code: 'ACCESS-123',
      rutaNegocio: '2 alimentos_y_bebidas/marisquerias/puerto-libres',
      negocioId: 'marisquerias/puerto-libres',
      niche: '2 alimentos_y_bebidas',
      category: 'marisquerias',
      rol: 'admin',
    });

    expect(useStore.getState().sesion.access_code).toBe('ACCESS-123');

    // Desconectar/Limpiar
    await store.clearSession();

    expect(useStore.getState().sesion.access_code).toBeNull();
    expect(useStore.getState().sesion.rutaNegocio).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('sesion');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('features');
  });
});
