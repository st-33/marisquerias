/**
 * 🚀 ARRANQUE O(1) END-TO-END DEL SISTEMA
 *
 * Flujo canónico:
 * a) Leer código de acceso (6-8 caracteres).
 * b) resolver-access-code → ConfiguracionNegocio + db_url_operativa.
 * c) cargarNPB → NegocioPlantillaBase validado.
 * d) encenderCapacidades → EstadoEncendido.
 * e) Guardar EstadoEncendido en el store global.
 * f) Determinar rol por defecto o selección múltiple.
 *
 * Cualquier fallo en b, c o d detiene el arranque con error explícito.
 */

import { useCallback, useEffect, useState } from 'react';
import { get, ref } from 'firebase/database';
import type { Database } from 'firebase/database';
import { resolverAccessCodeO1 } from './vinculacion/resolver-access-code';
import { cargarNPB } from './npb/cargarNPB';
import { encenderCapacidades, type EstadoEncendido } from './npb/encenderCapacidades';
import type { NegocioPlantillaBase } from './npb/tiposNPB';
import type { ConfiguracionNegocio } from './npb/tiposNegocio';
import type { RolDispositivoCanonico } from '../../negocio/roles/catalogoRoles';
import { resolverRolPorDefecto } from '../../negocio/roles/redireccionRol';
import { guardarSesionO1, leerSesionO1 } from './npb/persistenciaSesionO1';
import { revalidarVersionNPB } from './reconexion/monitorConexionO1';
import { clasificarErrorArranque, type InfoErrorArranque } from './npb/erroresArranque';
import { useStore } from '../store';
import { logger } from '../monitoreo';
import { getSecundariaRtdb } from '../firebase';
import { RUTA_RAIZ_UNIDAD_OPERATIVA } from '../rtdb/rutas/ruta_negocio';

export interface ResultadoArranqueO1Exitoso {
  ok: true;
  negocio: ConfiguracionNegocio;
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
    const { negocio, db_url_operativa: dbUrlInicial } = await resolverAccessCodeO1(db, cleanCode);
    let db_url_operativa = dbUrlInicial || negocio.db_url_operativa || '';

    // Si el código era una referencia O(1) hacia la ruta secundaria del negocio:
    const rutaRemota = (negocio.ruta_negocio as string) || (negocio as any).nodoPath || '';
    if (rutaRemota && (!db_url_operativa || !negocio.capacidades_autorizadas)) {
      try {
        const snapNegocio = await get(ref(db, rutaRemota));
        if (snapNegocio && typeof snapNegocio.exists === 'function' && snapNegocio.exists()) {
          const cfg = snapNegocio.val();
          if (cfg && typeof cfg === 'object') {
            if (!db_url_operativa) {
              db_url_operativa = cfg.db_url_operativa || cfg.url_unidad || cfg.operacionUrl || cfg.operacion_url || '';
            }
            if (cfg.capacidades_autorizadas && !negocio.capacidades_autorizadas) {
              const caps = cfg.capacidades_autorizadas;
              negocio.capacidades_autorizadas = Array.isArray(caps)
                ? caps
                : Object.entries(caps).filter(([, v]) => v === true).map(([k]) => k as any);
            }
            if (cfg.nombre_comercial && !negocio.nombre_comercial) {
              negocio.nombre_comercial = cfg.nombre_comercial;
            }
            if (cfg.roles_permitidos && !negocio.roles_permitidos) {
              negocio.roles_permitidos = cfg.roles_permitidos;
            }
          }
        }
      } catch (err) {
        logger.warn('ARRANQUE_O1', 'No se pudo leer la configuración remota en rutaNegocio', { error: err });
      }
    }

    // 1b. Validar que el código pertenezca a la categoría Marisquerías
    const esPlantilla = negocio.tipo_acceso === 'plantilla';
    const catSlug = (negocio.slug_categoria || '').toLowerCase();
    const catId = (negocio.categoria_id || '').toLowerCase();
    if (!esPlantilla && catSlug && catSlug !== 'marisquerias' && catId !== '01') {
      throw new Error(
        `El código de acceso no corresponde a la categoría Marisquerías (pertenece a '${catSlug}').`
      );
    }

