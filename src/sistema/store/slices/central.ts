import type { StateCreator } from 'zustand';

export interface CentralCapacidades {
  reparto?: boolean;
  mostrador?: boolean;
  mesas?: boolean;
  cocina?: boolean;
  inventario?: boolean;
  [key: string]: any;
}

export interface CentralConfiguracion {
  capacidades?: CentralCapacidades;
  reparto?: boolean;
  mostrador?: boolean;
  mesas?: boolean;
  cocina?: boolean;
  inventario?: boolean;
  [key: string]: any;
}

export interface CentralEstado {
  activo?: boolean;
  bloqueado?: boolean;
  motivo?: string;
  [key: string]: any;
}

export interface CentralSliceState {
  configuracion: CentralConfiguracion | null;
  estado: CentralEstado | null;
  cargando: boolean;
  error: string | null;
}

export interface AccionesCentral {
  setCentralConfiguracion: (configuracion: CentralConfiguracion | null) => void;
  setCentralEstado: (estado: CentralEstado | null) => void;
  setCentralError: (error: string | null) => void;
  resetCentral: () => void;
}

export type CentralSlice = {
  central: CentralSliceState;
} & AccionesCentral;

export const ESTADO_INICIAL_CENTRAL: CentralSliceState = {
  configuracion: null,
  estado: null,
  cargando: false,
  error: null,
};

export const createCentralSlice: StateCreator<CentralSlice, [], [], CentralSlice> = (set) => ({
  central: ESTADO_INICIAL_CENTRAL,

  setCentralConfiguracion: (configuracion) =>
    set((state) => ({
      central: { ...state.central, configuracion, cargando: false, error: null },
    })),

  setCentralEstado: (estado) =>
    set((state) => ({
      central: { ...state.central, estado, cargando: false, error: null },
    })),

  setCentralError: (error) =>
    set((state) => ({
      central: { ...state.central, error, cargando: false },
    })),

  resetCentral: () =>
    set({
      central: ESTADO_INICIAL_CENTRAL,
    }),
});
