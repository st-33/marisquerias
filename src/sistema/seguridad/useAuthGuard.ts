import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useStore } from '../store';
import { RUTAS } from '../rtdb/rutas/ruta_negocio';
import { logger } from '../monitoreo';
import { deviceBinding } from './vinculacionDispositivo';
import { obtenerRutaPorRol } from '../../negocio/roles/redireccionRol';
import type { RolDispositivoCanonico } from '../../negocio/roles/catalogoRoles';

/**
 * 🛡️ GUARDIA DE AUTENTICACIÓN (Auth Guard)
 * Vigila las fronteras del sistema:
 * - En Web: valida la sesión autorizada del negocio y entra directamente a la experiencia comercial sin reproducir la vinculación física de un dispositivo Android.
 * - En Android/Nativo: verifica la vinculación del dispositivo y presenta los perfiles operativos habilitados.
 */
export function useAuthGuard(isSystemReady: boolean) {
  const router = useRouter();
  const segments = useSegments();
  const negocioId = useStore((s) => s.sesion.negocioId);
  const rutaNegocio = useStore((s) => s.sesion.rutaNegocio);
  const clearSession = useStore((s) => s.clearSession);
  const [deviceChecked, setDeviceChecked] = useState(false);
  const [isDeviceRegisteredState, setIsDeviceRegisteredState] = useState(false);
  const esWeb = Platform.OS === 'web';

  // 1. Validar vinculación física del dispositivo únicamente en Android/Nativo
  useEffect(() => {
    if (!isSystemReady) return;

    if (esWeb) {
      setIsDeviceRegisteredState(true);
      setDeviceChecked(true);
      return;
    }

    const verificarDispositivo = async () => {
      try {
        const registrado = await deviceBinding.isDeviceRegistered();
        setIsDeviceRegisteredState(registrado);
        if (registrado && typeof rutaNegocio === 'string') {
          await deviceBinding.updateLastAccess(rutaNegocio);
          logger.info('AUTH', '🛡️ Dispositivo verificado físicamente en frontera.');
        } else if (!registrado) {
          logger.warn('AUTH', '⚠️ Dispositivo no registrado físicamente en frontera.');
        }
        setDeviceChecked(true);
      } catch (error) {
        logger.error('AUTH', '❌ Error al verificar dispositivo en frontera', error as Error);
        setIsDeviceRegisteredState(true);
        setDeviceChecked(true);
      }
    };

    void verificarDispositivo();
  }, [esWeb, isSystemReady, rutaNegocio]);

  // 2. Controlar la navegación en base a la sesión y el estado de validación
  useEffect(() => {
    if (!isSystemReady || !deviceChecked) return;

    const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'vinculacion';

    // 1. Acceso denegado: sin ID de negocio o dispositivo no registrado (en nativo)
    if ((!negocioId || !isDeviceRegisteredState) && !inAuthGroup) {
      logger.warn(
        'AUTH',
        '⛔ Sesión ausente o desvinculación detectada. Limpiando sesión y redirigiendo a acceso.'
      );
      void clearSession().then(() => {
        router.replace(RUTAS.AUTH.LOGIN);
      });
      return;
    }

    // 2. Sesión activa: verificar consistencia de EstadoEncendido y rol activo
    if (negocioId && isDeviceRegisteredState) {
      void import('./guardiaArranqueO1').then(async ({ evaluarGuardiaArranque }) => {
        const { getSecundariaRtdb } = await import('../firebase');
        const evaluacion = await evaluarGuardiaArranque(getSecundariaRtdb());

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
          if (esWeb && evaluacion.rolActivo) {
            const rutaDestino = obtenerRutaPorRol(evaluacion.rolActivo as RolDispositivoCanonico);
            logger.info('AUTH', '✅ Sesión web válida. Ingresando directamente a la aplicación.');
            router.replace(rutaDestino as any);
          } else {
            logger.info('AUTH', '✅ Sesión y dispositivo válidos. Redirigiendo a Roles.');
            router.replace(RUTAS.ROLES.SELECTOR);
          }
        }
      });
    }
  }, [
    esWeb,
    isSystemReady,
    deviceChecked,
    isDeviceRegisteredState,
    segments,
    negocioId,
    router,
    clearSession,
  ]);
}
