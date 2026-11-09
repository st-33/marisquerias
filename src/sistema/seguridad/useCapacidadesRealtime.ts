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
 * ⚡ HOOK DE SINCRONIZACIÓN DE CAPACIDADES EN TIEMPO REAL (REGLAS 25, 34 Y 41)
 *
 * Escucha reactivamente la ruta canónica `${rutaSec}/capacidades_autorizadas`
 * en Unidad Secundaria sin polling ni lecturas masivas.
 *
 * Invariantes garantizadas:
 * 1. Preservación íntegra de gobernanza: tipo_acceso, roles_permitidos, cajones_dormidos_forzados.
 * 2. Idempotencia estricta (Arranque O(1) == Caliente).
 * 3. Cancelación sincrónica en desmontaje contra fugas de memoria.
 * 4. Supresión reactiva de timestamps en reposo (Anti-OOM) para evitar re-renders en cascada.
 */
export function useCapacidadesRealtime(isReady: boolean) {
  const rutaSecundaria = useStore(
    (s) =>
      (s.sesion as any).ruta_configuracion_secundaria ||
      (s.sesion as any).ruta_secundaria ||
      (s.sesion.ruta_negocio && s.sesion.ruta_negocio !== '/' ? s.sesion.ruta_negocio : null)
  );
  const slugCategoria = useStore(
    (s) => s.sesion.category || s.sesion.categoria_id || 'marisquerias'
  );
  const setEstadoEncendido = useStore((s) => s.setEstadoEncendido);

  useEffect(() => {
    if (!isReady || !rutaSecundaria) return;

    let cancelado = false;
    let capsRef: any = null;
    let capsCallback: any = null;

    const iniciarSincronizacionCapacidades = async () => {
      try {
        const dbSec = getSecundariaRtdb();
        const cleanPath = rutaSecundaria.replace(/^\/+|\/+$/g, '');
        const pathCapacidades = `${cleanPath}/capacidades_autorizadas`;
        capsRef = ref(dbSec, pathCapacidades);

        // Resolver la versión dinámica del NPB desde el estado actual
        const versionNpb =
          useStore.getState().estadoEncendido?.version_npb ??
          (useStore.getState().sesion as any)?.version_npb_origen ??
          1;

        const npb = await cargarNPB(dbSec, slugCategoria, versionNpb);
        if (cancelado) return;

        capsCallback = onValue(capsRef, (snapshot) => {
          if (cancelado) return;

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
          const prev = store.estadoEncendido;

          // Reconstitución íntegra de gobernanza (Regla 41.1)
          const nuevoEstadoEncendido = encenderCapacidades(npb, {
            negocio_id: sesionActual.negocio_id || sesionActual.negocioId || prev?.negocio_id,
            tipo_acceso: prev?.tipo_acceso ?? (sesionActual as any).tipo_acceso ?? 'negocio_real',
            roles_permitidos:
              (sesionActual as any).roles_permitidos ||
              (prev?.roles_activos ? [...prev.roles_activos, ...prev.roles_dormidos] : undefined),
            cajones_dormidos_forzados:
              (sesionActual as any).cajones_dormidos_forzados ||
              (prev as any)?.cajones_dormidos_forzados,
            capacidades_autorizadas: capacidadesAutorizadas as any,
          });

          // Comparación estructural estricta antes de mutar Zustand (Reglas 34 y 41.3)
          if (prev) {
            const prevCaps = (prev.capacidades_activas || []).slice().sort().join(',');
            const nextCaps = (nuevoEstadoEncendido.capacidades_activas || []).slice().sort().join(',');
            const prevRoles = (prev.roles_activos || []).slice().sort().join(',');
            const nextRoles = (nuevoEstadoEncendido.roles_activos || []).slice().sort().join(',');
            const prevCajones = (prev.cajones_activos || []).slice().sort().join(',');
            const nextCajones = (nuevoEstadoEncendido.cajones_activos || []).slice().sort().join(',');

            if (
              prevCaps === nextCaps &&
              prevRoles === nextRoles &&
              prevCajones === nextCajones &&
              prev.tipo_acceso === nuevoEstadoEncendido.tipo_acceso
            ) {
              // Estructura idéntica: suprimir mutación reactiva para prevenir re-renders
              return;
            }
          }

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
      cancelado = true;
      if (capsRef && capsCallback) {
        off(capsRef, 'value', capsCallback);
      }
    };
  }, [isReady, rutaSecundaria, slugCategoria, setEstadoEncendido]);
}
