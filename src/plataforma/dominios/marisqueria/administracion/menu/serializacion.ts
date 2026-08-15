/**
 * Serialización defensiva de payloads del menú.
 * Firebase RTDB rechaza valores undefined; se omiten antes de persistir.
 */
export function limpiarUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => limpiarUndefined(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === 'object') {
    const resultado: Record<string, unknown> = {};

    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (item === undefined) return;
      resultado[key] = limpiarUndefined(item);
    });

    return resultado as T;
  }

  return value;
}
