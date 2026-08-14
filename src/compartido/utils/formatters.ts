/**
 * 💰 UTILIDADES DE FORMATO
 * Funciones helper para formatear datos de manera consistente
 */

/**
 * Formatea un número como moneda mexicana
 * @param amount - Cantidad a formatear
 * @returns String formateado como $1,500.00
 *
 * @example
 * formatMoney(1500)      // "$1,500.00"
 * formatMoney(150.5)     // "$150.50"
 * formatMoney(undefined) // "$0.00"
 * formatMoney(null)      // "$0.00"
 */
export const formatMoney = (amount: number | undefined | null): string => {
  const num = Number(amount || 0);

  // Guard contra valores inválidos
  if (isNaN(num) || !isFinite(num)) {
    return '$0.00';
  }

  return `$${num.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Formatea un número como moneda sin símbolo de pesos
 * @param amount - Cantidad a formatear
 * @returns String formateado como 1,500.00
 */
export const formatNumber = (amount: number | undefined | null): string => {
  const num = Number(amount || 0);

  if (isNaN(num) || !isFinite(num)) {
    return '0.00';
  }

  return num.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
