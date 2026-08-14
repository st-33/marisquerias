import type React from 'react';

export interface ScreenRegistroEntrada {
  /** Componente React puro que actúa como vista presentacional */
  Screen: React.ComponentType<any>;
  /** Hook opcional del cerebro/dominio que provee la lógica a la vista */
  useLogic?: (...args: any[]) => any;
  /** Props estáticas adicionales para la vista */
  staticProps?: Record<string, any>;
}

export interface ScreenResuelto {
  Screen: React.ComponentType<any> | null;
  props: Record<string, any>;
  loading: boolean;
  error: string | null;
  niche: string | null;
  category: string | null;
}

/**
 * Estructura del Registro de Screens:
 * Rol -> NichoID -> ScreenRegistroEntrada O Map de Categorías -> ScreenRegistroEntrada
 *
 * Ejemplo:
 * {
 *   cocina: {
 *     '2 alimentos_y_bebidas': { Screen: KitchenKDS, useLogic: useCocinaLogic }
 *   },
 *   mostrador: {
 *     '2 alimentos_y_bebidas': {
 *       default: { Screen: MostradorScreen, useLogic: useMostradorPro },
 *       marisquerias: { Screen: MostradorMarisqueria, useLogic: useMostradorPro }
 *     }
 *   }
 * }
 */
export type TargetNichoEntrada =
  | ScreenRegistroEntrada
  | ({ default?: ScreenRegistroEntrada } & Record<string, ScreenRegistroEntrada>);

export type ScreenRegistro = Record<string, Record<string, TargetNichoEntrada>>;
