/**
 * 💾 PERSISTENCIA DE SESIÓN Y ESTADO ENCENDIDO O(1)
 *
 * Administra la persistencia segura en AsyncStorage del arranque O(1):
 * - Hash unidireccional del código de acceso (nunca en claro).
 * - Control de expiración estricto (< 30 días).
 * - Serialización y recuperación del EstadoEncendido.
 * - Desvinculación atómica bajo confirmación explícita 'DESVINCULAR'.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EstadoEncendido } from './encenderCapacidades';
import { useStore } from '../../store';
import { logger } from '../../monitoreo';

export const CLAVES_SESION_O1 = {
  NEGOCIO_ID: '@sesion:negocio_id',
  SLUG_CATEGORIA: '@sesion:slug_categoria',
  VERSION_NPB_ORIGEN: '@sesion:version_npb_origen',
  CODIGO_ACCESO_HASH: '@sesion:codigo_acceso_hash',
  ROL_ACTIVO: '@sesion:rol_activo',
  TIMESTAMP_ARRANQUE: '@sesion:timestamp_arranque',
  ESTADO_ENCENDIDO: '@sesion:estado_encendido',
  DB_URL_OPERATIVA: '@sesion:db_url_operativa',
} as const;

export const DURACION_MAXIMA_SESION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

/**
 * Genera un hash determinista de 32 bits en hexadecimal del código de acceso
 * para no almacenar credenciales en texto plano.
 */
