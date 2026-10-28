import { get, ref, type Database } from 'firebase/database';
import { descomponer_ruta_negocio, type IdentidadNegocio } from '../../rtdb/rutas/ruta_negocio';
import type { NegocioReal, RespuestaAccessCode, TipoAccesoCodigo } from '../npb/tiposNegocioReal';
import type { CapacidadCanonica } from '../npb/tiposNPB';

export interface InfoAccessCode extends IdentidadNegocio {
  accessCode: string;
  estado: 'activo' | 'usado' | 'revocado' | 'expirado';
  negocio: NegocioReal;
  db_url_operativa: string;
  nodoPath: string;
}

/**
 * Valida estrictamente la referencia del índice /codigo_de_acceso/{CODIGO}.
 * Contrato canónico (Punto 4 y 9):
 *   "{clave_nicho}/{clave_categoria}/negocio/{clave_negocio}"
 *   o "{clave_nicho}/{clave_categoria}/negocio_plantilla_base" para exploración de plantilla.
 */
function leerRutaIndiceAcceso(valor: unknown): string {
  if (typeof valor !== 'string') {
    throw new Error('Estructura de ruta inválida o incompleta');
  }
  const ruta = valor.trim().replace(/^\/+|\/+$/g, '');
  if (!ruta || /[.#$\[\]\u0000-\u001f\u007f]/.test(ruta)) {
    throw new Error('Estructura de ruta inválida o incompleta');
  }
  const partes = ruta.split('/');
  const esNegocioReal =
    partes.length === 4 &&
    partes.every((p) => Boolean(p.trim())) &&
    partes[2] === 'negocio';
  const esPlantillaBase =
    partes.length === 3 &&
    partes.every((p) => Boolean(p.trim())) &&
    partes[2] === 'negocio_plantilla_base';

  if (!esNegocioReal && !esPlantillaBase) {
    throw new Error('Estructura de ruta inválida o incompleta');
  }
  return ruta;
}

export async function resolverNegocioPorCodigo(
  codigo: string,
  db: Database
): Promise<string | null> {
  const limpio = codigo.trim().toUpperCase();
  if (!limpio || /[.#$\[\]/\u0000-\u001f\u007f]/.test(limpio)) return null;
  const snap = await get(ref(db, `codigo_de_acceso/${limpio}`));
  return snap.exists() ? leerRutaIndiceAcceso(snap.val()) : null;
}

function extraerCapacidadesConfiguradas(datos: Record<string, unknown>): CapacidadCanonica[] {
  const fuente = datos.capacidades_autorizadas ?? datos.capacidades;
  if (Array.isArray(fuente)) {
    return fuente
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && typeof (item as Record<string, unknown>).id === 'string') {
          const obj = item as Record<string, unknown>;
          if (obj.estado === 'dormido' || obj.estado === 'inactivo' || obj.habilitada === false) {
            return '';
          }
          return obj.id as string;
        }
        return '';
      })
      .filter(Boolean) as CapacidadCanonica[];
  }
  if (fuente && typeof fuente === 'object') {
    return Object.entries(fuente as Record<string, unknown>)
      .filter(([, valor]) => {
        if (valor === true) return true;
        if (valor && typeof valor === 'object') {
          const obj = valor as Record<string, unknown>;
          return obj.estado === 'activo' || obj.habilitada === true || obj.activa === true;
        }
        return false;
      })
      .map(([id]) => id as CapacidadCanonica);
  }
  return [];
}

function extraerRolesPermitidos(datos: Record<string, unknown>): string[] | undefined {
  if (Array.isArray(datos.roles_autorizados)) {
    return datos.roles_autorizados.filter((r): r is string => typeof r === 'string');
  }
  if (Array.isArray(datos.roles_permitidos)) {
    return datos.roles_permitidos.filter((r): r is string => typeof r === 'string');
  }
  if (Array.isArray(datos.roles_dispositivo)) {
    return datos.roles_dispositivo
      .map((r) => (typeof r === 'string' ? r : (r as Record<string, unknown>)?.id))
      .filter((r): r is string => typeof r === 'string');
  }
  return undefined;
}

