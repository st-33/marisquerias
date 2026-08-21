/**
 * 🎨 GLOBAL THEME SYSTEM
 * Sistema de temas dinámico por categoría con colores globales.
 * Compatible con todos los módulos existentes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform } from 'react-native';
import { descomponerRutaTenant } from '../../sistema/rtdb/rutas/RutaTenant';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════
export type ThemeType = 'elite' | 'default';

export interface ThemeColors {
  // Fondo
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceDark: string;
  card: string;

  // Acentos
  primary: string;
  primaryLight: string;
  secondary: string;
  accent: string;

  // Cristal
  glass: string;

  // Texto
  text: string;
  textSecondary: string;
  textMuted: string;

  // Bordes
  border: string;
  borderLight: string;

  // Estados
  success: string;
  error: string;
  danger: string;
  warning: string;

  // Sombras
  shadow: string;
  shadowDark: string;
}

export interface AppTheme {
  id: ThemeType;
  name: string;
  colors: ThemeColors;
  scale: number;
  screenWidth: number;
  screenHeight: number;
  hasLiquidBackground: boolean;
  hasStickers: boolean;
  stickerOpacity: number;
  orbHasHalo: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// TEMA ELITE (Marisquerías)
// ═══════════════════════════════════════════════════════════════════
const SCALE_ELITE = SCREEN_WIDTH < 480 ? 0.85 : SCREEN_WIDTH < 1024 ? 1.0 : 1.4;

const eliteColors: ThemeColors = {
  background: '#050506',
  backgroundSecondary: '#0a0a0c',
  surface: '#111115',
  surfaceDark: '#0a0a0d',
  card: '#1a1a1f',

  primary: '#c5a059',
  primaryLight: '#f5ecd7',
  secondary: '#8e7952',
  accent: '#d4af37',

  glass: 'rgba(15, 15, 18, 0.85)',

  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.75)',
  textMuted: 'rgba(255, 255, 255, 0.5)',

  border: '#2a2520',
  borderLight: '#3d362d',

  success: '#4ade80',
  error: '#ff4d4d',
  danger: '#ff4d4d',
  warning: '#fbbf24',

  shadow: 'rgba(197, 160, 89, 0.2)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',
};

const eliteTheme: AppTheme = {
  id: 'elite',
  name: 'Oro Elite',
  colors: eliteColors,
  scale: SCALE_ELITE,
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  hasLiquidBackground: true,
  hasStickers: true,
  stickerOpacity: 0.12,
  orbHasHalo: true,
};

// ═══════════════════════════════════════════════════════════════════
// TEMA DEFAULT (Otras categorías)
// ═══════════════════════════════════════════════════════════════════
const SCALE_DEFAULT = SCREEN_WIDTH < 480 ? 0.85 : SCREEN_WIDTH < 1024 ? 1.0 : 1.4;

const defaultColors: ThemeColors = {
  background: '#0B101A',
  backgroundSecondary: '#0F172A',
  surface: '#111827',
  surfaceDark: '#0F172A',
  card: '#1F2937',

  primary: '#2563EB',
  primaryLight: '#93c5fd',
  secondary: '#64748b',
  accent: '#F59E0B',

  glass: 'rgba(30, 41, 59, 0.9)',

  text: '#F9FAFB',
  textSecondary: '#CBD5F5',
  textMuted: '#6B7280',

  border: '#1F2937',
  borderLight: '#27324A',

  success: '#10B981',
  error: '#EF4444',
  danger: '#EF4444',
  warning: '#F59E0B',

  shadow: 'rgba(15,23,42,0.45)',
  shadowDark: 'rgba(15,23,42,0.65)',
};

const defaultTheme: AppTheme = {
  id: 'default',
  name: 'Clásico',
  colors: defaultColors,
  scale: SCALE_DEFAULT,
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  hasLiquidBackground: false,
  hasStickers: false,
  stickerOpacity: 0,
  orbHasHalo: false,
};

// ═══════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════
export interface ThemeContextValue {
  theme: AppTheme;
  themeType: ThemeType;
  colors: ThemeColors;
  setTheme: (type: ThemeType) => void;
  toggleTheme: () => void;
  isElite: boolean;
  categoryDefault: ThemeType;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY_PREFIX = '@adi_theme_preference:';

function getStorageKey(tenantPath: string): string {
  return `${STORAGE_KEY_PREFIX}${tenantPath || 'global'}`;
}

/**
 * Mapa de categorías RTDB → tema visual.
 * Clave: segundo segmento del tenantPath (la categoría).
 * Esto evita hardcodear strings de categoría en código de plataforma.
 *
 * Evidencia RTDB: 2 alimentos_y_bebidas/marisquerias/{tenant}
 *   → segmento[1] = 'marisquerias' → tema 'elite'
 */
