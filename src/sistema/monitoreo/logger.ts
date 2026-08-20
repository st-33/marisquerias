/**
 * 🎯 SISTEMA DE LOGGING UNIFICADO
 *
 * Logger centralizado que integra:
 * - Console logs (desarrollo)
 * - Sentry (producción)
 * - Firebase Analytics (eventos de negocio)
 *
 * NIVELES:
 * - debug: Diagnóstico detallado (solo dev)
 * - info: Información general (solo dev)
 * - warn: Advertencias (siempre)
 * - error: Errores críticos (siempre + Sentry)
 *
 * USO:
 * ```typescript
 * import { logger } from '@/core/monitoring/logger';
 *
 * // Logs simples
 * logger.debug('Procesando pedido', { mesaId: 5 });
 * logger.info('Orden completada', { items: 3 });
 * logger.warn('Stock bajo', { producto: 'Cerveza' });
 * logger.error('Error al procesar', error, { contexto: 'cocina' });
 *
 * // Eventos de negocio (Analytics)
 * logger.event('orden_enviada_cocina', { mesa: 5, items: 3 });
 * ```
 */

import { addBreadcrumb, captureError, captureMessage } from './sentry.config';

// Detectar entorno
const isDev = __DEV__;

/**
 * Formatear timestamp
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
}

/**
 * Formatear mensaje con prefijo y timestamp
 */
function formatMessage(level: string, module: string, message: string): string {
  const timestamp = isDev ? `[${getTimestamp()}]` : '';
  return `${timestamp} [${level.toUpperCase()}] [${module}] ${message}`.trim();
}

class Logger {
  /**
   * 🔍 DEBUG: Información detallada de desarrollo
   * Solo se muestra en desarrollo
   */
  debug(module: string, message: string, data?: any) {
    if (!isDev) return;

    const formatted = formatMessage('debug', module, message);
    if (data !== undefined) {
      console.log(formatted, data);
    } else {
      console.log(formatted);
    }
  }

  /**
   * ℹ️ INFO: Información general
   * Solo se muestra en desarrollo
   */
  info(module: string, message: string, data?: any) {
    if (!isDev) return;

    const formatted = formatMessage('info', module, message);
    if (data !== undefined) {
      console.log(formatted, data);
    } else {
      console.log(formatted);
    }
  }

  /**
   * ⚠️ WARN: Advertencias importantes
   * Siempre se muestra + se envía a Sentry como mensaje
   */
  warn(module: string, message: string, data?: any) {
    const formatted = formatMessage('warn', module, message);

    if (data !== undefined) {
      console.warn(formatted, data);
    } else {
      console.warn(formatted);
    }

    // Enviar a Sentry en producción
    if (!isDev) {
      captureMessage(`[${module}] ${message}`, 'warning');
      if (data) {
        addBreadcrumb(message, module, data);
      }
    }
  }

  /**
   * ❌ ERROR: Errores críticos
   * Siempre se muestra + se envía a Sentry
   */
  error(module: string, message: string, error?: Error | any, context?: Record<string, any>) {
    const formatted = formatMessage('error', module, message);

    if (error) {
      console.error(formatted, error, context);
    } else {
      console.error(formatted, context);
    }

    // Enviar a Sentry
    if (error instanceof Error) {
      captureError(error, {
        module,
        message,
        ...context,
      });
    } else {
      // Si no es un Error, crear uno
      const syntheticError = new Error(`[${module}] ${message}`);
      captureError(syntheticError, {
        originalError: error,
        ...context,
      });
    }
  }

  /**
   * 📊 EVENT: Eventos de negocio (Analytics)
   * Se registran en Firebase Analytics
   *
   * Ejemplos:
   * - orden_enviada_cocina
   * - mesa_ocupada
   * - producto_agotado
   * - ticket_impreso
   */
  event(eventName: string, params?: Record<string, any>) {
    // En desarrollo, solo log
    if (isDev) {
      console.log(`[EVENT] ${eventName}`, params);
      return;
    }

    // TODO: Integrar Firebase Analytics cuando se configure
    // analytics().logEvent(eventName, params);

    // Por ahora, solo breadcrumb en Sentry
    addBreadcrumb(eventName, 'event', params);
  }

  /**
   * 🍞 BREADCRUMB: Rastro de navegación
   * Útil para reconstruir el flujo antes de un error
   */
  breadcrumb(message: string, category: string, data?: Record<string, any>) {
    if (isDev) {
      console.log(`[BREADCRUMB] [${category}] ${message}`, data);
    }

    addBreadcrumb(message, category, data);
  }
}

// Instancia global
export const logger = new Logger();

/**
 * Helper: Crear logger con módulo predefinido
 *
 * Uso:
 * ```typescript
 * const log = createModuleLogger('COCINA');
 * log.info('Orden recibida', { mesaId: 5 });
 * ```
 */
export function createModuleLogger(module: string) {
  return {
    debug: (message: string, data?: any) => logger.debug(module, message, data),
    info: (message: string, data?: any) => logger.info(module, message, data),
    warn: (message: string, data?: any) => logger.warn(module, message, data),
    error: (message: string, error?: Error | any, context?: Record<string, any>) =>
      logger.error(module, message, error, context),
    event: (eventName: string, params?: Record<string, any>) => logger.event(eventName, params),
    breadcrumb: (message: string, data?: Record<string, any>) =>
      logger.breadcrumb(message, module, data),
  };
}
