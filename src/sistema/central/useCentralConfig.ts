/**
 * 🪝 HOOKS DE CONFIGURACIÓN Y ESTADO DE UNIDAD CENTRAL
 *
 * Expone la configuración y estado de Central y evalúa capacidades estructurales.
 * Si Central desactiva capacidades (ej. reparto: false o mostrador: false),
 * la UI reacciona y oculta los módulos correspondientes.
 */

import { useMemo } from 'react';
import { useStore } from '../store';
import type {
  CentralConfiguracion,
  CentralEstado,
} from '../store/slices/central';

/**
 * Evalúa si una capacidad estructural está habilitada por Central.
 *
 * REGLA DE ORO 1: CERO BLOQUEOS SÍNCRONOS.
 * Si no hay configuración o Central no responde, la capacidad se asume habilitada
 * para permitir la venta local ininterrumpida. Solo se deshabilita si Central
 * lo indica explícitamente como false o si el estado está bloqueado / inactivo.
 */
export function estaCapacidadHabilitadaPorCentral(
  configuracion: CentralConfiguracion | null | undefined,
  estado: CentralEstado | null | undefined,
  capacidad: string
): boolean {
  // 1. Si Central indica que el negocio está inactivo o bloqueado
  if (estado?.activo === false || estado?.bloqueado === true) {
    return false;
  }

  // 2. Si no hay configuración aún, la operación local no se detiene
  if (!configuracion) {
    return true;
  }

  // 3. Evaluar dentro de `configuracion.capacidades[capacidad]` si existe
  if (
    configuracion.capacidades &&
    typeof configuracion.capacidades[capacidad] === 'boolean'
  ) {
    return configuracion.capacidades[capacidad]!;
  }

  // 4. Evaluar en el nodo raíz de `configuracion[capacidad]`
  if (typeof configuracion[capacidad] === 'boolean') {
    return configuracion[capacidad];
  }

  // Por defecto, habilitado
  return true;
}

/**
 * Hook para obtener la configuración completa de Central
 */
export function useCentralConfig(): CentralConfiguracion | null {
  return useStore((s) => s.central.configuracion);
}

/**
 * Hook para obtener el estado del negocio reportado por Central
 */
export function useCentralEstado(): CentralEstado | null {
  return useStore((s) => s.central.estado);
}

/**
 * Hook reactivo para verificar si una capacidad estructural está habilitada por Central.
 * La UI se re-renderiza automáticamente si Central emite un cambio.
 */
export function useCapacidadCentral(capacidad: string): boolean {
  const configuracion = useStore((s) => s.central.configuracion);
  const estado = useStore((s) => s.central.estado);

  return useMemo(
    () => estaCapacidadHabilitadaPorCentral(configuracion, estado, capacidad),
    [configuracion, estado, capacidad]
  );
}