const CATEGORIA_TEMA_MAP: Record<string, ThemeType> = {
  marisquerias: 'elite',
  // Futuros: cafeterias: 'default', panaderias: 'warm', etc.
};

function detectCategoryTheme(tenantPath: string): ThemeType {
  // tenantPath formato: "nicho/categoria/tenant"
  const identidad = descomponerRutaTenant(tenantPath);
  const categoria = identidad?.categoriaId;

  return (categoria ? CATEGORIA_TEMA_MAP[categoria] : undefined) ?? 'default';
}

function getThemeObject(type: ThemeType): AppTheme {
  return type === 'elite' ? eliteTheme : defaultTheme;
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════
interface ThemeProviderProps {
  children: React.ReactNode;
  tenantPath?: string;
}

export function ThemeProvider({ children, tenantPath = '' }: ThemeProviderProps) {
  const categoryDefault = detectCategoryTheme(tenantPath);
  const [themeType, setThemeType] = useState<ThemeType>(categoryDefault);
  const [loadedTenantPath, setLoadedTenantPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(getStorageKey(tenantPath))
      .then((saved) => {
        if (cancelled) return;
        setThemeType(saved === 'elite' || saved === 'default' ? saved : categoryDefault);
        setLoadedTenantPath(tenantPath);
      })
      .catch(() => {
        if (cancelled) return;
        setThemeType(categoryDefault);
        setLoadedTenantPath(tenantPath);
      });

    return () => {
      cancelled = true;
    };
  }, [categoryDefault, tenantPath]);

  const setTheme = useCallback(
    (type: ThemeType) => {
      setThemeType(type);
      AsyncStorage.setItem(getStorageKey(tenantPath), type).catch(console.warn);
    },
    [tenantPath]
  );

  const toggleTheme = useCallback(() => {
    const next = themeType === 'elite' ? 'default' : 'elite';
    setTheme(next);
  }, [themeType, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: getThemeObject(themeType),
      themeType,
      colors: getThemeObject(themeType).colors,
      setTheme,
      toggleTheme,
      isElite: themeType === 'elite',
      categoryDefault,
    }),
    [themeType, setTheme, toggleTheme, categoryDefault]
  );

  if (loadedTenantPath !== tenantPath) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════
export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: defaultTheme,
      themeType: 'default',
      colors: defaultColors,
      setTheme: () => {},
      toggleTheme: () => {},
      isElite: false,
      categoryDefault: 'default',
    };
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════
// LEGACY EXPORTS (compatibilidad con theme.ts existente)
// ═══════════════════════════════════════════════════════════════════
export const theme = {
  colors: defaultColors,
  typography: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    sizes: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, xxl: 24, xxxl: 32 },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      heavy: '800' as const,
    },
    lineHeights: { tight: 1.2, normal: 1.4, relaxed: 1.6 },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 },
  borderRadius: { sm: 6, md: 8, lg: 12, xl: 16, round: 9999 },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  animations: { duration: { fast: 200, normal: 300, slow: 500 }, easing: 'ease-in-out' },
};

export const useTheme = useAppTheme;
export { defaultColors, defaultTheme, eliteColors, eliteTheme };
