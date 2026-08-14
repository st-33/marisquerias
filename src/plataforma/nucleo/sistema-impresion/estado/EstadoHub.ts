/**
 * 📡 ESTADO HUB (Zustand Store)
 *
 * Store reactivo para el estado del Hub Central.
 * Reemplaza el polling de 5 segundos con reactividad instantánea.
 *
 * USO:
 * - devices.tsx llama activarHub() cuando el usuario activa el switch
 * - GestorHub.tsx escucha cambios via useEstadoHub()
 * - El Hub despierta INSTANTÁNEAMENTE sin delay
 *
 * PERSISTENCIA:
 * - Se sincroniza con AsyncStorage para sobrevivir reinicios
 * - AsyncStorage es SOLO para persistencia, Zustand es la fuente de verdad en runtime
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { CanalImpresion, DestinoHub } from '../contratos/tipos';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface EstadoHubStore {
  // Estado
  habilitado: boolean;
  destino: DestinoHub | null;
  idDispositivo: string;
  inicializado: boolean;
  enLinea: boolean;

  // Acciones
  inicializar: () => Promise<void>;
  activarHub: (destino: DestinoHub, idDispositivo?: string) => Promise<void>;
  desactivarHub: () => Promise<void>;
  setDestino: (destino: DestinoHub | null) => Promise<void>;
  setIdDispositivo: (id: string) => Promise<void>;
  setEnLinea: (enLinea: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLAVES ASYNCSTORAGE (compatibilidad con código legacy)
// ═══════════════════════════════════════════════════════════════════════════

const CLAVES = {
  HABILITADO: 'adi_hub_mode_enabled',
  DESTINO: 'adi_hub_destino',
  ID_DISPOSITIVO: 'adi_hub_device_id',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

function generarIdDispositivo(): string {
  const timestamp = Date.now().toString(36);
  const aleatorio = Math.random().toString(36).slice(2, 7);
  return `hub_${timestamp}_${aleatorio}`;
}

/**
 * Convierte destino a canal de impresión
 */
export function destinoACanal(destino: DestinoHub | null): CanalImpresion {
  if (destino === 'venta_crudo') return 'venta_crudo';
  return 'standard';
}

// ═══════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════

export const useEstadoHub = create<EstadoHubStore>((set, get) => ({
  // Estado inicial
  habilitado: false,
  destino: null,
  idDispositivo: 'hub_local',
  inicializado: false,
  enLinea: true,

  /**
   * Inicializa el store desde AsyncStorage
   * Se llama UNA vez al montar el GestorHub
   */
  inicializar: async () => {
    if (get().inicializado) return;

    try {
      const [habilitadoRaw, destinoRaw, idRaw] = await Promise.all([
        AsyncStorage.getItem(CLAVES.HABILITADO),
        AsyncStorage.getItem(CLAVES.DESTINO),
        AsyncStorage.getItem(CLAVES.ID_DISPOSITIVO),
      ]);

      const habilitado = habilitadoRaw === 'true';
      const destino = (destinoRaw as DestinoHub) || null;
      let idDispositivo = idRaw || '';

      // Generar ID si no existe
      if (!idDispositivo) {
        idDispositivo = generarIdDispositivo();
        await AsyncStorage.setItem(CLAVES.ID_DISPOSITIVO, idDispositivo);
      }

      set({
        habilitado,
        destino,
        idDispositivo,
        inicializado: true,
      });

      console.log('[EstadoHub] ✅ Inicializado:', { habilitado, destino, idDispositivo });
    } catch (e) {
      console.error('[EstadoHub] Error al inicializar:', e);
      set({ inicializado: true }); // Marcar como inicializado para evitar loops
    }
  },

  /**
   * Activa el Hub Central
   * Llamado desde devices.tsx cuando el usuario activa el switch
   */
  activarHub: async (destino, idDispositivo) => {
    const id = idDispositivo || get().idDispositivo;

    try {
      // Guardar en AsyncStorage para persistencia
      await Promise.all([
        AsyncStorage.setItem(CLAVES.HABILITADO, 'true'),
        AsyncStorage.setItem(CLAVES.DESTINO, destino),
        AsyncStorage.setItem(CLAVES.ID_DISPOSITIVO, id),
      ]);

      // Actualizar estado (esto dispara re-render en GestorHub)
      set({ habilitado: true, destino, idDispositivo: id });

      console.log('[EstadoHub] 🟢 Hub ACTIVADO:', { destino, id });
    } catch (e) {
      console.error('[EstadoHub] Error al activar:', e);
      throw e;
    }
  },

  /**
   * Desactiva el Hub Central
   */
  desactivarHub: async () => {
    try {
      await AsyncStorage.setItem(CLAVES.HABILITADO, 'false');
      set({ habilitado: false });

      console.log('[EstadoHub] 🔴 Hub DESACTIVADO');
    } catch (e) {
      console.error('[EstadoHub] Error al desactivar:', e);
      throw e;
    }
  },

  /**
   * Cambia el destino del Hub (sin activar/desactivar)
   */
  setDestino: async (destino) => {
    try {
      await AsyncStorage.setItem(CLAVES.DESTINO, destino || '');
      set({ destino });
    } catch (e) {
      console.error('[EstadoHub] Error al cambiar destino:', e);
    }
  },

  /**
   * Cambia el ID del dispositivo
   */
  setIdDispositivo: async (id) => {
    try {
      await AsyncStorage.setItem(CLAVES.ID_DISPOSITIVO, id);
      set({ idDispositivo: id });
    } catch (e) {
      console.error('[EstadoHub] Error al cambiar ID:', e);
    }
  },

  /**
   * Actualiza estado de conexión
   * Llamado por el listener de NetInfo
   */
  setEnLinea: (enLinea) => {
    set({ enLinea });
  },
}));

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para saber si el Hub debe estar activo
 */
export const useHubDebeEstarActivo = () => {
  return useEstadoHub((state) => state.habilitado && state.destino !== null && state.enLinea);
};

/**
 * Hook para obtener el canal de impresión actual
 */
export const useCanalImpresion = (): CanalImpresion => {
  return useEstadoHub((state) => destinoACanal(state.destino));
};

/**
 * Hook para obtener solo la configuración (sin acciones)
 */
export const useConfiguracionHub = () => {
  return useEstadoHub((state) => ({
    habilitado: state.habilitado,
    destino: state.destino,
    idDispositivo: state.idDispositivo,
    enLinea: state.enLinea,
  }));
};
