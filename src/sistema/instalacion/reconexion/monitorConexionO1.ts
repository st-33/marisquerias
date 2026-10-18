/**
 * 📡 MONITOR DE CONEXIÓN Y REVALIDACIÓN DE NPB O(1)
 *
 * Responsabilidades:
 * 1. Indicación de conectividad e indicador visual "Sin conexión — los cambios se sincronizarán al reconectar".
 * 2. Degradación controlada: permite arranque offline únicamente si existe una sesión válida previa.
 * 3. Revalidación al reconectar: detecta si Torre de Control subió la versión del NPB
 *    y emite advertencia de reinicio manual sin recargar en caliente.
 */

import type { Database } from 'firebase/database';
import { get, ref } from 'firebase/database';
import { leerSesionO1 } from '../npb/persistenciaSesionO1';
import { ejecutarArranqueO1, type ResultadoArranqueO1 } from '../useArranqueSistema';
import { clasificarErrorArranque } from '../npb/erroresArranque';
import { logger } from '../../monitoreo';

export interface ResultadoRevalidacionNPB {
  versionCambio: boolean;
  versionActual: number;
  nuevaVersion?: number;
  aviso?: string;
}

/**
 * Revalida si la plantilla del negocio fue actualizada a una versión superior en Unidad Secundaria.
 */
export async function revalidarVersionNPB(
  db: Database,
  slugCategoria: string,
  versionActual: number
): Promise<ResultadoRevalidacionNPB> {
  try {
    const cleanSlug = slugCategoria.trim().replace(/^\/+|\/+$/g, '');
    const ruta = `${cleanSlug}/Negocio principal de categoría`;
    const snapshot = await get(ref(db, ruta));

    if (!snapshot.exists()) {
      return { versionCambio: false, versionActual };
    }

    const npbRemoto = snapshot.val() as { version_npb?: number };
    const versionRemota = npbRemoto.version_npb ?? versionActual;

    if (versionRemota !== versionActual) {
      const aviso = `El negocio fue actualizado a NPB v${versionRemota}. Reinicia la app para aplicar cambios.`;
      logger.warn('MONITOR_CONEXION', 'Cambio de versión de NPB detectado', {
        versionActual,
        versionRemota,
      });
      return {
        versionCambio: true,
        versionActual,
        nuevaVersion: versionRemota,
        aviso,
      };
    }

    return { versionCambio: false, versionActual };
  } catch (error) {
    logger.warn(
      'MONITOR_CONEXION',
      'No se pudo revalidar versión remota del NPB (modo sin conexión)',
      { error: (error as Error).message }
    );
    return { versionCambio: false, versionActual };
  }
}

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

  // Comprobar si existe una sesión previa válida en almacenamiento local
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
        version_npb_origen: lectura.sesion.version_npb_origen,
        cliente_id: 'offline-cached',
      },
      npb: {
        categoria_id: lectura.sesion.slug_categoria,
        slug_categoria: lectura.sesion.slug_categoria,
        version_npb: lectura.sesion.version_npb_origen,
        estado: 'sellado',
        roles_dispositivo: lectura.sesion.estadoEncendido.roles_activos.map((r) => ({
          id: r,
          pantallas_visibles: [],
        })),
        capacidades: lectura.sesion.estadoEncendido.capacidades_activas.map((c) => ({
          id: c,
          configuracion_giro: 'offline',
        })),
        cajones_activos: lectura.sesion.estadoEncendido.cajones_activos,
        cajones_desactivados_justificacion: {},
      },
      estadoEncendido: lectura.sesion.estadoEncendido,
      rolPorDefecto:
        (lectura.sesion.rol_activo as any) ||
        lectura.sesion.estadoEncendido.roles_activos[0] ||
        'mesero',
      rutaPorDefecto: '/_role/roles',
      requiereSeleccionRol: lectura.sesion.estadoEncendido.roles_activos.length > 1,
    };
  }

  // Primer arranque sin sesión previa: fallo bloqueante
  return {
    ok: false,
    error: infoError.mensaje,
    errorInfo: infoError,
  };
}

export const MENSAJE_BANNER_SIN_CONEXION =
  'Sin conexión — los cambios se sincronizarán al reconectar';
