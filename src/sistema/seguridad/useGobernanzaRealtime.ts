import { useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { useRouter } from 'expo-router';
import { useStore } from '../store';
import { logger } from '../monitoreo';
import { RUTAS } from '../../compartido/rutas';
import { resolverDeviceIdADI } from '../instalacion/vinculacion/generar-device-id-adi';

/**
 * 🛰️ HOOK DE GOBERNANZA Y SUSPENSIÓN EN TIEMPO REAL (Torre de Control)
 *
 * Contrato de Gobernanza:
 * 1. Escucha `Marisquerias/{idNegocio}/activo`: si cambia a `false`, bloquea la operativa inmediatamente.
 * 2. Escucha `Marisquerias/{idNegocio}/dispositivos/{deviceId}/estado`: reacciona si el dispositivo pasa a "bloqueado".
 * 3. Respeta los módulos en `Marisquerias/{idNegocio}/bloqueados` (Caja, Cocina, Mesero, Reparto).
 * 4. La aplicación opera como cliente operativo puro.
 */
export function useGobernanzaRealtime(isReady: boolean) {
  const router = useRouter();
  const tenantPath = useStore((s) => s.sesion.tenantPath);
  const clearSession = useStore((s) => s.clearSession);
  const setModulosBloqueados = useStore((s) => s.setModulosBloqueados);
  const setEstadoInstalacion = useStore((s) => s.setEstadoInstalacion);

  useEffect(() => {
    if (!isReady || !tenantPath) return;

    let activoRef: any = null;
    let activoCallback: any = null;
    let devRef: any = null;
    let devCallback: any = null;
    let devLegacyRef: any = null;
    let devLegacyCallback: any = null;
    let bloqueadosRef: any = null;
    let bloqueadosCallback: any = null;

    const iniciarGobernanza = async () => {
      try {
        const { getRtdb } = await import('../firebase');
        const db = getRtdb();
        const deviceId = await resolverDeviceIdADI();

        // 1. Escuchar {tenantPath}/activo (Suspensión total del negocio)
        activoRef = ref(db, `${tenantPath}/activo`);
        activoCallback = onValue(activoRef, (snapshot) => {
          if (snapshot.exists()) {
            const activo = snapshot.val();
            if (activo === false || activo === 'false' || activo === 0) {
              logger.warn(
                'GOBERNANZA',
                `🚨 Negocio suspendido por Torre de Control: ${tenantPath}`
              );
              setEstadoInstalacion('BLOQUEADA');
              void clearSession().then(() => {
                router.replace(RUTAS.AUTH.LOGIN);
              });
            }
          }
        });

        // 2. Escuchar {tenantPath}/dispositivos/{deviceId}/estado (Bloqueo de terminal)
        devRef = ref(db, `${tenantPath}/dispositivos/${deviceId}/estado`);
        devCallback = onValue(devRef, (snapshot) => {
          if (snapshot.exists()) {
            const estado = snapshot.val();
            if (estado === 'bloqueado' || estado === 'inactivo' || estado === 'revocado') {
              logger.warn(
                'GOBERNANZA',
                `🚨 Dispositivo ${deviceId} marcado como ${estado} por Torre de Control`
              );
              setEstadoInstalacion('BLOQUEADA');
              void clearSession().then(() => {
                router.replace(RUTAS.AUTH.LOGIN);
              });
            }
          }
        });

        // 2.1 Compatibilidad: Escuchar {tenantPath}/dispositivos_autorizados/{deviceId}/estado
        devLegacyRef = ref(db, `${tenantPath}/dispositivos_autorizados/${deviceId}/estado`);
        devLegacyCallback = onValue(devLegacyRef, (snapshot) => {
          if (snapshot.exists()) {
            const estado = snapshot.val();
            if (estado === 'bloqueado' || estado === 'inactivo' || estado === 'revocado') {
              logger.warn(
                'GOBERNANZA',
                `🚨 Dispositivo ${deviceId} bloqueado en dispositivos_autorizados`
              );
              setEstadoInstalacion('BLOQUEADA');
              void clearSession().then(() => {
                router.replace(RUTAS.AUTH.LOGIN);
              });
            }
          }
        });

        // 3. Escuchar {tenantPath}/bloqueados (Módulos bloqueados en tiempo real)
        bloqueadosRef = ref(db, `${tenantPath}/bloqueados`);
        bloqueadosCallback = onValue(bloqueadosRef, (snapshot) => {
          let listaBloqueados: string[] = [];
          if (snapshot.exists()) {
            const val = snapshot.val();
            if (Array.isArray(val)) {
              listaBloqueados = val.map((v) => String(v));
            } else if (val && typeof val === 'object') {
              listaBloqueados = Object.entries(val)
                .filter(([_, activo]) => activo === true || activo === 'true' || activo === 1)
                .map(([k]) => k);
            } else if (typeof val === 'string') {
              listaBloqueados = val.split(',').map((s) => s.trim());
            }
          }
          setModulosBloqueados(listaBloqueados);
          logger.info(
            'GOBERNANZA',
            `Módulos bloqueados actualizados: [${listaBloqueados.join(', ')}]`
          );
        });
      } catch (error) {
        logger.error('GOBERNANZA', 'Error iniciando listeners de gobernanza', error as Error);
      }
    };

    iniciarGobernanza();

    return () => {
      if (activoRef && activoCallback) off(activoRef, 'value', activoCallback);
      if (devRef && devCallback) off(devRef, 'value', devCallback);
      if (devLegacyRef && devLegacyCallback) off(devLegacyRef, 'value', devLegacyCallback);
      if (bloqueadosRef && bloqueadosCallback) off(bloqueadosRef, 'value', bloqueadosCallback);
    };
  }, [isReady, tenantPath, router, clearSession, setModulosBloqueados, setEstadoInstalacion]);
}
