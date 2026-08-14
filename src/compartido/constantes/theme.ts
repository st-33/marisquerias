/**
 * 🎨 SISTEMA DE DISEÑO UNIFICADO
 * Tema centralizado para consistencia visual absoluta
 * NO MÁS HARDCODED VALUES
 */

export const COLORS = {
  // Identidad de marca
  primary: '#4f7cff',
  primaryDark: '#3b5dd9',
  primaryLight: '#6b8fff',

  // Estados
  success: '#10b981',
  successDark: '#059669',
  warning: '#f59e0b',
  warningDark: '#d97706',
  error: '#ef4444',
  errorDark: '#dc2626',
  info: '#3b82f6',

  // Backgrounds
  bg: {
    primary: '#0f172a', // Background principal oscuro
    secondary: '#141824', // Cards y elementos elevados
    tertiary: '#1a1f2e', // Items en listas
    elevated: '#1e2330', // Borders y divisores
    surface: '#111827', // Headers
  },

  // Texto
  text: {
    primary: '#ffffff',
    secondary: '#cbd5e1',
    tertiary: '#94a3b8',
    muted: '#64748b',
    inverse: '#0f172a',
  },

  // Estados de mesa
  table: {
    free: '#10b981',
    occupied: '#ef4444',
    billing: '#f59e0b',
  },

  // Transparencias
  alpha: {
    primary10: 'rgba(79, 124, 255, 0.1)',
    primary20: 'rgba(79, 124, 255, 0.2)',
    success10: 'rgba(16, 185, 129, 0.1)',
    success20: 'rgba(16, 185, 129, 0.2)',
    warning10: 'rgba(245, 158, 11, 0.1)',
    warning20: 'rgba(245, 158, 11, 0.2)',
    error10: 'rgba(239, 68, 68, 0.1)',
    black30: 'rgba(0, 0, 0, 0.3)',
    black50: 'rgba(0, 0, 0, 0.5)',
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 12,
  xl: 14,
  full: 9999,
} as const;

export const TYPOGRAPHY = {
  sizes: {
    xs: 10,
    sm: 11,
    base: 13,
    md: 14,
    lg: 15,
    xl: 16,
    xxl: 18,
    xxxl: 22,
    display: 30,
  },
  weights: {
    regular: '400' as const,
    medium: '600' as const,
    semibold: '700' as const,
    bold: '800' as const,
    black: '900' as const,
  },
} as const;

export const SHADOWS = {
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
    shadowColor: '#4f7cff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  success: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  warning: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

export const ANIMATION = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    inOut: 'ease-in-out',
    out: 'ease-out',
    in: 'ease-in',
  },
} as const;

// Helper types
export type ColorKey = keyof typeof COLORS;
export type SpacingKey = keyof typeof SPACING;
export type RadiusKey = keyof typeof RADIUS;