    // 1c. Validar asignación de Unidad Operativa para el negocio
    if (!esPlantilla && (!db_url_operativa || !db_url_operativa.trim().startsWith('http'))) {
      throw new Error(
        'El negocio no tiene asignada una Unidad Operativa válida en Unidad Secundaria.'
      );
    }

    // 2. Cargar NPB 00 y validar compatibilidad
    const npb = await cargarNPB(db, negocio.slug_categoria, negocio.version_npb_origen);

    // 3. Encender capacidades y roles (intersección NPB ∩ Negocio)
    const estadoEncendido = encenderCapacidades(npb, negocio);

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
      rutaNegocio: RUTA_RAIZ_UNIDAD_OPERATIVA,
      ruta_negocio: RUTA_RAIZ_UNIDAD_OPERATIVA,
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
      tipo_acceso: estadoEncendido.tipo_acceso,
    });

    logger.info('ARRANQUE_O1', 'Arranque O(1) completado con éxito', {
      negocioId: negocio.negocio_id,
      categoria: negocio.slug_categoria,
      tipoAcceso: estadoEncendido.tipo_acceso,
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

/**
 * 🚀 HOOK CANÓNICO DE ARRANQUE DEL SISTEMA (O(1))
 * Utilizado por app/_layout.tsx para inicializar la aplicación:
 * - Restaura sesión válida desde persistenciaSesionO1
 * - Hidrata EstadoEncendido en el store global
 * - Activa monitorConexionO1 (revalidación de NPB)
 * - Retorna isReady: boolean
 */
export function useArranqueSistema(): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const arrancar = async () => {
      try {
        logger.info('ARRANQUE_SISTEMA', '⚡ Iniciando arranque O(1) desde persistencia...');
        const lectura = await leerSesionO1();
        const store = useStore.getState();

        if (lectura.valida && lectura.sesion) {
          const { sesion } = lectura;

          // Cargar EstadoEncendido
          if (sesion.estadoEncendido) {
            store.setEstadoEncendido(sesion.estadoEncendido);
          }

          // Cargar dataSources operativos
          if (sesion.db_url_operativa) {
            await store.setDataSources({ operacionUrl: sesion.db_url_operativa });
          }

          // Inyectar sesión en store
          await store.setSession({
            access_code: sesion.codigo_acceso_hash,
            negocioId: sesion.negocio_id,
            negocio_id: sesion.negocio_id,
            categoria_id: sesion.slug_categoria,
            category: sesion.slug_categoria,
            niche: sesion.slug_categoria,
            rutaNegocio: RUTA_RAIZ_UNIDAD_OPERATIVA,
            ruta_negocio: RUTA_RAIZ_UNIDAD_OPERATIVA,
            rol: (sesion.rol_activo as any) || 'mesero',
          });

          // Activar monitor de reconexión / revalidación en segundo plano usando Unidad Secundaria
          try {
            const dbSecundaria = getSecundariaRtdb();
            void revalidarVersionNPB(
              dbSecundaria,
              sesion.slug_categoria,
              sesion.version_npb_origen
            );
          } catch {
            // Silencioso si no hay conexión
          }
        }

        // Cargar hardware y dataSources locales
        await Promise.all([store.loadDataSources(), store.loadHardware()]);

        if (mounted) {
          logger.info('ARRANQUE_SISTEMA', '✅ Sistema O(1) listo para operar');
          setIsReady(true);
        }
      } catch (error) {
        logger.error('ARRANQUE_SISTEMA', '❌ Error fatal en arranque O(1)', error as Error);
        if (mounted) setIsReady(true);
      }
    };

    void arrancar();

    return () => {
      mounted = false;
    };
  }, []);

  return isReady;
}

// Alias retrocompatibles
export { useArranqueSistema as useBootstrapper };
