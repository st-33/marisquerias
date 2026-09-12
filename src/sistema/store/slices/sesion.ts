import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { StateCreator } from 'zustand';
import { logger } from '../../monitoreo';
import type { ContratoSesion } from '../../../sistema/tipos/contratos';
import {
  validar_ruta_negocio,
  descomponer_ruta_negocio,
  extraer_negocio_id_canonico,
} from '../../rtdb/rutas/ruta_negocio';
import {
  resetNegocioLifecycle,
  switchNegocioLifecycle,
  negocioStorageKey,
} from '../../ciclo_de_vida/NegocioLifecycleController';

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
  rutaNegocio: null,
  negocioId: null,
  niche: null,
  category: null,
  rol: null,
  negocio_id: null,
  ruta_negocio: null,
  categoria_id: null,
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

export function getNegocioStorageKey(
  rutaNegocio: string | null | undefined,
  modulo: string,
  clave: string
): string | null {
  return negocioStorageKey(rutaNegocio, modulo, clave);
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
    const resolvedRutaNegocio = sesion.ruta_negocio || sesion.rutaNegocio || null;
    const previousRutaNegocio = get().sesion.ruta_negocio || get().sesion.rutaNegocio;
    if (previousRutaNegocio !== resolvedRutaNegocio) {
      switchNegocioLifecycle(resolvedRutaNegocio);
    }

    let resolvedCategory = sesion.categoria_id || sesion.category || null;
    let resolvedNegocioId = sesion.negocio_id || null;

    if (resolvedRutaNegocio) {
      const iden = descomponer_ruta_negocio(resolvedRutaNegocio);
      if (iden) {
        if (!resolvedCategory) resolvedCategory = iden.categoria_id || iden.categoriaId;
        if (!resolvedNegocioId) resolvedNegocioId = iden.negocio_id_canonico;
      }
    }

    if (!resolvedNegocioId && (sesion.negocio_id || sesion.negocioId)) {
      resolvedNegocioId = extraer_negocio_id_canonico(
        (sesion.negocio_id || sesion.negocioId)!,
        resolvedCategory || undefined
      );
    }

    const legacyNegocioId = sesion.negocioId || resolvedNegocioId;

    const newSesion: ContratoSesion = {
      ...sesion,
      rutaNegocio: resolvedRutaNegocio,
      ruta_negocio: resolvedRutaNegocio,
      negocioId: legacyNegocioId,
      negocio_id: resolvedNegocioId || legacyNegocioId,
      category: resolvedCategory,
      categoria_id: resolvedCategory,
      usuario: get().sesion.usuario,
    };
    set({ sesion: newSesion });

    try {
      await storage.setItem(
        SESION_STORAGE_KEY,
        JSON.stringify({
          access_code: newSesion.access_code,
          rutaNegocio: newSesion.rutaNegocio,
          ruta_negocio: newSesion.ruta_negocio,
          negocioId: newSesion.negocioId,
          negocio_id: newSesion.negocio_id,
          niche: newSesion.niche,
          category: newSesion.category,
          categoria_id: newSesion.categoria_id,
          rol: newSesion.rol,
        })
      );

      if (newSesion.ruta_negocio && validar_ruta_negocio(newSesion.ruta_negocio)) {
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
    const previousRutaNegocio = get().sesion.rutaNegocio;
    resetNegocioLifecycle('clear_session');

    set({
      sesion: ESTADO_SESION_INICIAL,
      estadoInstalacion: 'SIN_VINCULO',
    });

    try {
      const negocioKeys = [
        getNegocioStorageKey(previousRutaNegocio, 'negocio', 'features'),
        getNegocioStorageKey(previousRutaNegocio, 'hardware', 'dispositivos'),
        getNegocioStorageKey(previousRutaNegocio, 'hardware', 'preferidos'),
        getNegocioStorageKey(previousRutaNegocio, 'data-sources', 'config'),
      ].filter((key): key is string => Boolean(key));

      await storage.removeItem(SESION_STORAGE_KEY);
      await storage.removeItem('sesion');
      await storage.removeItem('features');
      await storage.removeItem('hardware_dispositivos');
      await storage.removeItem('hardware_preferidos');
      await storage.removeItem('dataSources');
      await storage.multiRemove(negocioKeys);

      const { deviceBinding } = await import('../../seguridad');
      await deviceBinding.unregisterDevice();

      await storage.removeItem('adi_dispositivo_vinculado');
      logger.info('STORE_SESION', 'Dispositivo desvinculado y estado negocio purgado en logout');
    } catch (error) {
      logger.error('STORE_SESION', 'Error al limpiar sesión', error as Error);
    }
  },
});
