/**
 * 🎨 THEME SYSTEM - EXPORTS
 * Sistema de temas por categoría RTDB
 */

export {
  ThemeProvider,
  defaultColors,
  defaultTheme,
  eliteColors, // legacy object
  eliteTheme, // legacy alias
  theme,
  useAppTheme,
  useTheme,
} from './ThemeContext';

export type { AppTheme, ThemeColors, ThemeType } from './ThemeContext';

export { ThemeToggle } from './components/ThemeToggle';
