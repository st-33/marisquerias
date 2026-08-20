import React from 'react';
import { useMostradorPro } from './useMostradorPro';
import { SQLiteStorageAdapter } from '../../sistema/offline/storage/SQLiteStorageAdapter';
import { OfflinePrintFallback } from '../../sistema/servicios/OfflinePrintFallback';
import { DespachadorCola } from '../../sistema/impresion/fierros/cola/DespachadorCola';

// Mock react
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useState: jest.fn((initial: any) => [initial, jest.fn()]),
    useEffect: jest.fn((fn) => fn()),
    useMemo: jest.fn((fn) => fn()),
    useCallback: jest.fn((fn) => fn),
  };
});

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
}));

// Mock monitoring
jest.mock('../../sistema/monitoreo', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  initSentry: jest.fn(),
}));

// Mock firebase/database
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  set: jest.fn(),
  push: jest.fn(),
  get: jest.fn(),
  off: jest.fn(),
  onValue: jest.fn(() => () => {}),
}));

// Mock firebase/core/auth, etc.
jest.mock('../../sistema/firebase', () => ({
  getRtdb: jest.fn(() => ({})),
}));

// Mock repositories
jest.mock('../../sistema/persistencia', () => ({
  MenuRepository: jest.fn().mockImplementation(() => ({
    suscribirProductos: jest.fn().mockReturnValue(() => {}),
    suscribirCategorias: jest.fn().mockReturnValue(() => {}),
  })),
}));

const mockRegistrarVenta = jest.fn().mockResolvedValue('MOCK-VENTA-123');
jest.mock('../../sistema/persistencia/SimpleSalesRepo', () => ({
  SimpleSalesRepo: jest.fn().mockImplementation(() => ({
    registrarVenta: mockRegistrarVenta,
  })),
}));

const mockRegistrarVentaMultiple = jest.fn().mockResolvedValue('MOCK-VENTA-MULTIPLE-123');
jest.mock('../../sistema/persistencia/inventory.v2.repo', () => ({
  InventoryV2Repository: jest.fn().mockImplementation(() => ({
    obtenerAreas: jest.fn().mockResolvedValue({
      'area-venta-crudo-1': { hubId: 'venta_crudo', nombre: 'Mostrador' },
    }),
    registrarVentaMultiple: mockRegistrarVentaMultiple,
  })),
}));

// Mock device ID resolver
jest.mock('../../sistema/instalacion/vinculacion/generar-device-id-adi', () => ({
  resolverDeviceIdADI: jest.fn().mockResolvedValue('test-device-id'),
}));

// Mock custom config hooks
jest.mock('../usePosConfig', () => ({
  usePosConfig: jest.fn().mockReturnValue({
    config: {
      allowNegativeStock: false,
    },
    loading: false,
  }),
}));

jest.mock('../../sistema/providers/ProveedorConfiguracionTenant', () => ({
  useConfiguracionTenant: jest.fn(),
}));

