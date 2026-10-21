/**
 * 🛡️ EVALUADOR DE GUARDIA DE ARRANQUE O(1)
 *
 * Verifica el estado de la sesión y el EstadoEncendido al navegar:
 * 1. Sin sesión o expirada (> 30 días) → Redirige a Vinculación.
 * 2. Sesión activa sin EstadoEncendido en store → Recarga desde NPB o persistencia.
 * 3. Rol activo ausente de los roles habilitados por el NPB → Redirige a selección de rol.
 */

import type { Database } from 'firebase/database';
import { leerSesionO1 } from '../instalacion/npb/persistenciaSesionO1';
import { cargarNPB } from '../instalacion/npb/cargarNPB';
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

  // Si no está en store, recargamos desde la plantilla o el estado cacheado
  if (!estadoEncendido) {
    if (db && sesion.slug_categoria) {
      try {
        const npb = await cargarNPB(db, sesion.slug_categoria, sesion.version_npb_origen);
        estadoEncendido = encenderCapacidades(npb, sesion);
        store.setEstadoEncendido(estadoEncendido);
      } catch (err) {
        logger.warn(
          'GUARDIA_ARRANQUE',
          'No se pudo consultar NPB remoto al recargar; intentando fallback cacheado',
          { error: (err as Error).message }
        );
        if (sesion.estadoEncendido) {
          estadoEncendido = sesion.estadoEncendido;
          store.setEstadoEncendido(estadoEncendido);
        } else {
          return {
            estado: 'error',
            rolActivo: null,
            error: (err as Error).message,
          };
        }
      }
    } else if (sesion.estadoEncendido) {
      estadoEncendido = sesion.estadoEncendido;
      store.setEstadoEncendido(estadoEncendido);
    }
  }

  if (!estadoEncendido) {
    return { estado: 'sin_sesion', rolActivo: null };
  }

  // Verificar si el rol activo actual figura en los roles activos del EstadoEncendido
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
