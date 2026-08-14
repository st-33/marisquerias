/**
 * 🎨 COLORES TEMÁTICOS - BRIDGE
 * Hook que retorna COLORS adaptados al tema activo (elite/default)
 * Mantiene la misma estructura que constants/theme.ts para compatibilidad
 */

import { useMemo } from 'react';
import { useAppTheme } from '../temas';

/**
 * Hook para obtener colores temáticos
 * Usa el mismo formato que constants/theme.ts COLORS
 */
export function useThemedColors() {
  const { colors, isElite } = useAppTheme();

  return useMemo(
    () => ({
      // Identidad de marca - DINÁMICO
      primary: colors.primary,
      primaryDark: colors.secondary,
      primaryLight: colors.primaryLight,

      // Estados - MANTENER CONSISTENTES
      success: colors.success,
      successDark: '#059669',
      warning: colors.warning,
      warningDark: '#d97706',
      error: colors.error,
      errorDark: '#dc2626',
      info: colors.primary,

      // Backgrounds - DINÁMICO
      bg: {
        primary: colors.background,
        secondary: colors.surface,
        tertiary: colors.card,
        elevated: colors.borderLight,
        surface: colors.surfaceDark,
      },

      // Texto - DINÁMICO
      text: {
        primary: colors.text,
        secondary: colors.textSecondary,
        tertiary: colors.textMuted,
        muted: colors.textMuted,
        inverse: colors.background,
      },

      // Estados de mesa - MANTENER
      table: {
        free: colors.success,
        occupied: colors.error,
        billing: colors.warning,
      },

      // Transparencias - CALCULADAS según tema
      alpha: {
        primary10: isElite ? 'rgba(197, 160, 89, 0.1)' : 'rgba(37, 99, 235, 0.1)',
        primary20: isElite ? 'rgba(197, 160, 89, 0.2)' : 'rgba(37, 99, 235, 0.2)',
        success10: 'rgba(16, 185, 129, 0.1)',
        success20: 'rgba(16, 185, 129, 0.2)',
        warning10: 'rgba(245, 158, 11, 0.1)',
        warning20: 'rgba(245, 158, 11, 0.2)',
        error10: 'rgba(239, 68, 68, 0.1)',
        black30: 'rgba(0, 0, 0, 0.3)',
        black50: 'rgba(0, 0, 0, 0.5)',
      },
    }),
    [colors, isElite]
  );
}

/**
 * Hook para obtener sombras temáticas
 */
export function useThemedShadows() {
  const { colors, isElite } = useAppTheme();

  return useMemo(
    () => ({
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
      md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      },
      lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
      },
      primary: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isElite ? 0.4 : 0.3,
        shadowRadius: 8,
        elevation: 6,
      },
      success: {
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      },
      warning: {
        shadowColor: colors.warning,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
    [colors, isElite]
  );
}
