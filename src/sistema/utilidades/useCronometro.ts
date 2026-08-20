/**
 * ⏱️ HOOK DE CRONÓMETRO (TIPO 1)
 *
 * Hook reutilizable para cronómetros en tiempo real.
 *
 * ARQUITECTURA MULTI-TEMPORIZADORES:
 * - TIPO 1 (Pantalla): Cronómetros locales, 100% efímeros, NUNCA se guardan en Firebase
 * - TIPO 2 (Lógica): Cron jobs en Cloud Functions (futuro)
 * - TIPO 3 (Global): Meta-orquestador para limpieza y análisis (futuro)
 *
 * REGLA DE ORO:
 * - Este cronómetro NUNCA escribe en Firebase
 * - Solo lee el timestamp de inicio UNA VEZ
 * - Calcula el tiempo transcurrido cada segundo en el cliente
 *
 * USO:
 * ```typescript
 * const { segundos, minutos, formatoMM_SS } = useCronometro(timestampInicio);
 *
 * return <Text>{formatoMM_SS}</Text>; // "5:32"
 * ```
 */

import { useEffect, useState } from 'react';

export interface CronometroResult {
  /** Segundos transcurridos desde el timestamp de inicio */
  segundos: number;

  /** Minutos transcurridos (Math.floor(segundos / 60)) */
  minutos: number;

  /** Formato MM:SS (ej: "5:32") */
  formatoMM_SS: string;

  /** Formato descriptivo (ej: "Lleva 5 minutos") */
  formatoDescriptivo: string;

  /** Indica si el cronómetro está activo (tiene timestamp válido) */
  activo: boolean;
}

/**
 * Hook de cronómetro en tiempo real
 *
 * @param timestampInicio - Timestamp de inicio en milisegundos (Date.now())
 * @param opciones - Opciones de configuración
 * @returns Objeto con tiempo transcurrido en diferentes formatos
 *
 * @example
 * ```typescript
 * // Cronómetro simple
 * const { formatoMM_SS } = useCronometro(orden.createdAt);
 *
 * // Con límite de tiempo
 * const { segundos, minutos } = useCronometro(item.startedAt);
 * const excedeLimite = minutos >= item.prepMin;
 * ```
 */
export function useCronometro(
  timestampInicio?: number,
  opciones?: {
    /** Intervalo de actualización en ms (default: 1000) */
    intervalo?: number;
    /** Si es false, el cronómetro no se actualizará (útil para pausar) */
    activo?: boolean;
  }
): CronometroResult {
  const [now, setNow] = useState(() => Date.now());
  const intervalo = opciones?.intervalo ?? 1000;
  const activo = opciones?.activo ?? true;

  useEffect(() => {
    // Si no hay timestamp o está inactivo, no hacer nada
    if (!timestampInicio || !activo) {
      return;
    }

    const timer = setInterval(() => {
      setNow(Date.now());
    }, intervalo);

    return () => clearInterval(timer);
  }, [timestampInicio, intervalo, activo]);

  const segundos =
    timestampInicio && activo ? Math.max(0, Math.floor((now - timestampInicio) / 1000)) : 0;

  // Calcular minutos
  const minutos = Math.floor(segundos / 60);
  const segs = segundos % 60;

  // Formato MM:SS
  const formatoMM_SS = `${minutos}:${segs.toString().padStart(2, '0')}`;

  // Formato descriptivo
  const formatoDescriptivo =
    minutos === 0 ? `${segundos} segundos` : minutos === 1 ? `1 minuto` : `${minutos} minutos`;

  return {
    segundos,
    minutos,
    formatoMM_SS,
    formatoDescriptivo,
    activo: !!timestampInicio && activo,
  };
}

/**
 * Hook de cronómetro con límite de tiempo
 *
 * Útil para items de cocina que tienen un tiempo límite de preparación.
 *
 * @param timestampInicio - Timestamp de inicio
 * @param limiteMinutos - Límite de tiempo en minutos
 * @returns Objeto con tiempo transcurrido y estado de límite
 *
 * @example
 * ```typescript
 * const { formatoMM_SS, excedeLimite, porcentaje } = useCronometroConLimite(
 *   item.startedAt,
 *   item.prepMin
 * );
 *
 * return (
 *   <View style={{ backgroundColor: excedeLimite ? 'red' : 'green' }}>
 *     <Text>{formatoMM_SS}</Text>
 *     <Text>{porcentaje}%</Text>
 *   </View>
 * );
 * ```
 */
export function useCronometroConLimite(timestampInicio?: number, limiteMinutos?: number) {
  const cronometro = useCronometro(timestampInicio);

  if (!limiteMinutos) {
    return {
      ...cronometro,
      excedeLimite: false,
      porcentaje: 0,
      tiempoRestante: 0,
    };
  }

  const limiteSegundos = limiteMinutos * 60;
  const excedeLimite = cronometro.segundos >= limiteSegundos;
  const porcentaje = Math.min(100, Math.floor((cronometro.segundos / limiteSegundos) * 100));
  const tiempoRestante = Math.max(0, limiteSegundos - cronometro.segundos);

  return {
    ...cronometro,
    excedeLimite,
    porcentaje,
    tiempoRestante,
    limiteSegundos,
  };
}
