import type { StateCreator } from 'zustand';
import type { ContratoNegocio } from '../../../sistema/tipos/contratos';
import { setFeature as setFeatureHelper } from '../../../sistema/tipos/contratos';
import { storage, getNegocioStorageKey } from './sesion';

type SessionContext = { sesion: { rutaNegocio: string | null } };

export const ESTADO_INICIAL_NEGOCIO: ContratoNegocio = {
  features: {},
};

function getRutaNegocio(get: () => NegocioSlice): string | null {
  return (get() as unknown as SessionContext).sesion.rutaNegocio;
}

async function persistFeatures(rutaNegocio: string | null, features: ContratoNegocio['features']) {
  const key = getNegocioStorageKey(rutaNegocio, 'negocio', 'features');
  if (!key) return;

  try {
    await storage.setItem(key, JSON.stringify(features));
  } catch (error) {
    console.error('[STORE_NEGOCIO] Error al persistir features', error);
  }
}

export interface AccionesNegocio {
  setFeatures: (features: ContratoNegocio['features']) => void;
  setFeature: (path: string, enabled: boolean, config?: Record<string, any>) => void;
  setConfiguracion: (config: ContratoNegocio['configuracion']) => void;
  updateConfiguracion: (updates: Partial<ContratoNegocio['configuracion']>) => void;
}

export type NegocioSlice = { negocio: ContratoNegocio } & AccionesNegocio;

export const createNegocioSlice: StateCreator<NegocioSlice, [], [], NegocioSlice> = (set, get) => ({
  negocio: ESTADO_INICIAL_NEGOCIO,

  setFeatures(features) {
    const rutaNegocio = getRutaNegocio(get);
    set((state) => ({
      negocio: { ...state.negocio, features },
    }));
    void persistFeatures(rutaNegocio, features);
  },

  setFeature(path, enabled, config) {
    const negocio = get().negocio;
    const newNegocio = setFeatureHelper(negocio, path, enabled, config);
    const rutaNegocio = getRutaNegocio(get);
    set({ negocio: newNegocio });
    void persistFeatures(rutaNegocio, newNegocio.features);
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
