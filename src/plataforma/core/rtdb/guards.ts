import { validarRutaTenant } from './rutas/RutaTenant';

export function assertValidTenantPath(
  tenantPath: string | null | undefined
): asserts tenantPath is string {
  if (!tenantPath || !validarRutaTenant(tenantPath)) {
    throw new Error(`tenantPath inválido o ausente: ${String(tenantPath)}`);
  }
}

export function sanitizeRtdbPayload<T>(value: T): T {
  if (value === undefined) return undefined as T;
  if (value === null) return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeRtdbPayload(item)).filter((item) => item !== undefined) as T;
  }

  if (typeof value === 'object' && (value as object).constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
      const sanitizedValue = sanitizeRtdbPayload(rawValue);
      if (sanitizedValue !== undefined) result[key] = sanitizedValue;
    }
    return result as T;
  }

  return value;
}
