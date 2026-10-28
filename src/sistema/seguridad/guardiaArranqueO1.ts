/**
 * 🛡️ EVALUADOR DE GUARDIA DE ARRANQUE O(1)
 *
 * Verifica el estado de la sesión y el EstadoEncendido al navegar:
 * 1. Sin sesión o expirada (> 30 días) → Redirige a Vinculación.
 * 2. Sesión activa sin EstadoEncendido en store → Recarga desde persistencia local o configuración del negocio.
 * 3. Rol activo ausente de los roles habilitados para el negocio → Redirige a selección de rol.
 */

import { get, ref, type Database } from 'firebase/database';
import { leerSesionO1 } from '../instalacion/npb/persistenciaSesionO1';
import { encenderCapacidades } from '../instalacion/npb/encenderCapacidades';
import { useStore } from '../store';
import { logger } from '../monitoreo';

export interface ResultadoGuardiaArranque {
  estado: 'sin_sesion' | 'sesion_expirada' | 'recargado_ok' | 'requiere_seleccion_rol' | 'error';
  rolActivo: string | null;
  error?: string;
}

export async function evaluarGuardiaArranque(db?: Database): Promise<ResultadoGuardiaArranque> {
  const { existe, valida, expirada, sesion } = await leerSesionO1();

  if (!existe || !valida) {
    return {
      estado: expirada ? 'sesion_expirada' : 'sin_sesion',
      rolActivo: null,
    };
  }

  if (!sesion) {
    return { estado: 'sin_sesion', rolActivo: null };
  }

  const store = useStore.getState();
  let estadoEncendido = store.estadoEncendido;

  if (!estadoEncendido) {
    if (sesion.estadoEncendido) {
      estadoEncendido = sesion.estadoEncendido;
      store.setEstadoEncendido(estadoEncendido);
    } else if (db && sesion.ruta_configuracion_secundaria) {
      try {
        const snap = await get(ref(db, sesion.ruta_configuracion_secundaria));
        if (snap.exists()) {
          const datos = snap.val() as Record<string, unknown>;
          estadoEncendido = encenderCapacidades({
            negocio_id: sesion.negocio_id,
            slug_categoria: sesion.slug_categoria,
            capacidades_autorizadas: datos.capacidades_autorizadas as any,
            roles_permitidos: (datos.roles_autorizados ?? datos.roles_permitidos) as any,
          });
          store.setEstadoEncendido(estadoEncendido);
        }
      } catch (err) {
        logger.warn(
          'GUARDIA_ARRANQUE',
          'No se pudo consultar la configuración del negocio al recargar',
          { error: (err as Error).message }
        );
      }
    }
  }

  if (!estadoEncendido) {
    return { estado: 'sin_sesion', rolActivo: null };
  }

  const rolActivo = sesion.rol_activo;
  const esRolValido =
    rolActivo !== null && (estadoEncendido.roles_activos as string[]).includes(rolActivo);

  if (!esRolValido) {
    return {
      estado: 'requiere_seleccion_rol',
      rolActivo,
    };
  }

  return {
    estado: 'recargado_ok',
    rolActivo,
  };
}
