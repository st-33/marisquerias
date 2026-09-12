import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateCreator } from 'zustand';
import type { ContratoDataSources } from '../../../sistema/tipos/contratos';
import { getNegocioStorageKey } from './sesion';

type SessionContext = { sesion: { rutaNegocio: string | null } };

export const ESTADO_INICIAL_DATA_SOURCES: ContratoDataSources = {
  operacionUrl: null,
  repartoUrl: null,
  perfilesUrl: null,
};

function getRutaNegocio(get: () => DataSourcesSlice): string | null {
  return (get() as unknown as SessionContext).sesion.rutaNegocio;
}

export interface AccionesDataSources {
  setDataSources: (sources: Partial<ContratoDataSources>) => Promise<void>;
  loadDataSources: () => Promise<void>;
}

export type DataSourcesSlice = { dataSources: ContratoDataSources } & AccionesDataSources;

export const createDataSourcesSlice: StateCreator<DataSourcesSlice, [], [], DataSourcesSlice> = (
  set,
  get
) => ({
  dataSources: ESTADO_INICIAL_DATA_SOURCES,

  async setDataSources(sources) {
    const merged = { ...get().dataSources, ...sources };
    set({ dataSources: merged });

    try {
      const key = getNegocioStorageKey(getRutaNegocio(get), 'data-sources', 'config');
      if (key) await AsyncStorage.setItem(key, JSON.stringify(merged));
    } catch (error) {
      console.error('[Store] Error al persistir dataSources:', error);
    }
  },

  async loadDataSources() {
    try {
      const key = getNegocioStorageKey(getRutaNegocio(get), 'data-sources', 'config');
      if (!key) return;

      const raw = await AsyncStorage.getItem(key);
      if (!raw) return;

      set({ dataSources: JSON.parse(raw) as ContratoDataSources });
    } catch (error) {
      console.error('[Store] Error al cargar dataSources:', error);
    }
  },
});
