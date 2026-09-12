import { logger } from '../monitoreo';
import { validar_ruta_negocio } from '../rtdb/rutas/ruta_negocio';

export type NegocioCleanup = () => void;

let activeRutaNegocio: string | null = null;
let lifecycleGeneration = 0;
let resetNegocioState: (() => void) | null = null;
let resetNegocioScopedState: (() => void) | null = null;
const registeredCleanups = new Set<NegocioCleanup>();

function runCleanup(cleanup: NegocioCleanup): void {
  try {
    cleanup();
  } catch (error) {
    logger.error(
      'NEGOCIO_LIFECYCLE',
      'Error durante la limpieza de un recurso scoped del negocio',
      error as Error
    );
  }
}

function cleanupRegisteredResources(): void {
  const cleanups = Array.from(registeredCleanups);
  registeredCleanups.clear();
  cleanups.forEach(runCleanup);
}

/**
 * Cambia el negocio activo y destruye, antes de continuar, los recursos del negocio anterior.
 * La operación es síncrona para que ningún nuevo listener se monte durante la ventana de cambio.
 */
export function switchNegocioLifecycle(nextRutaNegocio: string | null): number {
  const normalizedRutaNegocio =
    nextRutaNegocio && validar_ruta_negocio(nextRutaNegocio) ? nextRutaNegocio : null;

  if (normalizedRutaNegocio === activeRutaNegocio) {
    return lifecycleGeneration;
  }

  cleanupRegisteredResources();
  resetNegocioScopedState?.();
  lifecycleGeneration += 1;
  activeRutaNegocio = normalizedRutaNegocio;

  logger.info('NEGOCIO_LIFECYCLE', 'Contexto negocio cambiado; recursos anteriores purgados', {
    rutaNegocio: normalizedRutaNegocio,
    generation: lifecycleGeneration,
  });

  return lifecycleGeneration;
}

/**
 * Cierra sesión y purga todos los recursos registrados, incluidos listeners RTDB y singletons.
 */
export function resetNegocioLifecycle(reason = 'session_reset'): void {
  cleanupRegisteredResources();
  resetNegocioState?.();
  lifecycleGeneration += 1;
  activeRutaNegocio = null;

  logger.info('NEGOCIO_LIFECYCLE', 'Ciclo de vida negocio reseteado', {
    reason,
    generation: lifecycleGeneration,
  });
}

/**
 * Registra una limpieza idempotente. Si el negocio ya no es el activo, no se registra nada.
 */
export function registerNegocioCleanup(rutaNegocio: string, cleanup: NegocioCleanup): () => void {
  if (!validar_ruta_negocio(rutaNegocio)) {
    throw new Error(`No se puede registrar un recurso con rutaNegocio inválida: ${rutaNegocio}`);
  }

  if (activeRutaNegocio !== rutaNegocio) {
    switchNegocioLifecycle(rutaNegocio);
  }

  let registered = true;
  registeredCleanups.add(cleanup);

  return () => {
    if (!registered) return;
    registered = false;
    registeredCleanups.delete(cleanup);
  };
}

export function isCurrentNegocioLifecycle(rutaNegocio: string, generation: number): boolean {
  return (
    activeRutaNegocio === rutaNegocio &&
    lifecycleGeneration === generation &&
    validar_ruta_negocio(rutaNegocio)
  );
}

export function getActiveRutaNegocio(): string | null {
  return activeRutaNegocio;
}

export function registerNegocioStateReset(reset: () => void): () => void {
  resetNegocioState = reset;
  return () => {
    if (resetNegocioState === reset) resetNegocioState = null;
  };
}

export function registerNegocioScopedStateReset(reset: () => void): () => void {
  resetNegocioScopedState = reset;
  return () => {
    if (resetNegocioScopedState === reset) resetNegocioScopedState = null;
  };
}

/**
 * Formato obligatorio para datos persistidos que pertenecen a un negocio.
 * Se usa la rutaNegocio canónica para garantizar unicidad.
 */
export function negocioStorageKey(
  rutaNegocio: string | null | undefined,
  modulo: string,
  clave: string
): string | null {
  if (!rutaNegocio || !validar_ruta_negocio(rutaNegocio)) return null;
  return `@${rutaNegocio}:${modulo}:${clave}`;
}
