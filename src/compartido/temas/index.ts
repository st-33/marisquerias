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
} from './ContextoTema';

export type { AppTheme, ThemeColors, ThemeType } from './ContextoTema';

export { ConmutadorTema, ThemeToggle } from './components/ConmutadorTema';
