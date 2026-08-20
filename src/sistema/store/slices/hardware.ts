import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateCreator } from 'zustand';
import type { ContratoHardware, DispositivoConfig, TipoDispositivo } from '../../../sistema/tipos/contratos';
import { getTenantStorageKey } from './sesion';

type SessionContext = { sesion: { tenantPath: string | null } };

export const ESTADO_INICIAL_HARDWARE: ContratoHardware = {
  dispositivos: {},
  preferidos: {},
  permisos: {
    bluetooth: false,
    ubicacion: false,
    camara: false,
    almacenamiento: false,
  },
};

function getTenantPath(get: () => HardwareSlice): string | null {
  return (get() as unknown as SessionContext).sesion.tenantPath;
}

function getHardwareKey(
  get: () => HardwareSlice,
  key: 'dispositivos' | 'preferidos'
): string | null {
  return getTenantStorageKey(getTenantPath(get), 'hardware', key);
}

export interface AccionesHardware {
  registrarDispositivo: (dispositivo: DispositivoConfig) => Promise<void>;
  actualizarDispositivo: (id: string, updates: Partial<DispositivoConfig>) => void;
  eliminarDispositivo: (id: string) => Promise<void>;
  setDispositivoPreferido: (tipo: TipoDispositivo, dispositivoId: string) => Promise<void>;
  setPermisos: (permisos: Partial<ContratoHardware['permisos']>) => void;
  loadHardware: () => Promise<void>;
}

export type HardwareSlice = { hardware: ContratoHardware } & AccionesHardware;

export const createHardwareSlice: StateCreator<HardwareSlice, [], [], HardwareSlice> = (
  set,
  get
) => ({
  hardware: ESTADO_INICIAL_HARDWARE,

  async registrarDispositivo(dispositivo) {
    set((state) => ({
      hardware: {
        ...state.hardware,
        dispositivos: {
          ...state.hardware.dispositivos,
          [dispositivo.id]: dispositivo,
        },
      },
    }));

    try {
      const key = getHardwareKey(get, 'dispositivos');
      if (key) {
        await AsyncStorage.setItem(key, JSON.stringify(get().hardware.dispositivos));
      }
    } catch (error) {
      console.error('[Store] Error al persistir dispositivo:', error);
    }
  },

  actualizarDispositivo(id, updates) {
    set((state) => {
      const dispositivo = state.hardware.dispositivos[id];
      if (!dispositivo) return state;

      return {
        hardware: {
          ...state.hardware,
          dispositivos: {
            ...state.hardware.dispositivos,
            [id]: { ...dispositivo, ...updates },
          },
        },
      };
    });
  },

  async eliminarDispositivo(id) {
    set((state) => {
      const { [id]: removed, ...rest } = state.hardware.dispositivos;
      return {
        hardware: {
          ...state.hardware,
          dispositivos: rest,
        },
      };
    });

    try {
      const key = getHardwareKey(get, 'dispositivos');
      if (key) {
        await AsyncStorage.setItem(key, JSON.stringify(get().hardware.dispositivos));
      }
    } catch (error) {
      console.error('[Store] Error al eliminar dispositivo:', error);
    }
  },

  async setDispositivoPreferido(tipo, dispositivoId) {
    set((state) => ({
      hardware: {
        ...state.hardware,
        preferidos: {
          ...state.hardware.preferidos,
          [tipo]: dispositivoId,
        },
      },
    }));

    try {
      const key = getHardwareKey(get, 'preferidos');
      if (key) {
        await AsyncStorage.setItem(key, JSON.stringify(get().hardware.preferidos));
      }
    } catch (error) {
      console.error('[Store] Error al persistir preferido:', error);
    }
  },

  setPermisos(permisos) {
    set((state) => ({
      hardware: {
        ...state.hardware,
        permisos: {
          ...state.hardware.permisos,
          ...permisos,
        },
      },
    }));
  },

  async loadHardware() {
    try {
      const dispositivosKey = getHardwareKey(get, 'dispositivos');
      const preferidosKey = getHardwareKey(get, 'preferidos');
      if (!dispositivosKey || !preferidosKey) return;

      const [rawDispositivos, rawPreferidos] = await Promise.all([
        AsyncStorage.getItem(dispositivosKey),
        AsyncStorage.getItem(preferidosKey),
      ]);

      set((state) => ({
        hardware: {
          ...state.hardware,
          dispositivos: rawDispositivos ? JSON.parse(rawDispositivos) : {},
          preferidos: rawPreferidos ? JSON.parse(rawPreferidos) : {},
        },
      }));
    } catch (error) {
      console.error('[Store] Error al cargar hardware:', error);
    }
  },
});
