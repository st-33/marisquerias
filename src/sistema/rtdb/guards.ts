import { validar_ruta_negocio, type OpcionesValidarRutaNegocio } from './rutas/ruta_negocio';

export function assert_valid_ruta_negocio(
  ruta_negocio: string | null | undefined,
  opciones?: OpcionesValidarRutaNegocio
): asserts ruta_negocio is string {
  if (
    ruta_negocio === undefined ||
    ruta_negocio === null ||
    !validar_ruta_negocio(ruta_negocio, opciones)
  ) {
    throw new Error(`ruta_negocio inválida o ausente: ${String(ruta_negocio)}`);
  }
}

export function assertValidRutaNegocio(
  rutaNegocio: string | null | undefined,
  opciones?: OpcionesValidarRutaNegocio
): asserts rutaNegocio is string {
  assert_valid_ruta_negocio(rutaNegocio, opciones);
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
