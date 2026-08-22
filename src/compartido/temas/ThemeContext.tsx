/**
 * Sistema de temas por categoría/tenant.
 *
 * El tema se mantiene como una sola fuente de verdad para la UI dinámica.
 * Los consumidores legacy pueden importar tokens estáticos desde `theme.ts`,
 * pero ya no dependen de una exportación paralela desde este contexto.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { descomponerRutaTenant } from '../../sistema/rtdb/rutas/RutaTenant';

export type ThemeType = 'elite' | 'default';

export interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceDark: string;
  card: string;
  primary: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  glass: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  success: string;
  error: string;
  danger: string;
  warning: string;
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

const getScale = (width: number) => (width < 480 ? 0.85 : width < 1024 ? 1 : 1.4);

/** Paleta premium de marisquería: sobria, cálida y con contraste alto. */
export const eliteColors: ThemeColors = {
  background: '#0A0D14',
  backgroundSecondary: '#0D111A',
  surface: '#141923',
  surfaceDark: '#0D111A',
  card: '#1A2230',
  primary: '#D4AF37',
  primaryLight: '#E5C158',
  secondary: '#CBD5E1',
  accent: '#D4AF37',
  glass: 'rgba(20, 25, 35, 0.94)',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  border: '#252E3E',
  borderLight: 'rgba(212, 175, 55, 0.18)',
  success: '#10B981',
  error: '#EF4444',
  danger: '#EF4444',
  warning: '#F59E0B',
  shadow: 'rgba(0, 0, 0, 0.36)',
  shadowDark: 'rgba(0, 0, 0, 0.62)',
};

export const defaultColors: ThemeColors = {
  background: '#0B101A',
  backgroundSecondary: '#0F172A',
  surface: '#111827',
  surfaceDark: '#0F172A',
  card: '#1F2937',
  primary: '#2563EB',
  primaryLight: '#93C5FD',
  secondary: '#CBD5E1',
  accent: '#F59E0B',
  glass: 'rgba(30, 41, 59, 0.94)',
  text: '#F9FAFB',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  border: '#334155',
  borderLight: '#475569',
  success: '#10B981',
  error: '#EF4444',
  danger: '#EF4444',
  warning: '#F59E0B',
  shadow: 'rgba(15, 23, 42, 0.45)',
  shadowDark: 'rgba(15, 23, 42, 0.65)',
};

const createTheme = (type: ThemeType, width: number, height: number): AppTheme => {
  const elite = type === 'elite';
  return {
    id: type,
    name: elite ? 'Oro Elite' : 'Clásico',
    colors: elite ? eliteColors : defaultColors,
    scale: getScale(width),
    screenWidth: width,
    screenHeight: height,
    hasLiquidBackground: elite,
    hasStickers: elite,
    stickerOpacity: elite ? 0.08 : 0,
    orbHasHalo: elite,
  };
};

export const eliteTheme = createTheme('elite', 390, 844);
export const defaultTheme = createTheme('default', 390, 844);

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

const CATEGORIA_TEMA_MAP: Record<string, ThemeType> = {
  marisquerias: 'elite',
};

function detectCategoryTheme(tenantPath: string): ThemeType {
  const identidad = descomponerRutaTenant(tenantPath);
  const categoria = identidad?.categoriaId;
  return (categoria ? CATEGORIA_TEMA_MAP[categoria] : undefined) ?? 'default';
}

function getTenantStorageKey(tenantPath: string): string {
  return `${STORAGE_KEY_PREFIX}${tenantPath || 'global'}`;
}

function isThemeType(value: string | null): value is ThemeType {
  return value === 'elite' || value === 'default';
}

interface ThemeProviderProps {
  children: React.ReactNode;
  tenantPath?: string;
}

export function ThemeProvider({ children, tenantPath = '' }: ThemeProviderProps) {
  const { width, height } = useWindowDimensions();
  const categoryDefault = detectCategoryTheme(tenantPath);
  const storageKey = getTenantStorageKey(tenantPath);
  const [themeType, setThemeType] = useState<ThemeType>(categoryDefault);
  const [loadedTenantPath, setLoadedTenantPath] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        const resolved: ThemeType = isThemeType(saved) ? saved : categoryDefault;
        if (active) {
          setThemeType(resolved);
          setLoadedTenantPath(tenantPath);
        }
      } catch {
        if (active) {
          setThemeType(categoryDefault);
          setLoadedTenantPath(tenantPath);
        }
      }
    };

    void loadPreference();
    return () => {
      active = false;
    };
  }, [categoryDefault, storageKey, tenantPath]);

  const setTheme = useCallback(
    (type: ThemeType) => {
      setThemeType(type);
      void AsyncStorage.setItem(storageKey, type).catch(() => undefined);
    },
    [storageKey]
  );

  const toggleTheme = useCallback(() => {
    setTheme(themeType === 'elite' ? 'default' : 'elite');
  }, [setTheme, themeType]);

  const theme = useMemo(() => createTheme(themeType, width, height), [height, themeType, width]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      themeType,
      colors: theme.colors,
      setTheme,
      toggleTheme,
      isElite: themeType === 'elite',
      categoryDefault,
    }),
    [categoryDefault, setTheme, theme, themeType, toggleTheme]
  );

  if (loadedTenantPath !== tenantPath) {
    const loadingTheme = createTheme(categoryDefault, width, height);
    return (
      <View style={[styles.loadingShell, { backgroundColor: loadingTheme.colors.background }]}>
        <View style={styles.loadingMark}>
          <ActivityIndicator color={loadingTheme.colors.primary} size="small" />
        </View>
      </View>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context) return context;

  return {
    theme: defaultTheme,
    themeType: 'default',
    colors: defaultColors,
    setTheme: () => undefined,
    toggleTheme: () => undefined,
    isElite: false,
    categoryDefault: 'default',
  };
}

export const theme = {
  colors: eliteColors,
  typography: {
    fontFamily: 'System',
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
  borderRadius: { sm: 6, md: 10, lg: 14, xl: 18, round: 9999 },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.24,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.32,
      shadowRadius: 18,
      elevation: 8,
    },
  },
  animations: {
    duration: { instant: 80, fast: 140, normal: 220, slow: 320 },
    easing: 'ease-in-out',
  },
};

export const useTheme = useAppTheme;

const styles = StyleSheet.create({
  loadingShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMark: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.18)',
    borderRadius: 16,
  },
});

export { Platform };
