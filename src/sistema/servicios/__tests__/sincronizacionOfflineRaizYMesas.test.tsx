import React, { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { OfflineSalesSync } from '../SincronizacionVentasOffline';
import { OfflineInventorySync } from '../SincronizacionInventarioOffline';
import { useGestionarMesas } from '../../../roles/logica/mesero/gestionarMesas';
import { useStore } from '../../store';
import { logger } from '../../monitoreo';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('firebase/database', () => ({
  ref: jest.fn((db: any, path: string) => ({ db, path })),
  push: jest.fn(() => ({ key: 'test_key' })),
  onValue: jest.fn(),
  off: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

jest.mock('../../monitoreo', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('../../sin_conexion/almacenamiento/AdaptadorAlmacenamientoSQLite', () => ({
  SQLiteStorageAdapter: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getVentasPendientes: jest.fn().mockResolvedValue([]),
    getPendingInventoryMovements: jest.fn().mockResolvedValue([]),
    obtenerHistorialVentas: jest.fn().mockResolvedValue([]),
    guardarHistorialVenta: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Plan 06: Resiliencia Offline y Carga de Mesas en Raíz Dedicada', () => {
  const mockDb = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    OfflineSalesSync.destroy();
    OfflineInventorySync.destroy();
  });

  describe('Sincronización Offline con rutaNegocio dedicada vacía', () => {
    it('OfflineSalesSync.initialize acepta ruta vacía y no arroja error OFFLINE_SYNC', () => {
      OfflineSalesSync.initialize(mockDb, '');
      expect(logger.error).not.toHaveBeenCalledWith(
        'OFFLINE_SYNC',
        expect.stringContaining('Intento de inicializar ventas con rutaNegocio inválido'),
        expect.anything()
      );
      expect(logger.info).toHaveBeenCalledWith(
        'OFFLINE_SYNC',
        expect.stringContaining('Servicio de sincronización inicializado'),
        { rutaNegocio: '' }
      );
    });

    it('OfflineInventorySync.initialize acepta ruta vacía y no arroja error OFFLINE_INV_SYNC', () => {
      OfflineInventorySync.initialize(mockDb, '');
      expect(logger.error).not.toHaveBeenCalledWith(
        'OFFLINE_INV_SYNC',
        expect.stringContaining('Intento de inicializar inventario con rutaNegocio inválido'),
        expect.anything()
      );
      expect(logger.info).toHaveBeenCalledWith(
        'OFFLINE_INV_SYNC',
        expect.stringContaining('Servicio de sincronización de inventario inicializado'),
        { rutaNegocio: '' }
      );
    });
  });

  describe('Carga de Mesas en Base de Datos Vacía (0 mesas)', () => {
    const mockMesasRepo: any = {
      obtenerItemsBorrador: jest.fn().mockResolvedValue([]),
      cambiarEstadoMesa: jest.fn().mockResolvedValue(undefined),
    };

    function MesasProbe({ onState }: { onState: (state: any) => void }) {
      const result = useGestionarMesas({ mesasRepo: mockMesasRepo });
      useEffect(() => {
        onState(result);
      });
      return null;
    }

    it('desbloquea loading cuando el store recibe la primera actualización de RTDB (0 mesas)', () => {
      jest.useFakeTimers();
      let state: any;
      useStore.setState({ mesas: {}, ultimaActualizacion: null });

      let renderer: ReactTestRenderer;
      act(() => {
        renderer = create(<MesasProbe onState={(s) => (state = s)} />);
      });

      expect(state.loading).toBe(true);

      // Simular que el listener de RTDB reportó snapshot (vacío pero actualizado)
      act(() => {
        useStore.setState({ mesas: {}, ultimaActualizacion: Date.now() });
      });

      act(() => {
        jest.runOnlyPendingTimers();
      });

      expect(state.loading).toBe(false);
      expect(state.tables).toEqual([]);

      act(() => {
        renderer!.unmount();
      });
      jest.useRealTimers();
    });

    it('desbloquea loading por timeout de seguridad si no hay actualización tras 2.5s', () => {
      jest.useFakeTimers();
      let state: any;
      useStore.setState({ mesas: {}, ultimaActualizacion: null });

      let renderer: ReactTestRenderer;
      act(() => {
        renderer = create(<MesasProbe onState={(s) => (state = s)} />);
      });

      expect(state.loading).toBe(true);

      act(() => {
        jest.advanceTimersByTime(2500);
      });

      expect(state.loading).toBe(false);

      act(() => {
        renderer!.unmount();
      });
      jest.useRealTimers();
    });
  });
});
