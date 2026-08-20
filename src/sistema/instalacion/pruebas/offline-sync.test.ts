import { set, ref, push } from 'firebase/database';
import { SimpleSalesRepo } from '../../persistencia/SimpleSalesRepo';
import { OfflineSalesSync } from '../../servicios/OfflineSalesSync';
import { OfflineInventorySync } from '../../servicios/OfflineInventorySync';
import { SQLiteStorageAdapter } from '../../offline/storage/SQLiteStorageAdapter';
import type { Database } from 'firebase/database';

// Mock netinfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
}));

// Mock monitoring to prevent loading ESM Sentry module
jest.mock('../../core/monitoring', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  initSentry: jest.fn(),
}));

// Mock firebase/database
jest.mock('firebase/database', () => {
  const actual = jest.requireActual('firebase/database');
  return {
    ...actual,
    ref: jest.fn((db, path) => ({ db, path })),
    set: jest.fn().mockResolvedValue(undefined),
    push: jest.fn(() => ({ key: 'MOCK-KEY-123' })),
  };
});

// Mock SQLiteStorageAdapter
jest.mock('../../core/offline/storage/SQLiteStorageAdapter', () => ({
  SQLiteStorageAdapter: {
    getVentasPendientes: jest.fn().mockResolvedValue([]),
    markVentaSynced: jest.fn().mockResolvedValue(undefined),
    markVentaConflict: jest.fn().mockResolvedValue(undefined),
    getPendingInventoryMovements: jest.fn().mockResolvedValue([]),
    markInventoryMovementSynced: jest.fn().mockResolvedValue(undefined),
    incrementInventoryMovementAttempts: jest.fn().mockResolvedValue(undefined),
    markInventoryMovementFailed: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock Zustand Store
const mockAjustarStockDelta = jest.fn().mockResolvedValue(undefined);
const mockAjustarStockDeltaSeccion = jest.fn().mockResolvedValue(undefined);
jest.mock('../../core/store', () => ({
  useStore: {
    getState: () => ({
      ajustarStockDelta: mockAjustarStockDelta,
      ajustarStockDeltaSeccion: mockAjustarStockDeltaSeccion,
    }),
  },
}));

describe('offline-sync', () => {
  const dbMock = {} as unknown as Database;
  const tenantPath = '2 alimentos_y_bebidas/marisquerias/puerto-libres';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SimpleSalesRepo', () => {
    it('debe registrar venta con push si no tiene ID previo', async () => {
      const repo = new SimpleSalesRepo(dbMock, tenantPath);
      const venta = {
        total: 150,
        metodoPago: 'efectivo',
        items: [],
        timestamp: 1234,
        origen: 'venta_crudo' as const,
      };

      const generatedId = await repo.registrarVenta(venta);

      expect(push).toHaveBeenCalled();
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'MOCK-KEY-123' }),
        expect.objectContaining({ id: 'MOCK-KEY-123', total: 150 })
      );
      expect(generatedId).toBe('MOCK-KEY-123');
    });

    it('debe registrar venta con set e ID específico (idempotencia) si ya viene con ID', async () => {
      const repo = new SimpleSalesRepo(dbMock, tenantPath);
      const venta = {
        id: 'vc_ADI-HW_123_XYZ',
        total: 250,
        metodoPago: 'tarjeta',
        items: [],
        timestamp: 5678,
        origen: 'venta_crudo' as const,
      };

      const returnedId = await repo.registrarVenta(venta);

      expect(push).not.toHaveBeenCalled();
      expect(ref).toHaveBeenCalledWith(dbMock, `${tenantPath}/ventas/vc_ADI-HW_123_XYZ`);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ path: `${tenantPath}/ventas/vc_ADI-HW_123_XYZ` }),
        expect.objectContaining({ id: 'vc_ADI-HW_123_XYZ', total: 250 })
      );
      expect(returnedId).toBe('vc_ADI-HW_123_XYZ');
    });
  });

  describe('OfflineSalesSync', () => {
    it('debe inicializarse y disparar sincronización al recuperar internet', async () => {
      OfflineSalesSync.initialize(dbMock, tenantPath);

      const pendingMock = [
        {
          id: 'test-sale-1',
          data: JSON.stringify({
            id: 'test-sale-1',
            total: 300,
            metodoPago: 'efectivo',
            items: [],
            timestamp: 9999,
            origen: 'venta_crudo',
          }),
        },
      ];

      (SQLiteStorageAdapter.getVentasPendientes as jest.Mock).mockResolvedValueOnce(pendingMock);

      // Ejecutar la sincronización directamente para probar el flujo de forma síncrona
      await OfflineSalesSync.syncPendingSales();

      expect(SQLiteStorageAdapter.getVentasPendientes).toHaveBeenCalled();
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ path: `${tenantPath}/ventas/test-sale-1` }),
        expect.objectContaining({ id: 'test-sale-1', total: 300 })
      );
      expect(SQLiteStorageAdapter.markVentaSynced).toHaveBeenCalledWith('test-sale-1');
    });
  });

  describe('OfflineInventorySync', () => {
    it('debe inicializarse y procesar movimientos pendientes de inventario', async () => {
      OfflineInventorySync.initialize(dbMock, tenantPath);

      const pendingMovements = [
        {
          id: 'mov-1',
          tenantPath,
          containerId: 'area_cocina__default',
          itemId: 'item-camaron',
          delta: -2,
          usuario: 'Mesero Test',
          razon: 'venta',
          allowNegative: 1,
          attempts: 0,
        },
        {
          id: 'mov-2',
          tenantPath,
          containerId: 'section:alimentos',
          itemId: 'item-refresco',
          delta: 5,
          usuario: 'Admin Test',
          razon: 'reabastecimiento',
          allowNegative: 0,
          attempts: 0,
        },
      ];

      (SQLiteStorageAdapter.getPendingInventoryMovements as jest.Mock).mockResolvedValueOnce(
        pendingMovements
      );

      // Ejecutar la sincronización de inventario directamente
      await OfflineInventorySync.syncPendingMovements();

      expect(SQLiteStorageAdapter.getPendingInventoryMovements).toHaveBeenCalled();

      // Verificar llamada de ajustarStockDelta (para containerId normal)
      expect(mockAjustarStockDelta).toHaveBeenCalledWith({
        db: dbMock,
        tenantPath,
        containerId: 'area_cocina__default',
        itemId: 'item-camaron',
        delta: -2,
        usuario: 'Mesero Test',
        razon: 'venta',
        allowNegative: true,
      });

      // Verificar llamada de ajustarStockDeltaSeccion (para section:)
      expect(mockAjustarStockDeltaSeccion).toHaveBeenCalledWith({
        db: dbMock,
        tenantPath,
        sectionId: 'alimentos',
        itemId: 'item-refresco',
        delta: 5,
        usuario: 'Admin Test',
        razon: 'reabastecimiento',
        allowNegative: false,
      });

      expect(SQLiteStorageAdapter.markInventoryMovementSynced).toHaveBeenCalledWith('mov-1');
      expect(SQLiteStorageAdapter.markInventoryMovementSynced).toHaveBeenCalledWith('mov-2');
    });
  });
});
