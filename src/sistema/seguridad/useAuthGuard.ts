import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useStore } from '../store';
import { RUTAS } from '../rtdb/rutas/ruta_negocio';
import { logger } from '../monitoreo';
import { deviceBinding } from './vinculacionDispositivo';

/**
 * 🛡️ GUARDIA DE AUTENTICACIÓN (Auth Guard) - Hardened (Nivel Militar)
 * Vigila las fronteras del sistema a nivel de Hardware y Sesión.
 * - Si el hardware no está registrado o el negocioId falta, limpia la sesión y expulsa a login.
 * - Si está autenticado y registrado, y se encuentra en zona pública, redirige a selector de roles.
 * - En Web (Punto 8), el acceso es por validación de código sin vinculación de hardware físico.
 */
export function useAuthGuard(isSystemReady: boolean) {
  const router = useRouter();
  const segments = useSegments();
  const negocioId = useStore((s) => s.sesion.negocioId);
  const rutaNegocio = useStore((s) => s.sesion.rutaNegocio);
  const clearSession = useStore((s) => s.clearSession);
  const [deviceChecked, setDeviceChecked] = useState(false);
  const [isDeviceRegisteredState, setIsDeviceRegisteredState] = useState(false);

  // 1. Validar vinculación física del dispositivo en el arranque
  useEffect(() => {
    if (!isSystemReady) return;

    const verificarDispositivo = async () => {
      try {
        if (Platform.OS === 'web') {
          setIsDeviceRegisteredState(true);
          setDeviceChecked(true);
          return;
        }

        const registrado = await deviceBinding.isDeviceRegistered();
        setIsDeviceRegisteredState(registrado);
        if (registrado && rutaNegocio) {
          await deviceBinding.updateLastAccess(rutaNegocio);
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
  }, [isSystemReady, rutaNegocio]);

  // 2. Controlar la navegación en base a la sesión y el estado de validación
  useEffect(() => {
    if (!isSystemReady || !deviceChecked) return;

    // Identificar zona actual (si empieza con (auth) o vinculacion)
    const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'vinculacion';

    const esDispositivoValido = Platform.OS === 'web' || isDeviceRegisteredState;

    // 1. Acceso denegado: Dispositivo no enlazado físicamente o sin ID de negocio
    if ((!negocioId || !esDispositivoValido) && !inAuthGroup) {
      logger.warn(
        'AUTH',
        '⛔ Intrusión o desvinculación detectada. Limpiando sesión y expulsando a Login.'
      );
      void clearSession().then(() => {
        router.replace(RUTAS.AUTH.LOGIN);
      });
      return;
    }

    // 2. Sesión activa: verificar consistencia de EstadoEncendido y rol activo
    if (negocioId && esDispositivoValido) {
      void import('./guardiaArranqueO1').then(async ({ evaluarGuardiaArranque }) => {
        const { getRtdb } = await import('../firebase');
        const evaluacion = await evaluarGuardiaArranque(getRtdb());

        if (evaluacion.estado === 'sin_sesion' || evaluacion.estado === 'sesion_expirada') {
          if (!inAuthGroup) {
            await clearSession();
            router.replace(RUTAS.AUTH.LOGIN);
          }
          return;
        }

        if (evaluacion.estado === 'requiere_seleccion_rol') {
          const inRolesSelector = segments.join('/') === '_role/roles';
          if (!inRolesSelector) {
            router.replace(RUTAS.ROLES.SELECTOR);
          }
          return;
        }

        if (inAuthGroup) {
          logger.info('AUTH', '✅ Sesión y dispositivo válidos. Redirigiendo a Roles.');
          router.replace(RUTAS.ROLES.SELECTOR);
        }
      });
    }
  }, [
    isSystemReady,
    deviceChecked,
    isDeviceRegisteredState,
    segments,
    negocioId,
    router,
    clearSession,
  ]);
}