/**
 * Resuelve:
 *   CÓDIGO INGRESADO -> /codigo_de_acceso/{CODIGO} -> RUTA DE CONFIGURACIÓN ->
 *   CONFIGURACIÓN DEL NEGOCIO -> URL DE SU UNIDAD OPERATIVA -> APLICACIÓN OPERATIVA.
 * No escribe en RTDB ni persiste sesiones parciales.
 */
export async function resolverAccessCode(
  db: Database,
  accessCode: string
): Promise<InfoAccessCode> {
  const codigo = accessCode.trim().toUpperCase();
  if (!codigo) throw new Error('El código de acceso no puede estar vacío');
  const ruta = await resolverNegocioPorCodigo(codigo, db);
  if (!ruta) throw new Error('Código de acceso no encontrado o inválido');

  const partes = ruta.split('/');
  const esPlantillaRuta = partes.length === 3 && partes[2] === 'negocio_plantilla_base';
  const identidad = descomponer_ruta_negocio(ruta);
  if (!identidad) throw new Error('Estructura de ruta inválida o incompleta');

  const snap = await get(ref(db, ruta));
  if (!snap.exists()) {
    throw new Error('No existe la configuración del negocio asociado al código');
  }

  const datos = snap.val() as Record<string, unknown> | null;
  if (!datos || typeof datos !== 'object') {
    throw new Error('No existe la configuración del negocio asociado al código');
  }

  if (datos.estado === 'revocado' || datos.estado === 'suspendido' || datos.estado === 'inactivo') {
    throw new Error('El código de acceso está revocado o el negocio fue suspendido');
  }

  const esPlantilla = esPlantillaRuta || datos.es_plantilla_base === true || datos.tipo_acceso === 'plantilla';
  if (!esPlantilla && datos.estado !== 'activo') {
    throw new Error('El negocio no está activo para acceso operativo');
  }
  if (esPlantilla && datos.estado && datos.estado !== 'sellado' && datos.estado !== 'activo') {
    throw new Error('La plantilla base no está activa para exploración');
  }

  const urlRaw = (datos.url_unidad ?? datos.db_url_operativa ?? '') as string;
  const url = typeof urlRaw === 'string' ? urlRaw.trim() : '';
  if (!esPlantilla && !/^https:\/\/[^/]+\/?$/.test(url)) {
    throw new Error('El negocio no tiene una Unidad Operativa válida');
  }

  const capacidades = extraerCapacidadesConfiguradas(datos);
  const rolesPermitidos = extraerRolesPermitidos(datos);
  const tipoAcceso: TipoAccesoCodigo = esPlantilla ? 'plantilla' : 'negocio_real';
  const negocioId = esPlantilla
    ? '00'
    : String(datos.id || datos.negocio_id || identidad.negocio_id);

  const negocio: NegocioReal = {
    negocio_id: negocioId,
    categoria_id: identidad.categoria_id,
    slug_categoria: String(datos.slug_categoria || identidad.categoria_id),
    ruta_configuracion_secundaria: ruta,
    cliente_id: String(datos.cliente_id || ''),
    estado: 'activo',
    db_url_operativa: url,
    tipo_acceso: tipoAcceso,
    nombre_comercial: String(datos.nombre_comercial || datos.nombre || identidad.negocio_id),
    capacidades_autorizadas: capacidades,
    roles_permitidos: rolesPermitidos,
    cajones_dormidos_forzados: Array.isArray(datos.cajones_dormidos_forzados)
      ? (datos.cajones_dormidos_forzados as any)
      : undefined,
    configuracion_operativa:
      datos.unidad && typeof datos.unidad === 'object'
        ? (datos.unidad as Record<string, unknown>)
        : undefined,
  };

  return {
    ...identidad,
    accessCode: codigo,
    estado: 'activo',
    negocio,
    db_url_operativa: url,
    nodoPath: `codigo_de_acceso/${codigo}`,
  };
}

export async function resolverAccessCodeO1(
  db: Database,
  accessCode: string
): Promise<RespuestaAccessCode> {
  const resultado = await resolverAccessCode(db, accessCode);
  return {
    negocio: resultado.negocio,
    db_url_operativa: resultado.db_url_operativa,
    tipo_acceso: resultado.negocio.tipo_acceso,
  };
}
