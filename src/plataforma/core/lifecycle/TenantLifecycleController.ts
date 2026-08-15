import { logger } from '../monitoring';
import { validarRutaTenant } from '../rtdb/rutas/RutaTenant';

export type TenantCleanup = () => void;

let activeTenantPath: string | null = null;
let lifecycleGeneration = 0;
let resetTenantState: (() => void) | null = null;
let resetTenantScopedState: (() => void) | null = null;
const registeredCleanups = new Set<TenantCleanup>();

function runCleanup(cleanup: TenantCleanup): void {
  try {
    cleanup();
  } catch (error) {
    logger.error(
      'TENANT_LIFECYCLE',
      'Error durante la limpieza de un recurso tenant-scoped',
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
 * Cambia el tenant activo y destruye, antes de continuar, los recursos del tenant anterior.
 * La operación es síncrona para que ningún nuevo listener se monte durante la ventana de cambio.
 */
export function switchTenantLifecycle(nextTenantPath: string | null): number {
  const normalizedTenantPath =
    nextTenantPath && validarRutaTenant(nextTenantPath) ? nextTenantPath : null;

  if (normalizedTenantPath === activeTenantPath) {
    return lifecycleGeneration;
  }

  cleanupRegisteredResources();
  resetTenantScopedState?.();
  lifecycleGeneration += 1;
  activeTenantPath = normalizedTenantPath;

  logger.info('TENANT_LIFECYCLE', 'Contexto tenant cambiado; recursos anteriores purgados', {
    tenantPath: normalizedTenantPath,
    generation: lifecycleGeneration,
  });

  return lifecycleGeneration;
}

/**
 * Cierra sesión y purga todos los recursos registrados, incluidos listeners RTDB y singletons.
 */
export function resetTenantLifecycle(reason = 'session_reset'): void {
  cleanupRegisteredResources();
  resetTenantState?.();
  lifecycleGeneration += 1;
  activeTenantPath = null;

  logger.info('TENANT_LIFECYCLE', 'Ciclo de vida tenant reseteado', {
    reason,
    generation: lifecycleGeneration,
  });
}

/**
 * Registra una limpieza idempotente. Si el tenant ya no es el activo, no se registra nada.
 */
export function registerTenantCleanup(tenantPath: string, cleanup: TenantCleanup): () => void {
  if (!validarRutaTenant(tenantPath)) {
    throw new Error(`No se puede registrar un recurso con tenantPath inválido: ${tenantPath}`);
  }

  if (activeTenantPath !== tenantPath) {
    switchTenantLifecycle(tenantPath);
  }

  let registered = true;
  registeredCleanups.add(cleanup);

  return () => {
    if (!registered) return;
    registered = false;
    registeredCleanups.delete(cleanup);
  };
}

export function isCurrentTenantLifecycle(tenantPath: string, generation: number): boolean {
  return (
    activeTenantPath === tenantPath &&
    lifecycleGeneration === generation &&
    validarRutaTenant(tenantPath)
  );
}

export function getActiveTenantPath(): string | null {
  return activeTenantPath;
}

export function registerTenantStateReset(reset: () => void): () => void {
  resetTenantState = reset;
  return () => {
    if (resetTenantState === reset) resetTenantState = null;
  };
}

export function registerTenantScopedStateReset(reset: () => void): () => void {
  resetTenantScopedState = reset;
  return () => {
    if (resetTenantScopedState === reset) resetTenantScopedState = null;
  };
}

/**
 * Formato obligatorio para datos persistidos que pertenecen a un tenant.
 * Se usa el tenantPath canónico porque tenantId por sí solo no garantiza unicidad entre categorías.
 */
export function tenantStorageKey(
  tenantPath: string | null | undefined,
  modulo: string,
  clave: string
): string | null {
  if (!tenantPath || !validarRutaTenant(tenantPath)) return null;
  return `@${tenantPath}:${modulo}:${clave}`;
}
