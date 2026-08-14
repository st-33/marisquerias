import type { StateCreator } from 'zustand';
import type { ContratoNegocio } from '../../types/contratos';
import { setFeature as setFeatureHelper } from '../../types/contratos';
import { storage } from './sesion';

export interface AccionesNegocio {
  setFeatures: (features: ContratoNegocio['features']) => void;
  setFeature: (path: string, enabled: boolean, config?: Record<string, any>) => void;
  setConfiguracion: (config: ContratoNegocio['configuracion']) => void;
  updateConfiguracion: (updates: Partial<ContratoNegocio['configuracion']>) => void;
}

export type NegocioSlice = { negocio: ContratoNegocio } & AccionesNegocio;

export const createNegocioSlice: StateCreator<NegocioSlice, [], [], NegocioSlice> = (set, get) => ({
  negocio: {
    features: {},
  },

  setFeatures(features) {
    set((state) => ({
      negocio: { ...state.negocio, features },
    }));
    storage.setItem('features', JSON.stringify(features)).catch((err) => {
      console.error('[STORE_NEGOCIO] Error al persistir features', err);
    });
  },

  setFeature(path, enabled, config) {
    const negocio = get().negocio;
    const newNegocio = setFeatureHelper(negocio, path, enabled, config);
    set({ negocio: newNegocio });
    storage.setItem('features', JSON.stringify(newNegocio.features)).catch((err) => {
      console.error('[STORE_NEGOCIO] Error al persistir feature unitaria', err);
    });
  },

  setConfiguracion(config) {
    set((state) => ({
      negocio: { ...state.negocio, configuracion: config },
    }));
  },

  updateConfiguracion(updates) {
    set((state) => ({
      negocio: {
        ...state.negocio,
        configuracion: {
          ...state.negocio.configuracion,
          ...updates,
        },
      },
    }));
  },
});
