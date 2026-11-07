/**
 * 🎨 GLOBAL THEME SYSTEM
 * Sistema de temas dinámico por categoría con colores globales.
 * Compatible con todos los módulos existentes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform } from 'react-native';
import { descomponer_ruta_negocio } from '../../sistema/rtdb/rutas/ruta_negocio';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════
export type ThemeType = 'elite' | 'default';

export interface ThemeColors {
  // Fondo y Superficies Elevadas (Multi-layer dark hierarchy)
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceDark: string;
  surfaceElevated: string;
  card: string;
  cardElevated: string;

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
  borderHighlight: string;

  // Estados
  success: string;
  successSoft: string;
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
// TEMA ELITE (Marisquerías - Oro & Obsidiana Cálida)
// ═══════════════════════════════════════════════════════════════════
const SCALE_ELITE = SCREEN_WIDTH < 480 ? 0.9 : SCREEN_WIDTH < 1024 ? 1.05 : 1.35;

const eliteColors: ThemeColors = {
  background: '#08080a',
  backgroundSecondary: '#0f0f13',
  surface: '#16161c',
  surfaceDark: '#0c0c10',
  surfaceElevated: '#1f1e26',
  card: '#1d1c24',
  cardElevated: '#26252f',

  primary: '#d4af37',
  primaryLight: '#faeed1',
  secondary: '#b89758',
  accent: '#e5c158',

  glass: 'rgba(22, 22, 28, 0.92)',

  text: '#faf8f5',
  textSecondary: '#e2dcd3',
  textMuted: '#a39b8f',

  border: '#302b24',
  borderLight: '#463e33',
  borderHighlight: 'rgba(212, 175, 55, 0.42)',

  success: '#34d399',
  successSoft: 'rgba(52, 211, 153, 0.14)',
  error: '#f87171',
  danger: '#f87171',
  warning: '#fbbf24',

  shadow: 'rgba(212, 175, 55, 0.24)',
  shadowDark: 'rgba(0, 0, 0, 0.65)',
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
  stickerOpacity: 0.14,
  orbHasHalo: true,
};

// ═══════════════════════════════════════════════════════════════════
// TEMA DEFAULT (Clásico Atlántico Profundo)
// ═══════════════════════════════════════════════════════════════════
const SCALE_DEFAULT = SCREEN_WIDTH < 480 ? 0.9 : SCREEN_WIDTH < 1024 ? 1.05 : 1.35;

const defaultColors: ThemeColors = {
  background: '#090d16',
  backgroundSecondary: '#0f1624',
  surface: '#151e30',
  surfaceDark: '#0c121e',
  surfaceElevated: '#1e293b',
  card: '#1b2538',
  cardElevated: '#243147',

  primary: '#3b82f6',
  primaryLight: '#dbeafe',
  secondary: '#94a3b8',
  accent: '#f59e0b',

  glass: 'rgba(21, 30, 48, 0.92)',

  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',

  border: '#26334d',
  borderLight: '#334466',
  borderHighlight: 'rgba(59, 130, 246, 0.42)',

  success: '#34d399',
  successSoft: 'rgba(52, 211, 153, 0.14)',
  error: '#f87171',
  danger: '#f87171',
  warning: '#fbbf24',

  shadow: 'rgba(15, 23, 42, 0.55)',
  shadowDark: 'rgba(0, 0, 0, 0.7)',
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

function getStorageKey(rutaNegocio: string): string {
  return `${STORAGE_KEY_PREFIX}${rutaNegocio || 'global'}`;
}

/**
 * Mapa de categorías RTDB → tema visual.
 * Clave: segundo segmento del rutaNegocio (la categoría).
 * Esto evita hardcodear strings de categoría en código de plataforma.
 *
 * Evidencia RTDB: 2 alimentos_y_bebidas/marisquerias/{negocio}
 *   → segmento[1] = 'marisquerias' → tema 'elite'
 */
const CATEGORIA_TEMA_MAP: Record<string, ThemeType> = {
  marisquerias: 'elite',
  // Futuros: cafeterias: 'default', panaderias: 'warm', etc.
};

function detectCategoryTheme(rutaNegocio: string): ThemeType {
  // rutaNegocio formato: "nicho/categoria/negocio"
  const identidad = descomponer_ruta_negocio(rutaNegocio);
  const categoria = identidad?.categoria_id ?? identidad?.categoriaId;

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
  rutaNegocio?: string;
}

export function ThemeProvider({ children, rutaNegocio = '' }: ThemeProviderProps) {
  const categoryDefault = detectCategoryTheme(rutaNegocio);
  const [themeType, setThemeType] = useState<ThemeType>(categoryDefault);
  const [loadedRutaNegocio, setLoadedRutaNegocio] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(getStorageKey(rutaNegocio))
      .then((saved) => {
        if (cancelled) return;
        setThemeType(saved === 'elite' || saved === 'default' ? saved : categoryDefault);
        setLoadedRutaNegocio(rutaNegocio);
      })
      .catch(() => {
        if (cancelled) return;
        setThemeType(categoryDefault);
        setLoadedRutaNegocio(rutaNegocio);
      });

    return () => {
      cancelled = true;
    };
  }, [categoryDefault, rutaNegocio]);

  const setTheme = useCallback(
    (type: ThemeType) => {
      setThemeType(type);
      AsyncStorage.setItem(getStorageKey(rutaNegocio), type).catch(console.warn);
    },
    [rutaNegocio]
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

  if (loadedRutaNegocio !== rutaNegocio) return null;

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
    fontFamily:
      Platform.OS === 'web'
        ? '"Plus Jakarta Sans", "Outfit", "Segoe UI", system-ui, sans-serif'
        : Platform.OS === 'ios'
          ? 'AvenirNext-DemiBold'
          : 'sans-serif-medium',
    displayFamily:
      Platform.OS === 'web'
        ? '"Cabinet Grotesk", "Outfit", "Georgia", serif'
        : Platform.OS === 'ios'
          ? 'Georgia-Bold'
          : 'serif',
    sizes: { xs: 13, sm: 15, md: 17, lg: 19, xl: 22, xxl: 26, xxxl: 34 },
    weights: {
      regular: '500' as const,
      medium: '600' as const,
      semibold: '700' as const,
      bold: '800' as const,
      heavy: '900' as const,
    },
    lineHeights: { tight: 1.25, normal: 1.45, relaxed: 1.65 },
  },
  spacing: { xs: 4, sm: 8, md: 14, lg: 20, xl: 28, xxl: 40, xxxl: 56 },
  borderRadius: { sm: 8, md: 10, lg: 14, xl: 18, round: 9999 },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.32,
      shadowRadius: 8,
      elevation: 6,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 10,
    },
  },
  animations: { duration: { fast: 180, normal: 260, slow: 420 }, easing: 'ease-in-out' },
};

export const useTheme = useAppTheme;
export { defaultColors, defaultTheme, eliteColors, eliteTheme };
