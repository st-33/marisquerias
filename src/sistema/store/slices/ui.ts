import type { StateCreator } from 'zustand';
import { logger } from '../../monitoreo';
import type { ContratoUI, FabConfig } from '../../../plataforma/core/types/contratos';

export interface AccionesUI {
  setFabConfigForRoute: (pathname: string, config: FabConfig | null) => void;
  clearFabConfigForRoute: (pathname: string) => void;
  clearAllFabConfigs: () => void;
  addAlerta: (alerta: Omit<ContratoUI['alertas'][0], 'id'>) => void;
  removeAlerta: (id: string) => void;
  clearAlertas: () => void;
  setLoading: (activo: boolean, mensaje?: string) => void;
  setModal: (modalKey: string, visible: boolean, data?: any) => void;
}

export type UISlice = { ui: ContratoUI } & AccionesUI;

export const ESTADO_INICIAL_UI: ContratoUI = {
  fabConfigs: {},
  alertas: [],
  loading: { activo: false },
  modals: {},
};

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set, get) => ({
  ui: ESTADO_INICIAL_UI,

  setFabConfigForRoute(pathname: string, config: FabConfig | null) {
    set((state) => {
      const newConfigs = { ...state.ui.fabConfigs };
      if (config === null) {
        delete newConfigs[pathname];
      } else {
        newConfigs[pathname] = config;
      }
      logger.debug('FAB', 'Config actualizada', { pathname, hasConfig: config !== null });
      return {
        ui: { ...state.ui, fabConfigs: newConfigs },
      };
    });
  },

  clearFabConfigForRoute(pathname: string) {
    set((state) => {
      const newConfigs = { ...state.ui.fabConfigs };
      delete newConfigs[pathname];
      logger.debug('FAB', 'Config limpiada', { pathname });
      return {
        ui: { ...state.ui, fabConfigs: newConfigs },
      };
    });
  },

  clearAllFabConfigs() {
    set((state) => ({
      ui: { ...state.ui, fabConfigs: {} },
    }));
    logger.debug('FAB', 'Todas las configs limpiadas');
  },

  addAlerta(alerta) {
    const id = `alerta-${Date.now()}-${Math.random()}`;
    set((state) => ({
      ui: {
        ...state.ui,
        alertas: [...state.ui.alertas, { ...alerta, id }],
      },
    }));

    if (alerta.duracion) {
      setTimeout(() => {
        get().removeAlerta(id);
      }, alerta.duracion);
    }
  },

  removeAlerta(id) {
    set((state) => ({
      ui: {
        ...state.ui,
        alertas: state.ui.alertas.filter((a) => a.id !== id),
      },
    }));
  },

  clearAlertas() {
    set((state) => ({
      ui: { ...state.ui, alertas: [] },
    }));
  },

  setLoading(activo, mensaje) {
    set((state) => ({
      ui: {
        ...state.ui,
        loading: { activo, mensaje },
      },
    }));
  },

  setModal(modalKey, visible, data) {
    set((state) => ({
      ui: {
        ...state.ui,
        modals: {
          ...state.ui.modals,
          [modalKey]: { visible, data },
        },
      },
    }));
  },
});
