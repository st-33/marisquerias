import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { RUTAS } from '@compartido/rutas';
import { logger } from '../monitoreo';
import { deviceBinding } from './deviceBinding';

/**
 * 🛡️ GUARDIA DE AUTENTICACIÓN (Auth Guard) - Hardened (Nivel Militar)
 * Vigila las fronteras del sistema a nivel de Hardware y Sesión.
 * - Si el hardware no está registrado o el tenantId falta, limpia la sesión y expulsa a login.
 * - Si está autenticado y registrado, y se encuentra en zona pública, redirige a selector de roles.
 */
export function useAuthGuard(isSystemReady: boolean) {
  const router = useRouter();
  const segments = useSegments();
  const tenantId = useStore((s) => s.sesion.tenantId);
  const tenantPath = useStore((s) => s.sesion.tenantPath);
  const clearSession = useStore((s) => s.clearSession);
  const [deviceChecked, setDeviceChecked] = useState(false);
  const [isDeviceRegisteredState, setIsDeviceRegisteredState] = useState(false);

  // 1. Validar vinculación física del dispositivo en el arranque
  useEffect(() => {
    if (!isSystemReady) return;

    const verificarDispositivo = async () => {
      try {
        const registrado = await deviceBinding.isDeviceRegistered();
        setIsDeviceRegisteredState(registrado);
        if (registrado && tenantPath) {
          await deviceBinding.updateLastAccess(tenantPath);
          logger.info('AUTH', '🛡️ Dispositivo verificado físicamente en frontera.');
        } else if (!registrado) {
          logger.warn('AUTH', '⚠️ Dispositivo no registrado físicamente en frontera.');
        }
        setDeviceChecked(true);
      } catch (error) {
        logger.error('AUTH', '❌ Error al verificar dispositivo en frontera', error as Error);
        // Fallback resiliente offline
        setIsDeviceRegisteredState(true);
        setDeviceChecked(true);
      }
    };

    verificarDispositivo();
  }, [isSystemReady, tenantPath]);

  // 2. Controlar la navegación en base a la sesión y el estado de validación
  useEffect(() => {
    if (!isSystemReady || !deviceChecked) return;

    // Identificar zona actual (si empieza con (auth))
    const inAuthGroup = segments[0] === '(auth)';

    // 1. Acceso denegado: Dispositivo no enlazado físicamente o sin ID de tenant
    if ((!tenantId || !isDeviceRegisteredState) && !inAuthGroup) {
      logger.warn(
        'AUTH',
        '⛔ Intrusión o desvinculación detectada. Limpiando sesión y expulsando a Login.'
      );
      void clearSession().then(() => {
        router.replace(RUTAS.AUTH.LOGIN);
      });
      return;
    }

    // 2. Sesión válida: Redirigir fuera de la zona de login
    if (tenantId && isDeviceRegisteredState && inAuthGroup) {
      logger.info('AUTH', '✅ Sesión y dispositivo válidos. Redirigiendo a Roles.');
      router.replace(RUTAS.ROLES.SELECTOR);
    }
  }, [
    isSystemReady,
    deviceChecked,
    isDeviceRegisteredState,
    segments,
    tenantId,
    router,
    clearSession,
  ]);
}
