/**
 * 🧹 LIMPIADOR DE LOGS
 *
 * Reduce logs excesivos en producción manteniendo solo los críticos
 */

import { createLogger } from './logger';

const log = createLogger('LogCleaner');

/**
 * Niveles de logging
 */
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

/**
 * Configuración de logging por módulo
 */
const LOG_CONFIG: Record<string, LogLevel> = {
  // Críticos: siempre mostrar
  SynchronizationService: LogLevel.INFO,
  useSynchronizedArray: LogLevel.INFO,
  useMeseroLogic: LogLevel.INFO,
  useProductSelector: LogLevel.INFO,

  // Moderados: solo warnings y errores
  DASHBOARD: LogLevel.WARN,
  RolePacker: LogLevel.WARN,
  PrintNotificationListener: LogLevel.WARN,
  ItemStatusListener: LogLevel.WARN,

  // Verbosos: solo errores
  usePrinterConnection: LogLevel.ERROR,
  BluetoothPrinterModal: LogLevel.ERROR,

  // Por defecto: INFO
  default: LogLevel.INFO,
};

/**
 * Obtiene el nivel de log para un módulo
 */
function getLogLevel(module: string): LogLevel {
  return LOG_CONFIG[module] || LOG_CONFIG['default'];
}

/**
 * Verifica si un log debe mostrarse
 */
export function shouldLog(module: string, level: 'error' | 'warn' | 'info' | 'debug'): boolean {
  const configLevel = getLogLevel(module);
  const messageLevel =
    level === 'error'
      ? LogLevel.ERROR
      : level === 'warn'
        ? LogLevel.WARN
        : level === 'info'
          ? LogLevel.INFO
          : LogLevel.DEBUG;

  return messageLevel <= configLevel;
}

/**
 * Wrapper para console.log que respeta configuración
 */
export function conditionalLog(
  module: string,
  level: 'error' | 'warn' | 'info' | 'debug',
  message: string,
  ...args: any[]
): void {
  if (!shouldLog(module, level)) return;

  const prefix = `[${module}]`;
  switch (level) {
    case 'error':
      console.error(prefix, message, ...args);
      break;
    case 'warn':
      console.warn(prefix, message, ...args);
      break;
    case 'info':
      console.log(prefix, message, ...args);
      break;
    case 'debug':
      console.log(prefix, message, ...args);
      break;
  }
}
