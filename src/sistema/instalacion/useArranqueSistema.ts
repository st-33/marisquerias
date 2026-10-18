/**
 * 🚀 ARRANQUE O(1) END-TO-END DEL SISTEMA
 *
 * Flujo canónico:
 * a) Leer código de acceso (6-8 caracteres).
 * b) resolver-access-code → NegocioReal + db_url_operativa.
 * c) cargarNPB → NegocioPlantillaBase validado.
 * d) encenderCapacidades → EstadoEncendido.
 * e) Guardar EstadoEncendido en el store global.
 * f) Determinar rol por defecto o selección múltiple.
 *
 * Cualquier fallo en b, c o d detiene el arranque con error explícito.
 */

import { useCallback, useState } from 'react';
import type { Database } from 'firebase/database';
import { resolverAccessCodeO1 } from './vinculacion/resolver-access-code';
import { cargarNPB } from './npb/cargarNPB';
import { encenderCapacidades, type EstadoEncendido } from './npb/encenderCapacidades';
import type { NegocioPlantillaBase } from './npb/tiposNPB';
import type { NegocioReal } from './npb/tiposNegocioReal';
import type { RolDispositivoCanonico } from '../../negocio/roles/catalogoRoles';
import { resolverRolPorDefecto } from '../../negocio/roles/redireccionRol';
import { guardarSesionO1 } from './npb/persistenciaSesionO1';
import { clasificarErrorArranque, type InfoErrorArranque } from './npb/erroresArranque';
import { useStore } from '../store';
import { logger } from '../monitoreo';

export interface ResultadoArranqueO1Exitoso {
  ok: true;
  negocio: NegocioReal;
  npb: NegocioPlantillaBase;
  estadoEncendido: EstadoEncendido;
  rolPorDefecto: RolDispositivoCanonico;
  rutaPorDefecto: string;
  destinoInicial?: { rol: RolDispositivoCanonico; ruta: string };
  requiereSeleccionRol: boolean;
}

export interface ResultadoArranqueO1Fallo {
  ok: false;
  error: string;
  errorInfo?: InfoErrorArranque;
}

export type ResultadoArranqueO1 = ResultadoArranqueO1Exitoso | ResultadoArranqueO1Fallo;

/**
 * Función pura / ejecutor central del arranque O(1)
 */
export async function ejecutarArranqueO1(
  db: Database,
  codigoAcceso: string
): Promise<ResultadoArranqueO1> {
  const cleanCode = codigoAcceso.trim().toUpperCase();
  if (!cleanCode) {
    return {
      ok: false,
      error: 'El código de acceso es obligatorio para el arranque O(1)',
    };
  }

  try {
    logger.info('ARRANQUE_O1', 'Iniciando resolución O(1) con código', {
      codigo: cleanCode,
    });

    // 1. Resolver código de acceso en Unidad Secundaria
    const { negocio, db_url_operativa } = await resolverAccessCodeO1(db, cleanCode);

    // 2. Cargar NPB 00 y validar compatibilidad
    const npb = await cargarNPB(db, negocio.slug_categoria, negocio.version_npb_origen);

    // 3. Encender capacidades y roles (cálculo de activados / dormidos)
    const estadoEncendido = encenderCapacidades(npb);

    // 4. Guardar EstadoEncendido en el store global
    const store = useStore.getState();
    store.setEstadoEncendido(estadoEncendido);

    // 5. Configurar fuente de datos operativa y sesión
    if (db_url_operativa) {
      await store.setDataSources({ operacionUrl: db_url_operativa });
    }

    const rolesActivos = estadoEncendido.roles_activos;
    const destinoRol = resolverRolPorDefecto(rolesActivos);
    const requiereSeleccionRol = rolesActivos.length > 1;

    await store.setSession({
      access_code: cleanCode,
      negocioId: negocio.negocio_id,
      negocio_id: negocio.negocio_id,
      categoria_id: negocio.categoria_id,
      category: negocio.categoria_id,
      niche: negocio.slug_categoria,
      rutaNegocio: `negocios/${negocio.negocio_id}`,
      ruta_negocio: `negocios/${negocio.negocio_id}`,
      rol: destinoRol.rol,
    });

    // 6. Persistir en AsyncStorage (únicamente tras validar cada paso sin excepción)
    await guardarSesionO1({
      negocio_id: negocio.negocio_id,
      slug_categoria: negocio.slug_categoria,
      version_npb_origen: negocio.version_npb_origen,
      codigo_acceso: cleanCode,
      rol_activo: destinoRol.rol,
      estadoEncendido,
      db_url_operativa,
    });

    logger.info('ARRANQUE_O1', 'Arranque O(1) completado con éxito', {
      negocioId: negocio.negocio_id,
      categoria: negocio.slug_categoria,
      capacidadesActivas: estadoEncendido.capacidades_activas.length,
      rolesActivos: estadoEncendido.roles_activos.length,
    });

    return {
      ok: true,
      negocio,
      npb,
      estadoEncendido,
      rolPorDefecto: destinoRol.rol,
      rutaPorDefecto: destinoRol.ruta,
      destinoInicial: destinoRol,
      requiereSeleccionRol,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido en arranque O(1)';
    const errorInfo = clasificarErrorArranque(error, cleanCode);
    return {
      ok: false,
      error: errorMsg,
      errorInfo,
    };
  }
}

/**
 * Hook para integrar el arranque O(1) en la UI
 */
export function useArranqueO1() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<InfoErrorArranque | null>(null);

  const arrancar = useCallback(
    async (db: Database, codigo: string): Promise<ResultadoArranqueO1> => {
      setLoading(true);
      setError(null);
      setErrorInfo(null);
      try {
        const resultado = await ejecutarArranqueO1(db, codigo);
        if (!resultado.ok) {
          setError(resultado.error);
          setErrorInfo(resultado.errorInfo || null);
        }
        return resultado;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const resetError = useCallback(() => {
    setError(null);
    setErrorInfo(null);
  }, []);

  return {
    loading,
    error,
    errorInfo,
    arrancar,
    resetError,
  };
}

export { useArranqueO1 as useArranqueSistema };
