/**
 * 📡 MONITOR DE CONEXIÓN Y DEGRADACIÓN OFFLINE O(1)
 *
 * Responsabilidades:
 * 1. Indicación de conectividad e indicador visual "Sin conexión — los cambios se sincronizarán al reconectar".
 * 2. Degradación controlada: permite arranque offline únicamente si existe una sesión válida previa.
 */

import type { Database } from 'firebase/database';
import { leerSesionO1 } from '../npb/persistenciaSesionO1';
import { PLANTILLA_CATEGORIA_MARISQUERIAS } from '../npb/encenderCapacidades';
import { ejecutarArranqueO1, type ResultadoArranqueO1 } from '../useArranqueSistema';
import { clasificarErrorArranque } from '../npb/erroresArranque';
import { logger } from '../../monitoreo';

/**
 * Orquesta el arranque con tolerancia y degradación offline:
 * - Si hay red: ejecuta el arranque normal O(1).
 * - Si no hay red:
 *   - Si es el primer arranque (sin sesión previa válida): Falla bloqueante con variante "sin_conexion".
 *   - Si existe sesión previa válida (< 30 días): Permite el arranque en modo offline con datos cacheados.
 */
export async function arrancarConDegradacionOffline(
  db: Database,
  codigoAcceso: string,
  forzarRedCaida = false
): Promise<ResultadoArranqueO1 & { offline?: boolean }> {
  if (forzarRedCaida) {
    return procesarFalloRed(new Error('Sin conexión. Revisa tu red y reintenta.'));
  }

  try {
    const resultado = await ejecutarArranqueO1(db, codigoAcceso);
    if (!resultado.ok) {
      const rawError = resultado.error.toLowerCase();
      if (
        rawError.includes('network') ||
        rawError.includes('conexión') ||
        rawError.includes('sin conexión') ||
        rawError.includes('offline') ||
        rawError.includes('failed to fetch')
      ) {
        return await procesarFalloRed(new Error(resultado.error));
      }
    }
    return resultado;
  } catch (error) {
    return await procesarFalloRed(error);
  }
}

async function procesarFalloRed(
  error: unknown
): Promise<ResultadoArranqueO1 & { offline?: boolean }> {
  const infoError = clasificarErrorArranque(error);

  const lectura = await leerSesionO1();

  if (lectura.valida && lectura.sesion && lectura.sesion.estadoEncendido) {
    logger.info('MONITOR_CONEXION', 'Arranque offline exitoso utilizando sesión válida persistida');
    return {
      ok: true,
      offline: true,
      negocio: {
        negocio_id: lectura.sesion.negocio_id,
        categoria_id: lectura.sesion.slug_categoria,
        slug_categoria: lectura.sesion.slug_categoria,
        ruta_configuracion_secundaria: lectura.sesion.ruta_configuracion_secundaria,
        cliente_id: 'offline-cached',
      },
      npb: PLANTILLA_CATEGORIA_MARISQUERIAS,
      estadoEncendido: lectura.sesion.estadoEncendido,
      rolPorDefecto:
        (lectura.sesion.rol_activo as any) ||
        lectura.sesion.estadoEncendido.roles_activos[0] ||
        'mesero',
      rutaPorDefecto: '/_role/roles',
      requiereSeleccionRol: lectura.sesion.estadoEncendido.roles_activos.length > 1,
    };
  }

  return {
    ok: false,
    error: infoError.mensaje,
    errorInfo: infoError,
  };
}

export const MENSAJE_BANNER_SIN_CONEXION =
  'Sin conexión — los cambios se sincronizarán al reconectar';
