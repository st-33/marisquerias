/**
 * 🔴 SENTRY CONFIGURATION
 *
 * Sistema de monitoreo de errores en producción.
 * Captura crashes, errores no manejados y performance issues.
 *
 * SETUP:
 * 1. Crear cuenta en sentry.io
 * 2. Crear proyecto React Native
 * 3. Copiar DSN y pegarlo en SENTRY_DSN
 * 4. Rebuild la app
 *
 * IMPORTANTE:
 * - Solo se activa en producción (__DEV__ === false)
 * - En desarrollo, los errores van solo a console
 */

import * as Sentry from '@sentry/react-native';

// 🔑 DSN de Sentry (obtenerlo de sentry.io)
// TODO: Reemplazar con tu DSN real cuando tengas cuenta
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

// Detectar si estamos en producción
const isProduction = !__DEV__;

/**
 * Inicializar Sentry
 * Llamar esto al inicio de la app (en _layout.tsx)
 */
export function initSentry() {
  // Solo inicializar en producción y si hay DSN configurado
  if (!isProduction || !SENTRY_DSN) {
    console.log('[Sentry] Deshabilitado (modo desarrollo o sin DSN)');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,

    // Habilitar tracing de performance
    tracesSampleRate: 0.2, // 20% de las transacciones

    // Capturar errores de red
    integrations: [Sentry.reactNativeTracingIntegration()],

    // Entorno
    environment: __DEV__ ? 'development' : 'production',

    // Versión de la app
    release: 'mi-ecosistema-adi@1.0.0', // TODO: Sincronizar con package.json

    // Filtrar eventos sensibles
    beforeSend(event) {
      // No enviar errores de desarrollo
      if (__DEV__) return null;

      // Aquí puedes filtrar información sensible
      // Por ejemplo, remover tokens de headers
      return event;
    },
  });

  console.log('[Sentry] ✅ Inicializado correctamente');
}

/**
 * Capturar error manualmente
 */
export function captureError(error: Error, context?: Record<string, any>) {
  if (!isProduction) {
    console.error('[Sentry] Error capturado (dev):', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capturar mensaje (no error)
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!isProduction) {
    console.log(`[Sentry] Mensaje (dev) [${level}]:`, message);
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Agregar contexto de usuario
 */
export function setUser(user: { id: string; tenantId?: string; rol?: string }) {
  Sentry.setUser({
    id: user.id,
    username: user.tenantId,
    role: user.rol,
  });
}

/**
 * Limpiar contexto de usuario (logout)
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Agregar breadcrumb (rastro de navegación)
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}
