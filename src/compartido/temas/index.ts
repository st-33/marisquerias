/**
 * 🎨 THEME SYSTEM - EXPORTS
 * Sistema de temas por categoría RTDB
 */

export {
  ThemeProvider,
  defaultColors,
  defaultTheme,
  eliteColors,
  eliteTheme,
  theme,
  useAppTheme,
  useTheme,
} from './ThemeContext';

export type { AppTheme, ThemeColors, ThemeContextValue, ThemeType } from './ThemeContext';

export { ThemeToggle } from './components/ThemeToggle';
