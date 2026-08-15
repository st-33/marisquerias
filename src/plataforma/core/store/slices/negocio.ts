import type { StateCreator } from 'zustand';
import type { ContratoNegocio } from '../../types/contratos';
import { setFeature as setFeatureHelper } from '../../types/contratos';
import { storage, getTenantStorageKey } from './sesion';

type SessionContext = { sesion: { tenantPath: string | null } };

export const ESTADO_INICIAL_NEGOCIO: ContratoNegocio = {
  features: {},
};

function getTenantPath(get: () => NegocioSlice): string | null {
  return (get() as unknown as SessionContext).sesion.tenantPath;
}

async function persistFeatures(tenantPath: string | null, features: ContratoNegocio['features']) {
  const key = getTenantStorageKey(tenantPath, 'negocio', 'features');
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
    const tenantPath = getTenantPath(get);
    set((state) => ({
      negocio: { ...state.negocio, features },
    }));
    void persistFeatures(tenantPath, features);
  },

  setFeature(path, enabled, config) {
    const negocio = get().negocio;
    const newNegocio = setFeatureHelper(negocio, path, enabled, config);
    const tenantPath = getTenantPath(get);
    set({ negocio: newNegocio });
    void persistFeatures(tenantPath, newNegocio.features);
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
