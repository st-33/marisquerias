/**
 * 🧠 CEREBRO DE AJUSTES ADMINISTRATIVOS
 * Hook que gestiona la personalización de identidad, logo y selector de roles del negocio.
 * Dogma ADI: Toda persistencia y conexión a RTDB reside exclusivamente en esta capa.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { onValue, ref, update } from 'firebase/database';
import { getRtdb } from '../../../sistema/firebase';
import { useStore } from '../../../sistema/store';
import { logger } from '../../../sistema/monitoreo';

export type EstiloSelector = 'orbes' | 'pastillas' | 'conmutable';

export function useLogicaAjustesAdmin() {
  const router = useRouter();
  const db = getRtdb();

  const rutaNegocio = useStore((s) => s.sesion.rutaNegocio) || '';
  const negocioId = useStore((s) => s.sesion.negocioId) || '';
  const urlUnidad = useStore((s) => s.dataSources?.operacionUrl) || '';
  const configStore = useStore((s) => s.negocio?.configuracion);
  const updateConfiguracion = useStore((s) => s.updateConfiguracion);

  const [nombre, setNombre] = useState(configStore?.nombre || '');
  const [logoUrl, setLogoUrl] = useState(configStore?.logo_url || '');
  const [estiloSelector, setEstiloSelector] = useState<EstiloSelector>(
    configStore?.estilo_selector_roles || 'conmutable'
  );

  const [cargando, setCargando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincronización en tiempo real desde RTDB si existen valores remotos
  useEffect(() => {
    if (!rutaNegocio) return;

    const rutaConfig = `${rutaNegocio}/configuracion`;
    const unsub = onValue(
      ref(db, rutaConfig),
      (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          if (val && typeof val === 'object') {
            if (val.nombre && typeof val.nombre === 'string') setNombre(val.nombre);
            if (val.logo_url && typeof val.logo_url === 'string') setLogoUrl(val.logo_url);
            if (
              val.estilo_selector_roles === 'orbes' ||
              val.estilo_selector_roles === 'pastillas' ||
              val.estilo_selector_roles === 'conmutable'
            ) {
              setEstiloSelector(val.estilo_selector_roles);
            }
          }
        }
      },
      (err) => {
        logger.warn('AJUSTES_ADMIN', 'Error al leer configuracion remota', { error: err });
      }
    );

    return () => unsub();
  }, [db, rutaNegocio]);

  const guardarCambios = useCallback(async (): Promise<boolean> => {
    if (!nombre.trim()) {
      setError('El nombre comercial no puede estar vacío');
      return false;
    }

    setCargando(true);
    setError(null);
    setGuardadoExitoso(false);

    try {
      const updates = {
        nombre: nombre.trim(),
        logo_url: logoUrl.trim(),
        estilo_selector_roles: estiloSelector,
        ultima_actualizacion: Date.now(),
      };

      // 1. Actualizar Store centralizado unificado
      updateConfiguracion(updates);

      // 2. Persistir en RTDB del negocio si hay ruta conectada
      if (rutaNegocio) {
        await update(ref(db, `${rutaNegocio}/configuracion`), updates);
        // Sincronizar también nodo raíz /nombre por compatibilidad
        await update(ref(db, rutaNegocio), { nombre: nombre.trim() });
      }

      setCargando(false);
      setGuardadoExitoso(true);
      setTimeout(() => setGuardadoExitoso(false), 3000);
      return true;
    } catch (e: any) {
      logger.error('AJUSTES_ADMIN', 'Error al guardar ajustes', e);
      setError(e?.message || 'Error al persistir configuración');
      setCargando(false);
      return false;
    }
  }, [nombre, logoUrl, estiloSelector, rutaNegocio, db, updateConfiguracion]);

  const probarEstiloEnRoles = useCallback(() => {
    router.push('/_role/roles');
  }, [router]);

  return {
    nombre,
    logoUrl,
    estiloSelector,
    rutaNegocio,
    negocioId,
    urlUnidad,
    cargando,
    guardadoExitoso,
    error,
    setNombre,
    setLogoUrl,
    setEstiloSelector,
    guardarCambios,
    probarEstiloEnRoles,
  };
}
