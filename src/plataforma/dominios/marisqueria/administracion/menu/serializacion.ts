import { getVariantOptionLabel } from '../../../../base/_persistencia/menu.repo';

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

/**
 * Garantiza que cada opción conserve un nombre legible además de su key interna.
 * `titulo` se mantiene como compatibilidad con consumidores históricos.
 */
export function normalizarVariantes(variantes?: Record<string, any>): Record<string, any> {
  const cleaned = limpiarUndefined(variantes || {});
  const grupos = cleaned?.grupos;

  if (!grupos || typeof grupos !== 'object') return cleaned;

  const gruposNormalizados: Record<string, any> = {};
  Object.entries(grupos).forEach(([groupKey, rawGroup]) => {
    if (!rawGroup || typeof rawGroup !== 'object') return;

    const opcionesNormalizadas: Record<string, any> = {};
    Object.entries((rawGroup as any).opciones || {}).forEach(([optionKey, rawOption]) => {
      const option =
        typeof rawOption === 'string'
          ? { label: rawOption.trim(), titulo: rawOption.trim() }
          : { ...(rawOption as Record<string, any>) };
      const label = getVariantOptionLabel(option, optionKey);

      opcionesNormalizadas[optionKey] = {
        ...option,
        label,
        titulo: option.titulo?.trim() || label,
      };
    });

    gruposNormalizados[groupKey] = {
      ...(rawGroup as Record<string, any>),
      opciones: opcionesNormalizadas,
    };
  });

  return { ...cleaned, grupos: gruposNormalizados };
}
