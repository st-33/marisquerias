import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateCreator } from 'zustand';
import type { ContratoDataSources } from '../../types/contratos';

export interface AccionesDataSources {
  setDataSources: (sources: Partial<ContratoDataSources>) => Promise<void>;
  loadDataSources: () => Promise<void>;
}

export type DataSourcesSlice = { dataSources: ContratoDataSources } & AccionesDataSources;

export const createDataSourcesSlice: StateCreator<DataSourcesSlice, [], [], DataSourcesSlice> = (
  set,
  get
) => ({
  dataSources: {
    operacionUrl: null,
    repartoUrl: null,
    perfilesUrl: null,
  },

  async setDataSources(sources) {
    const merged = { ...get().dataSources, ...sources };
    set({ dataSources: merged });

    try {
      await AsyncStorage.setItem('dataSources', JSON.stringify(merged));
    } catch (error) {
      console.error('[Store] Error al persistir dataSources:', error);
    }
  },

  async loadDataSources() {
    try {
      const raw = await AsyncStorage.getItem('dataSources');
      if (!raw) return;

      const dataSources = JSON.parse(raw) as ContratoDataSources;
      set({ dataSources });
    } catch (error) {
      console.error('[Store] Error al cargar dataSources:', error);
    }
  },
});