export function hashCodigoAcceso(codigo: string): string {
  const limpio = codigo.trim().toUpperCase();
  let hash = 0x811c9dc5;
  for (let i = 0; i < limpio.length; i++) {
    hash ^= limpio.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export interface DatosSesionO1 {
  negocio_id: string;
  slug_categoria: string;
  version_npb_origen: number;
  codigo_acceso_hash: string;
  rol_activo: string | null;
  timestamp_arranque: number;
  estadoEncendido: EstadoEncendido | null;
  db_url_operativa?: string;
}

export interface ResultadoLecturaSesionO1 {
  existe: boolean;
  valida: boolean;
  expirada: boolean;
  sesion: DatosSesionO1 | null;
}

export interface GuardarSesionO1Params {
  negocio_id: string;
  slug_categoria: string;
  version_npb_origen: number;
  codigo_acceso: string;
  rol_activo: string | null;
  estadoEncendido: EstadoEncendido;
  db_url_operativa?: string;
  timestamp?: number;
}

/**
 * Guarda de forma atómica la sesión y el EstadoEncendido tras un arranque exitoso.
 */
export async function guardarSesionO1(params: GuardarSesionO1Params): Promise<void> {
  const timestamp = params.timestamp ?? Date.now();
  const codigoHash = hashCodigoAcceso(params.codigo_acceso);
  const estadoJson = JSON.stringify(params.estadoEncendido);

  const pares: [string, string][] = [
    [CLAVES_SESION_O1.NEGOCIO_ID, params.negocio_id],
    [CLAVES_SESION_O1.SLUG_CATEGORIA, params.slug_categoria],
    [CLAVES_SESION_O1.VERSION_NPB_ORIGEN, String(params.version_npb_origen)],
    [CLAVES_SESION_O1.CODIGO_ACCESO_HASH, codigoHash],
    [CLAVES_SESION_O1.ROL_ACTIVO, params.rol_activo || ''],
    [CLAVES_SESION_O1.TIMESTAMP_ARRANQUE, String(timestamp)],
    [CLAVES_SESION_O1.ESTADO_ENCENDIDO, estadoJson],
  ];

  if (params.db_url_operativa) {
    pares.push([CLAVES_SESION_O1.DB_URL_OPERATIVA, params.db_url_operativa]);
  }

  try {
    if (typeof AsyncStorage.multiSet === 'function') {
      await AsyncStorage.multiSet(pares);
    } else {
      for (const [k, v] of pares) {
        await AsyncStorage.setItem(k, v);
      }
    }
  } catch (error) {
    logger.error(
      'PERSISTENCIA_SESION',
      'Error al persistir sesión O(1) en AsyncStorage',
      error as Error
    );
  }
}

/**
 * Lee la sesión persistida, validando su integridad y límite de 30 días.
 */
export async function leerSesionO1(): Promise<ResultadoLecturaSesionO1> {
  try {
    const keys = Object.values(CLAVES_SESION_O1);
    let mapa: Record<string, string | null> = {};

    if (typeof AsyncStorage.multiGet === 'function') {
      const res = await AsyncStorage.multiGet(keys);
      mapa = Object.fromEntries(res);
    } else {
      for (const k of keys) {
        mapa[k] = await AsyncStorage.getItem(k);
      }
    }

    const negocio_id = mapa[CLAVES_SESION_O1.NEGOCIO_ID];
    if (!negocio_id) {
      return { existe: false, valida: false, expirada: false, sesion: null };
    }

    const rawTimestamp = mapa[CLAVES_SESION_O1.TIMESTAMP_ARRANQUE];
    const timestamp_arranque = rawTimestamp ? parseInt(rawTimestamp, 10) : 0;
    const ahora = Date.now();
    const tiempoTranscurrido = ahora - timestamp_arranque;

    // Verificar si pasaron más de 30 días
    if (tiempoTranscurrido > DURACION_MAXIMA_SESION_MS) {
      logger.warn('PERSISTENCIA_SESION', 'Sesión persistida expirada (> 30 días)', {
        timestamp_arranque,
        tiempoTranscurrido,
      });
      return { existe: true, valida: false, expirada: true, sesion: null };
    }

    const rawEstado = mapa[CLAVES_SESION_O1.ESTADO_ENCENDIDO];
    let estadoEncendido: EstadoEncendido | null = null;
    if (rawEstado) {
      try {
        estadoEncendido = JSON.parse(rawEstado) as EstadoEncendido;
      } catch {
        estadoEncendido = null;
      }
    }

    const sesion: DatosSesionO1 = {
      negocio_id,
      slug_categoria: mapa[CLAVES_SESION_O1.SLUG_CATEGORIA] || '',
      version_npb_origen: parseInt(mapa[CLAVES_SESION_O1.VERSION_NPB_ORIGEN] || '1', 10),
      codigo_acceso_hash: mapa[CLAVES_SESION_O1.CODIGO_ACCESO_HASH] || '',
      rol_activo: mapa[CLAVES_SESION_O1.ROL_ACTIVO] || null,
      timestamp_arranque,
      estadoEncendido,
      db_url_operativa: mapa[CLAVES_SESION_O1.DB_URL_OPERATIVA] || undefined,
    };

    return {
      existe: true,
      valida: true,
      expirada: false,
      sesion,
    };
  } catch (error) {
    logger.error('PERSISTENCIA_SESION', 'Error al leer sesión O(1)', error as Error);
    return { existe: false, valida: false, expirada: false, sesion: null };
  }
}

/**
 * Desvincula el negocio y purga por completo el almacenamiento local y el store.
 * Requiere escribir exactamente 'DESVINCULAR' para ejecutarse.
 */
export async function desvincularNegocioO1(confirmacion: string): Promise<boolean> {
  if (confirmacion.trim() !== 'DESVINCULAR') {
    logger.warn(
      'PERSISTENCIA_SESION',
      'Intento de desvinculación rechazado: texto de confirmación no coincide'
    );
    return false;
  }

  try {
    const keys = Object.values(CLAVES_SESION_O1);
    if (typeof AsyncStorage.multiRemove === 'function') {
      await AsyncStorage.multiRemove(keys);
    } else {
      for (const k of keys) {
        await AsyncStorage.removeItem(k);
      }
    }

    // Limpiar claves legacy auxiliares si existieran
    const legacyKeys = [
      '@negocio_id',
      '@slug_categoria',
      '@version_npb_origen',
      '@db_url_operativa',
    ];
    for (const k of legacyKeys) {
      await AsyncStorage.removeItem(k);
    }

    // Purgar estado del store global
    const store = useStore.getState();
    store.setEstadoEncendido(null);
    await store.clearSession();

    logger.info('PERSISTENCIA_SESION', 'Negocio desvinculado exitosamente.');
    return true;
  } catch (error) {
    logger.error('PERSISTENCIA_SESION', 'Error al desvincular negocio', error as Error);
    return false;
  }
}