// Mock SQLiteStorageAdapter
jest.mock('../../sistema/offline/storage/SQLiteStorageAdapter', () => ({
  SQLiteStorageAdapter: {
    createVentaOffline: jest.fn().mockResolvedValue(undefined),
    getProductos: jest.fn().mockResolvedValue({}),
    getCategorias: jest.fn().mockResolvedValue({}),
    saveProductosBulk: jest.fn().mockResolvedValue(undefined),
    saveCategoriasBulk: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock OfflinePrintFallback
jest.mock('../../sistema/servicios/OfflinePrintFallback', () => ({
  OfflinePrintFallback: {
    getStatus: jest.fn().mockReturnValue({ isOnline: true }),
    print: jest
      .fn()
      .mockResolvedValue({ success: true, method: 'bluetooth', message: 'Bluetooth ok' }),
  },
}));

// Mock DespachadorCola
jest.mock('../../sistema/impresion/fierros/cola/DespachadorCola', () => ({
  DespachadorCola: {
    obtenerInstancia: jest.fn().mockReturnValue({
      encolar: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock Zustand Store
const mockFeatures = {
  inventory_auto_discount: { enabled: true },
  inventario: { enabled: true },
  impresion: { enabled: true },
  bascula: { enabled: true },
  delivery: { enabled: true },
};

const mockAjustarStockDelta = jest.fn().mockResolvedValue(undefined);
jest.mock('../../sistema/store', () => ({
  useStore: Object.assign(
    jest.fn((selector) =>
      selector({
        sesion: {
          tenantPath: 'test/tenant',
          usuario: { nombre: 'Test User' },
        },
        negocio: {
          features: mockFeatures,
        },
        dataSources: { operacionUrl: 'https://test.firebase.com' },
        areas: {
          'area-venta-crudo-1': { hubId: 'venta_crudo', nombre: 'Mostrador' },
        },
        ajustarStockDelta: mockAjustarStockDelta,
      })
    ),
    {
      getState: () => ({
        sesion: {
          tenantPath: 'test/tenant',
          usuario: { nombre: 'Test User' },
        },
        negocio: {
          features: mockFeatures,
        },
        areas: {
          'area-venta-crudo-1': { hubId: 'venta_crudo', nombre: 'Mostrador' },
        },
        ajustarStockDelta: mockAjustarStockDelta,
      }),
    }
  ),
}));

describe('useMostradorPro - completarVenta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFeatures.inventory_auto_discount.enabled = true;
    mockFeatures.inventario.enabled = true;
    mockFeatures.impresion.enabled = true;
    mockFeatures.bascula.enabled = true;
    mockFeatures.delivery.enabled = true;
  });

  it('debe completar venta en modo ONLINE y registrarla en Firebase e inventario', async () => {
    (OfflinePrintFallback.getStatus as jest.Mock).mockReturnValue({ isOnline: true });

    const mockCarrito = [
      {
        id: '1',
        productoId: 'prod-camaron',
        nombre: 'Camarón',
        precio: 100,
        cantidad: 2,
        subtotal: 200,
        unidad: 'kg',
      },
    ];

    let callCount = 0;
    jest.spyOn(React, 'useState').mockImplementation((init?: any): [any, any] => {
      callCount++;
      if (callCount === 4) {
        return [mockCarrito, jest.fn()];
      }
      return [init, jest.fn()];
    });

    const hookInstance = useMostradorPro();
    const result = await hookInstance.actions.completarVenta('efectivo');

    expect(result.success).toBe(true);
    expect(result.offline).toBe(false);
    expect(result.method).toBe('hub');
    expect(mockRegistrarVenta).toHaveBeenCalled();
    expect(mockRegistrarVentaMultiple).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.any(Array),
        areaId: 'area-venta-crudo-1',
        total: 200,
        metodoPago: 'efectivo',
      })
    );
  });

  it('debe completar venta en modo OFFLINE, guardarla en SQLite y descontar inventario localmente', async () => {
    (OfflinePrintFallback.getStatus as jest.Mock).mockReturnValue({ isOnline: false });

    const mockCarrito = [
      {
        id: '1',
        productoId: 'prod-camaron',
        nombre: 'Camarón',
        precio: 100,
        cantidad: 2,
        subtotal: 200,
        unidad: 'kg',
      },
    ];

    let callCount = 0;
    jest.spyOn(React, 'useState').mockImplementation((init?: any): [any, any] => {
      callCount++;
      if (callCount === 4) {
        return [mockCarrito, jest.fn()];
      }
      return [init, jest.fn()];
    });

    const hookInstance = useMostradorPro();
    const result = await hookInstance.actions.completarVenta('efectivo');

    expect(result.success).toBe(true);
    expect(result.offline).toBe(true);
    expect(SQLiteStorageAdapter.createVentaOffline).toHaveBeenCalled();
    expect(mockAjustarStockDelta).toHaveBeenCalledWith({
      db: null,
      tenantPath: 'test/tenant',
      containerId: 'area-venta-crudo-1',
      itemId: 'prod-camaron',
      delta: -2,
      usuario: 'Test User',
      razon: expect.stringContaining('Venta Offline Mostrador'),
      allowNegative: false,
    });
    expect(OfflinePrintFallback.print).toHaveBeenCalled();
  });

  it('debe completar venta sin descontar stock si isInventarioEnabled es false', async () => {
    (OfflinePrintFallback.getStatus as jest.Mock).mockReturnValue({ isOnline: true });
    mockFeatures.inventario.enabled = false;

    const mockCarrito = [
      {
        id: '1',
        productoId: 'prod-camaron',
        nombre: 'Camarón',
        precio: 100,
        cantidad: 2,
        subtotal: 200,
        unidad: 'kg',
      },
    ];

    let callCount = 0;
    jest.spyOn(React, 'useState').mockImplementation((init?: any): [any, any] => {
      callCount++;
      if (callCount === 4) return [mockCarrito, jest.fn()];
      return [init, jest.fn()];
    });

    const hookInstance = useMostradorPro();
    const result = await hookInstance.actions.completarVenta('efectivo');

    expect(result.success).toBe(true);
    expect(mockRegistrarVentaMultiple).not.toHaveBeenCalled();
  });

  it('debe completar venta sin imprimir ni llamar al spooler si isImpresionEnabled es false', async () => {
    (OfflinePrintFallback.getStatus as jest.Mock).mockReturnValue({ isOnline: true });
    mockFeatures.impresion.enabled = false;

    const mockCarrito = [
      {
        id: '1',
        productoId: 'prod-camaron',
        nombre: 'Camarón',
        precio: 100,
        cantidad: 2,
        subtotal: 200,
        unidad: 'kg',
      },
    ];

    let callCount = 0;
    jest.spyOn(React, 'useState').mockImplementation((init?: any): [any, any] => {
      callCount++;
      if (callCount === 4) return [mockCarrito, jest.fn()];
      return [init, jest.fn()];
    });

    const hookInstance = useMostradorPro();
    const result = await hookInstance.actions.completarVenta('efectivo');

    expect(result.success).toBe(true);
    expect(DespachadorCola.obtenerInstancia).not.toHaveBeenCalled();
  });
});
