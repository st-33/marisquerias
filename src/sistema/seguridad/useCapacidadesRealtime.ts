import { useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { useStore } from '../store';
import { getSecundariaRtdb } from '../firebase';
import { encenderCapacidades } from '../instalacion/npb/encenderCapacidades';
import { cargarNPB } from '../instalacion/npb/cargarNPB';
import { CLAVES_SESION_O1 } from '../instalacion/npb/persistenciaSesionO1';
import { storageSesion } from '../almacenamiento/storageSesion';
import { logger } from '../monitoreo';

/**
 * ⚡ HOOK DE SINCRONIZACIÓN DE CAPACIDADES EN TIEMPO REAL
 *
 * Escucha reactivamente la ruta específica `${rutaSec}/capacidades_autorizadas`
 * en Unidad Secundaria sin polling ni lecturas masivas.
 *
 * Cuando Ecosistema conmuta una capacidad (ej. mostrador, comanda de cocina, mesas),
 * este hook recalcula el EstadoEncendido por intersección con el NPB 00 y
 * actualiza el store global en caliente.
 */
export function useCapacidadesRealtime(isReady: boolean) {
  const rutaNegocio = useStore((s) => s.sesion.ruta_negocio || s.sesion.rutaNegocio);
  const slugCategoria = useStore(
    (s) => s.sesion.category || s.sesion.categoria_id || 'marisquerias'
  );
  const setEstadoEncendido = useStore((s) => s.setEstadoEncendido);

  useEffect(() => {
    if (!isReady || !rutaNegocio) return;

    let capsRef: any = null;
    let capsCallback: any = null;

    const iniciarSincronizacionCapacidades = async () => {
      try {
        const dbSec = getSecundariaRtdb();
        const cleanPath = rutaNegocio.replace(/^\/+/, '');
        const pathCapacidades = `${cleanPath}/capacidades_autorizadas`;
        capsRef = ref(dbSec, pathCapacidades);

        // Cargar NPB 00 para calcular intersección canónica (versión 1 canónica)
        const npb = await cargarNPB(dbSec, slugCategoria, 1);

        capsCallback = onValue(capsRef, (snapshot) => {
          const rawCaps = snapshot.exists() ? snapshot.val() : {};
          const capacidadesAutorizadas: string[] = Array.isArray(rawCaps)
            ? rawCaps
            : typeof rawCaps === 'object' && rawCaps !== null
              ? Object.entries(rawCaps)
                  .filter(([, v]) => v === true)
                  .map(([k]) => k)
              : [];

          const store = useStore.getState();
          const sesionActual = store.sesion;

          const nuevoEstadoEncendido = encenderCapacidades(npb, {
            negocio_id: sesionActual.negocio_id || sesionActual.negocioId || undefined,
            capacidades_autorizadas: capacidadesAutorizadas as any,
          });

          // Actualizar en caliente el store global
          setEstadoEncendido(nuevoEstadoEncendido);

          // Persistir en almacenamiento local para reinicios fríos offline
          try {
            void storageSesion.setItem(
              CLAVES_SESION_O1.ESTADO_ENCENDIDO,
              JSON.stringify(nuevoEstadoEncendido)
            );
          } catch {
            // Silencioso
          }

          logger.info('CAPACIDADES_RT', 'Capacidades sincronizadas en caliente desde Ecosistema', {
            activas: nuevoEstadoEncendido.capacidades_activas,
            dormidas: nuevoEstadoEncendido.capacidades_dormidas,
          });
        });
      } catch (error) {
        logger.warn('CAPACIDADES_RT', 'Error al suscribir capacidades autorizadas en tiempo real', {
          error: (error as Error).message,
        });
      }
    };

    void iniciarSincronizacionCapacidades();

    return () => {
      if (capsRef && capsCallback) {
        off(capsRef, 'value', capsCallback);
      }
    };
  }, [isReady, rutaNegocio, slugCategoria, setEstadoEncendido]);
}
