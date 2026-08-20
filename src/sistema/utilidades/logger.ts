/**
 * 🔍 LOGGER CON NIVELES
 * Sistema de logging con niveles configurables para reducir ruido
 * en producción
 *
 * NIVELES:
 * - debug: Logs de diagnóstico detallado (solo en desarrollo)
 * - info: Información general del flujo
 * - warn: Advertencias que no rompen el flujo
 * - error: Errores que requieren atención
 *
 * CONFIGURACIÓN:
 * - __DEV__: Todos los niveles habilitados
 * - Producción: Solo warn y error
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Nivel mínimo en desarrollo: debug (muestra todo)
// Nivel mínimo en producción: warn (solo advertencias y errores)
const MIN_LEVEL: LogLevel = __DEV__ ? 'debug' : 'warn';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

/**
 * Logger con prefijo y nivel
 */
export function createLogger(prefix: string) {
  return {
    debug: (...args: any[]) => {
      if (shouldLog('debug')) {
        console.log(`[${prefix}]`, ...args);
      }
    },
    info: (...args: any[]) => {
      if (shouldLog('info')) {
        console.log(`[${prefix}]`, ...args);
      }
    },
    warn: (...args: any[]) => {
      if (shouldLog('warn')) {
        console.warn(`[${prefix}]`, ...args);
      }
    },
    error: (...args: any[]) => {
      if (shouldLog('error')) {
        console.error(`[${prefix}]`, ...args);
      }
    },
  };
}

/**
 * Logger global (sin prefijo)
 */
export const logger = {
  debug: (...args: any[]) => {
    if (shouldLog('debug')) {
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
    if (shouldLog('info')) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    if (shouldLog('error')) {
      console.error(...args);
    }
  },
};
