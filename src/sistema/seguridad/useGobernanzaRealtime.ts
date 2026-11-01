import { useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { useRouter } from 'expo-router';
import { useStore } from '../store';
import { logger } from '../monitoreo';
import { RUTAS } from '../rtdb/rutas/ruta_negocio';

/**
 * 🛰️ HOOK DE GOBERNANZA Y REVOCACIÓN EN TIEMPO REAL (Reglas 9, 22, 23 y 24)
 *
 * Contrato Canónico:
 * 1. La Unidad Operativa tiene raíz dedicada; los cajones residen en su raíz (/sesiones/{plaza}).
 * 2. Escucha `sesiones/{plaza}` en tiempo real.
 * 3. Si `estado === 'revocada'`, ejecuta la revocación remota gobernada.
 * 4. Si la plaza es relevada técnicamente por otra terminal, reasigna operador al selector de roles
 *    sin destruir la vinculación física del dispositivo ni adi_device_id_persistent.
 */
export function useGobernanzaRealtime(isReady: boolean) {
  const router = useRouter();
  const clearSession = useStore((s) => s.clearSession);
  const setEstadoInstalacion = useStore((s) => s.setEstadoInstalacion);

  useEffect(() => {
    if (!isReady) return;

    let sesionRef: any = null;
    let sesionCallback: any = null;

    const iniciarGobernanza = async () => {
      try {
        const { getOperacionRtdb } = await import('../firebase');
        const db = getOperacionRtdb();

        const { obtenerSesionOperativaLocal } =
          await import('../usuarios/servicio_sesion_dispositivo');
        const sesionLocal = await obtenerSesionOperativaLocal();

        if (sesionLocal && sesionLocal.slot_id) {
          sesionRef = ref(db, `sesiones/${sesionLocal.slot_id}`);
          sesionCallback = onValue(sesionRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();

              // 🛡️ REGLA 23: Revocación remota explícita desde Torre de Control/Monitoreo
              if (data && data.estado === 'revocada') {
                logger.warn(
                  'GOBERNANZA',
                  `🚨 Terminal revocada remotamente en plaza ${sesionLocal.slot_id} por Torre de Control`
                );
                setEstadoInstalacion('BLOQUEADA');
                void clearSession().then(() => {
                  router.replace(RUTAS.AUTH.LOGIN);
                });
              } else if (
                data &&
                data.token_sesion &&
                sesionLocal.token_sesion &&
                data.token_sesion !== sesionLocal.token_sesion
              ) {
                // Relevo operativo: otra terminal reclamó la plaza por abandono técnico
                logger.warn(
                  'GOBERNANZA',
                  `⚠️ Plaza ${sesionLocal.slot_id} relevada por otra terminal. Reasignando operador.`
                );
                router.replace(RUTAS.ROLES.SELECTOR);
              }
            }
          });
        }
      } catch (error) {
        logger.error('GOBERNANZA', 'Error iniciando listener de plaza operativa', error as Error);
      }
    };

    void iniciarGobernanza();

    return () => {
      if (sesionRef && sesionCallback) {
        off(sesionRef, 'value', sesionCallback);
      }
    };
  }, [isReady, router, clearSession, setEstadoInstalacion]);
}

