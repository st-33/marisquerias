/**
 * 🎯 SISTEMA DE LOGGING INTELIGENTE
 *
 * Utilidad centralizada para logging con niveles y control de entorno.
 *
 * NIVELES:
 * - DEBUG: Info detallada de desarrollo (solo en dev)
 * - INFO: Información general (solo en dev)
 * - WARN: Advertencias importantes (siempre)
 * - ERROR: Errores críticos (siempre)
 *
 * CARACTERÍSTICAS:
 * - Detección automática de entorno (dev/prod)
 * - Prefijos por módulo para fácil filtrado
 * - Timestamps opcionales
 * - Zero overhead en producción
 *
 * USO:
 * ```typescript
 * import { logger } from '@/utils/logger';
 *
 * logger.debug('[COCINA]', 'Procesando pedido', pedidoId);
 * logger.info('[COCINA]', 'Orden completada', { id, items });
 * logger.warn('[COCINA]', 'Stock bajo', { item, cantidad });
 * logger.error('[COCINA]', 'Error al procesar', error);
 * ```
 */

// Detectar entorno
const isDevelopment = __DEV__ ?? process.env.NODE_ENV !== 'production';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private minLevel: LogLevel;
  private enableTimestamps: boolean;

  constructor(minLevel?: LogLevel, enableTimestamps = false) {
    // En producción, solo WARN y ERROR
    this.minLevel = minLevel ?? (isDevelopment ? LogLevel.DEBUG : LogLevel.WARN);
    this.enableTimestamps = enableTimestamps;
  }

  /**
   * 🔍 DEBUG: Información detallada de desarrollo
   * Solo se muestra en desarrollo
   */
  debug(prefix: string, message: string, ...args: any[]) {
    if (this.minLevel <= LogLevel.DEBUG) {
      this._log('log', prefix, message, args);
    }
  }

  /**
   * ℹ️ INFO: Información general
   * Solo se muestra en desarrollo
   */
  info(prefix: string, message: string, ...args: any[]) {
    if (this.minLevel <= LogLevel.INFO) {
      this._log('info', prefix, message, args);
    }
  }

  /**
   * ⚠️ WARN: Advertencias importantes
   * Siempre se muestra (dev y prod)
   */
  warn(prefix: string, message: string, ...args: any[]) {
    if (this.minLevel <= LogLevel.WARN) {
      this._log('warn', prefix, message, args);
    }
  }

  /**
   * ❌ ERROR: Errores críticos
   * Siempre se muestra (dev y prod)
   */
  error(prefix: string, message: string, ...args: any[]) {
    if (this.minLevel <= LogLevel.ERROR) {
      this._log('error', prefix, message, args);
    }
  }

  /**
   * Método interno para loguear
   */
  private _log(
    method: 'log' | 'info' | 'warn' | 'error',
    prefix: string,
    message: string,
    args: any[]
  ) {
    const timestamp = this.enableTimestamps ? `[${new Date().toISOString()}]` : '';
    const fullMessage = `${timestamp} ${prefix} ${message}`.trim();

    if (args.length > 0) {
      console[method](fullMessage, ...args);
    } else {
      console[method](fullMessage);
    }
  }

  /**
   * Cambiar nivel mínimo de logging en runtime
   */
  setLevel(level: LogLevel) {
    this.minLevel = level;
  }

  /**
   * Habilitar/deshabilitar timestamps
   */
  setTimestamps(enabled: boolean) {
    this.enableTimestamps = enabled;
  }
}

// Instancia global
export const logger = new Logger();

// Exportar para casos especiales
export { Logger };
