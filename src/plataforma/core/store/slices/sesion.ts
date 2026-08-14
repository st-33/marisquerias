import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { StateCreator } from 'zustand';
import { logger } from '../../monitoring';
import type { ContratoSesion } from '../../types/contratos';
import { validarRutaTenant, descomponerRutaTenant } from '../../rtdb/rutas/RutaTenant';

export type EstadoInstalacion =
  | 'HIDRATANDO'
  | 'SIN_VINCULO'
  | 'VALIDANDO_CODIGO'
  | 'VALIDANDO_DISPOSITIVO'
  | 'VINCULADA'
  | 'BLOQUEADA'
  | 'ERROR';

// Adapter for storage
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
  sesion: {
    access_code: null,
    tenantPath: null,
    tenantId: null,
    niche: null,
    category: null,
    rol: null,
  },
  estadoInstalacion: 'HIDRATANDO',

  async setSession(sesion) {
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
        'sesion',
        JSON.stringify({
          access_code: sesion.access_code,
          tenantPath: sesion.tenantPath,
          tenantId: sesion.tenantId,
          niche: sesion.niche,
          category: resolvedCategory,
          rol: sesion.rol,
        })
      );

      // Actualizar estado instalación basado en validez de ruta
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
    set({
      sesion: {
        access_code: null,
        tenantPath: null,
        tenantId: null,
        niche: null,
        category: null,
        rol: null,
      },
      estadoInstalacion: 'SIN_VINCULO',
    });

    try {
      await storage.removeItem('sesion');
      await storage.removeItem('features');
      const { deviceBinding } = await import('../../security');
      await deviceBinding.unregisterDevice();

      // Desvincular localmente
      await storage.removeItem('adi_dispositivo_vinculado');

      logger.info('STORE_SESION', 'Dispositivo desvinculado en logout');
    } catch (error) {
      logger.error('STORE_SESION', 'Error al limpiar sesión', error as Error);
    }
  },
});
