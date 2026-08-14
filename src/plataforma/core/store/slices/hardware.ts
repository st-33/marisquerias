import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateCreator } from 'zustand';
import type { ContratoHardware, DispositivoConfig, TipoDispositivo } from '../../types/contratos';

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
  hardware: {
    dispositivos: {},
    preferidos: {},
    permisos: {
      bluetooth: false,
      ubicacion: false,
      camara: false,
      almacenamiento: false,
    },
  },

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
      const dispositivos = get().hardware.dispositivos;
      await AsyncStorage.setItem('hardware_dispositivos', JSON.stringify(dispositivos));
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
      const dispositivos = get().hardware.dispositivos;
      await AsyncStorage.setItem('hardware_dispositivos', JSON.stringify(dispositivos));
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
      const preferidos = get().hardware.preferidos;
      await AsyncStorage.setItem('hardware_preferidos', JSON.stringify(preferidos));
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
      const rawDispositivos = await AsyncStorage.getItem('hardware_dispositivos');
      if (rawDispositivos) {
        const dispositivos = JSON.parse(rawDispositivos);
        set((state) => ({
          hardware: { ...state.hardware, dispositivos },
        }));
      }

      const rawPreferidos = await AsyncStorage.getItem('hardware_preferidos');
      if (rawPreferidos) {
        const preferidos = JSON.parse(rawPreferidos);
        set((state) => ({
          hardware: { ...state.hardware, preferidos },
        }));
      }
    } catch (error) {
      console.error('[Store] Error al cargar hardware:', error);
    }
  },
});
