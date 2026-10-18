import { get, ref } from 'firebase/database';
import type { Database } from 'firebase/database';
import { validar_ruta_negocio } from '../rtdb/rutas/ruta_negocio';
import { logger } from '../monitoreo';

/**
 * LEY DE SOBERANÍA ESTRUCTURAL RTDB
 * El Aplicable (Categoría Marisquerías) tiene PROHIBIDO escribir o dictar la estructura base
 * del negocio (ej. políticas de impresión, configuración de características, mesas).
 * Esta función únicamente verifica que la Torre de Control (Ecosistema ADI APP)
 * haya inicializado correctamente la estructura del negocio.
 */
export async function ensureNegocioBootstrap(db: Database, rutaNegocio: string): Promise<void> {
  if (!db || !rutaNegocio || !validar_ruta_negocio(rutaNegocio)) {
    logger.warn('VERIFICACION_ESTRUCTURA', 'Instancia de DB o ruta negocio inválida', {
      rutaNegocio,
    });
    return;
  }

  try {
    const carSnap = await get(ref(db, `${rutaNegocio}/caracteristicas`));

    if (!carSnap.exists()) {
      const errMsg = `Violación de Estado: La estructura base del negocio en '${rutaNegocio}' no ha sido aprovisionada por la Torre de Control.`;
      logger.error('VERIFICACION_ESTRUCTURA', errMsg, new Error(errMsg));
      throw new Error(errMsg);
    }

    logger.info('VERIFICACION_ESTRUCTURA', 'Estructura base verificada exitosamente', {
      rutaNegocio,
    });
  } catch (error) {
    const errObj =
      error instanceof Error
        ? error
        : new Error(String(error || 'Error desconocido al verificar estructura'));
    logger.error('VERIFICACION_ESTRUCTURA', 'Fallo al verificar estructura del negocio', errObj, {
      rutaNegocio,
    });
    throw errObj;
  }
}

// Alias canónico en español
export const asegurarArranqueNegocio = ensureNegocioBootstrap;
