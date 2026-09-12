import { off, onValue, ref } from 'firebase/database';
import type { Database } from 'firebase/database';
import {
  CentralListener,
  suscribirCentralAlStore,
} from '../CentralListener';
import {
  estaCapacidadHabilitadaPorCentral,
} from '../useCentralConfig';
import { normalizarFeaturesAdmin } from '../../../capacidades/admin/useAdminFeatures';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
  NativeModules: {
    RNCNetInfo: {
      getCurrentState: jest.fn().mockResolvedValue({ isConnected: true }),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    },
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

jest.mock('firebase/database', () => ({
  ref: jest.fn((db: unknown, path: string) => ({ db, path })),
  onValue: jest.fn(),
  off: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
}));

jest.mock('../../monitoreo', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Unidad Central — Listener y Contrato de Configuración/Estado', () => {
  const dbMock = {} as unknown as Database;
  const negocioId = 'puerto_libres';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CentralListener', () => {
    it('se suscribe a las rutas canónicas de configuración y estado en RTDB', () => {
      const listener = new CentralListener(dbMock, negocioId);
      const callbacks = {
        onConfiguracion: jest.fn(),
        onEstado: jest.fn(),
      };

      const unsub = listener.iniciar(callbacks);

      expect(ref).toHaveBeenCalledWith(
        dbMock,
        `central/negocios/${negocioId}/configuracion`
      );
      expect(ref).toHaveBeenCalledWith(
        dbMock,
        `central/negocios/${negocioId}/estado`
      );
      expect(onValue).toHaveBeenCalledTimes(2);

      unsub();
      expect(off).toHaveBeenCalledTimes(2);
    });

    it('FRONTERA: solo lee y escucha, NUNCA escribe en central/*', () => {
      const { set, update } = require('firebase/database');
      const listener = new CentralListener(dbMock, negocioId);
      listener.iniciar({});

      expect(set).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });

    it('suscribirCentralAlStore despacha valores al store', () => {
      const storeMock = {
        setCentralConfiguracion: jest.fn(),
        setCentralEstado: jest.fn(),
        setCentralError: jest.fn(),
      };

      (onValue as jest.Mock).mockImplementation((r, callback) => {
        if (r.path.includes('configuracion')) {
          callback({
            exists: () => true,
            val: () => ({ reparto: false, mostrador: true }),
          });
        }
        if (r.path.includes('estado')) {
          callback({
            exists: () => true,
            val: () => ({ activo: true, bloqueado: false }),
          });
        }
      });

      const unsub = suscribirCentralAlStore(dbMock, negocioId, storeMock);

      expect(storeMock.setCentralConfiguracion).toHaveBeenCalledWith({
        reparto: false,
        mostrador: true,
      });
      expect(storeMock.setCentralEstado).toHaveBeenCalledWith({
        activo: true,
        bloqueado: false,
      });

      unsub();
    });
  });

  describe('estaCapacidadHabilitadaPorCentral — Reglas de Oro y UI', () => {
    it('CERO BLOQUEOS SÍNCRONOS: si Central no responde o configuracion es null, permite operación', () => {
      expect(estaCapacidadHabilitadaPorCentral(null, null, 'reparto')).toBe(true);
      expect(estaCapacidadHabilitadaPorCentral(undefined, undefined, 'mostrador')).toBe(true);
    });

    it('oculta reparto si Central lo desactiva explícitamente a nivel raíz', () => {
      const config = { reparto: false, mostrador: true };
      expect(estaCapacidadHabilitadaPorCentral(config, null, 'reparto')).toBe(false);
      expect(estaCapacidadHabilitadaPorCentral(config, null, 'mostrador')).toBe(true);
    });

    it('oculta capacidades anidadas bajo config.capacidades', () => {
      const config = { capacidades: { reparto: false, mostrador: false } };
      expect(estaCapacidadHabilitadaPorCentral(config, null, 'reparto')).toBe(false);
      expect(estaCapacidadHabilitadaPorCentral(config, null, 'mostrador')).toBe(false);
    });

    it('bloquea todas las capacidades si Central reporta negocio bloqueado o inactivo', () => {
      const config = { reparto: true, mostrador: true };
      const estadoInactivo = { activo: false };
      const estadoBloqueado = { activo: true, bloqueado: true };

      expect(estaCapacidadHabilitadaPorCentral(config, estadoInactivo, 'reparto')).toBe(false);
      expect(estaCapacidadHabilitadaPorCentral(config, estadoBloqueado, 'mostrador')).toBe(false);
    });
  });

  describe('Reacción en UI (useAdminFeatures)', () => {
    it('normalizarFeaturesAdmin oculta admin_repart y mostrador cuando Central los desactiva', () => {
      const rawCaracteristicas = {
        roles: {
          admin: {
            dashboard: true,
            menu: true,
            inventario: true,
            mesas: true,
            dispositivos: true,
            repart: true,
            mostrador: true,
          },
        },
        module_venta_crudo: true,
      };

      // 1. Con Central habilitado
      const featuresHabilitadas = normalizarFeaturesAdmin(
        rawCaracteristicas as any,
        { reparto: true, mostrador: true },
        { activo: true }
      );
      expect(featuresHabilitadas.admin_repart).toBe(true);
      expect(featuresHabilitadas.admin_mostrador).toBe(true);
      expect(featuresHabilitadas.module_venta_crudo).toBe(true);

      // 2. Si Central desactiva reparto
      const featuresSinReparto = normalizarFeaturesAdmin(
        rawCaracteristicas as any,
        { reparto: false, mostrador: true },
        { activo: true }
      );
      expect(featuresSinReparto.admin_repart).toBe(false);
      expect(featuresSinReparto.admin_mostrador).toBe(true);

      // 3. Si Central desactiva mostrador
      const featuresSinMostrador = normalizarFeaturesAdmin(
        rawCaracteristicas as any,
        { reparto: true, mostrador: false },
        { activo: true }
      );
      expect(featuresSinMostrador.admin_mostrador).toBe(false);
      expect(featuresSinMostrador.module_venta_crudo).toBe(false);
    });
  });
});
