import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { StateCreator } from 'zustand';
import { logger } from '../../monitoring';
import type { ContratoSesion } from '../../types/contratos';
import { validarRutaTenant, descomponerRutaTenant } from '../../rtdb/rutas/RutaTenant';
import {
  resetTenantLifecycle,
  switchTenantLifecycle,
  tenantStorageKey,
} from '../../lifecycle/TenantLifecycleController';

export type EstadoInstalacion =
  | 'HIDRATANDO'
  | 'SIN_VINCULO'
  | 'VALIDANDO_CODIGO'
  | 'VALIDANDO_DISPOSITIVO'
  | 'VINCULADA'
  | 'BLOQUEADA'
  | 'ERROR';

export const SESION_STORAGE_KEY = '@system:session:active';

export const ESTADO_SESION_INICIAL: ContratoSesion = {
  access_code: null,
  tenantPath: null,
  tenantId: null,
  niche: null,
  category: null,
  rol: null,
};

const getStorage = () => {
  if (Platform.OS === 'web') {
    return {
      setItem: async (k: string, v: string) => sessionStorage.setItem(k, v),
      getItem: async (k: string) => sessionStorage.getItem(k),
      removeItem: async (k: string) => sessionStorage.removeItem(k),
      multiRemove: async (keys: string[]) => keys.forEach((k) => sessionStorage.removeItem(k)),
    };
  }
  return AsyncStorage;
};

export const storage = getStorage();

export function getTenantStorageKey(
  tenantPath: string | null | undefined,
  modulo: string,
  clave: string
): string | null {
  return tenantStorageKey(tenantPath, modulo, clave);
}

export interface AccionesSesion {
  setSession: (sesion: Omit<ContratoSesion, 'usuario'>) => Promise<void>;
  setRol: (rol: string) => void;
  setUsuario: (usuario: ContratoSesion['usuario']) => void;
  setEstadoInstalacion: (estado: EstadoInstalacion) => void;
  clearSession: () => Promise<void>;
}

export type SesionSlice = {
  sesion: ContratoSesion;
  estadoInstalacion: EstadoInstalacion;
} & AccionesSesion;

export const createSesionSlice: StateCreator<SesionSlice, [], [], SesionSlice> = (set, get) => ({
  sesion: ESTADO_SESION_INICIAL,
  estadoInstalacion: 'HIDRATANDO',

  async setSession(sesion) {
    const previousTenantPath = get().sesion.tenantPath;
    if (previousTenantPath !== sesion.tenantPath) {
      switchTenantLifecycle(sesion.tenantPath);
    }

    let resolvedCategory = sesion.category ?? null;
    if (!resolvedCategory && sesion.tenantPath) {
      const iden = descomponerRutaTenant(sesion.tenantPath);
      if (iden) resolvedCategory = iden.categoriaId;
    }

    const newSesion: ContratoSesion = {
      ...sesion,
      category: resolvedCategory,
      usuario: get().sesion.usuario,
    };
    set({ sesion: newSesion });

    try {
      await storage.setItem(
        SESION_STORAGE_KEY,
        JSON.stringify({
          access_code: sesion.access_code,
          tenantPath: sesion.tenantPath,
          tenantId: sesion.tenantId,
          niche: sesion.niche,
          category: resolvedCategory,
          rol: sesion.rol,
        })
      );

      if (sesion.tenantPath && validarRutaTenant(sesion.tenantPath)) {
        set({ estadoInstalacion: 'VINCULADA' });
      } else {
        set({ estadoInstalacion: 'ERROR' });
      }
    } catch (error) {
      logger.error('STORE_SESION', 'Error al persistir sesión', error as Error);
    }
  },

  setRol(rol) {
    set((state) => ({
      sesion: { ...state.sesion, rol },
    }));
  },

  setUsuario(usuario) {
    set((state) => ({
      sesion: { ...state.sesion, usuario },
    }));
  },

  setEstadoInstalacion(estado) {
    set({ estadoInstalacion: estado });
  },

  async clearSession() {
    const previousTenantPath = get().sesion.tenantPath;
    resetTenantLifecycle('clear_session');

    set({
      sesion: ESTADO_SESION_INICIAL,
      estadoInstalacion: 'SIN_VINCULO',
    });

    try {
      const tenantKeys = [
        getTenantStorageKey(previousTenantPath, 'negocio', 'features'),
        getTenantStorageKey(previousTenantPath, 'hardware', 'dispositivos'),
        getTenantStorageKey(previousTenantPath, 'hardware', 'preferidos'),
        getTenantStorageKey(previousTenantPath, 'data-sources', 'config'),
      ].filter((key): key is string => Boolean(key));

      await storage.removeItem(SESION_STORAGE_KEY);
      await storage.removeItem('sesion');
      await storage.removeItem('features');
      await storage.removeItem('hardware_dispositivos');
      await storage.removeItem('hardware_preferidos');
      await storage.removeItem('dataSources');
      await storage.multiRemove(tenantKeys);

      const { deviceBinding } = await import('../../security');
      await deviceBinding.unregisterDevice();

      await storage.removeItem('adi_dispositivo_vinculado');
      logger.info('STORE_SESION', 'Dispositivo desvinculado y estado tenant purgado en logout');
    } catch (error) {
      logger.error('STORE_SESION', 'Error al limpiar sesión', error as Error);
    }
  },
});
