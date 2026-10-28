import { get, ref, type Database } from 'firebase/database';
import { descomponer_ruta_negocio, type IdentidadNegocio } from '../../rtdb/rutas/ruta_negocio';
import type { NegocioReal, RespuestaAccessCode } from '../npb/tiposNegocioReal';
import type { CapacidadCanonica } from '../npb/tiposNPB';

export interface InfoAccessCode extends IdentidadNegocio {
  accessCode: string;
  estado: 'activo' | 'usado' | 'revocado' | 'expirado';
  maxUsos?: number;
  usosActuales?: number;
  expiraEn?: number;
  creadoEn?: number;
  usadoPorDeviceIds?: string[];
  rolesPermitidos?: string[];
  modulosPermitidos?: string[];
  negocio: NegocioReal;
  db_url_operativa: string;
  version_npb_origen: number;
  nodoPath: string;
}

/** La referencia anterior se acepta sólo para lectura durante la migración. */
function leerReferencia(valor: unknown): string {
  const anterior = valor && typeof valor === 'object' ? valor as Record<string, unknown> : null;
  if (anterior?.estado && anterior.estado !== 'activo') throw new Error('El código de acceso está revocado o expirado');
  if (typeof anterior?.expiraEn === 'number' && anterior.expiraEn <= Date.now()) throw new Error('El código de acceso ha expirado temporalmente');
  if (typeof anterior?.maxUsos === 'number' && typeof anterior?.usosActuales === 'number' && anterior.usosActuales >= anterior.maxUsos) throw new Error('El código de acceso ha agotado su límite de usos');
  const ruta = typeof valor === 'string' ? valor : anterior?.ruta_configuracion_secundaria ?? anterior?.ruta;
  if (typeof ruta !== 'string' || /[.#$\[\]\u0000-\u001f\u007f]/.test(ruta)) throw new Error('Estructura de ruta inválida o incompleta');
  const partes = ruta.split('/');
  if (partes.length !== 4 || partes.some(p => !p.trim()) || partes[2] !== 'negocio') throw new Error('Estructura de ruta inválida o incompleta');
  return ruta;
}

export async function resolverNegocioPorCodigo(codigo: string, db: Database): Promise<string | null> {
  const limpio = codigo.trim().toUpperCase();
  if (!limpio || /[.#$\[\]/\u0000-\u001f\u007f]/.test(limpio)) return null;
  const snap = await get(ref(db, `codigo_de_acceso/${limpio}`));
  return snap.exists() ? leerReferencia(snap.val()) : null;
}

/** Índice -> configuración del negocio. No escribe en RTDB ni persiste sesiones parciales. */
export async function resolverAccessCode(db: Database, accessCode: string): Promise<InfoAccessCode> {
  const codigo = accessCode.trim().toUpperCase();
  if (!codigo) throw new Error('El código de acceso no puede estar vacío');
  const ruta = await resolverNegocioPorCodigo(codigo, db);
  if (!ruta) throw new Error('Código de acceso no encontrado o inválido');
  const identidad = descomponer_ruta_negocio(ruta)!;
  const snap = await get(ref(db, ruta));
  if (!snap.exists()) throw new Error('No existe la configuración del negocio asociado al código');
  const datos = snap.val();
  if (!datos || datos.estado !== 'activo' || datos.es_plantilla_base) throw new Error('El negocio no está activo para acceso operativo');
  const url = datos.url_unidad;
  if (typeof url !== 'string' || !/^https:\/\/[^/]+\/?$/.test(url)) throw new Error('El negocio no tiene una Unidad Operativa válida');
  const version = datos.version_npb_origen;
  if (!Number.isInteger(version) || version < 1) throw new Error('La versión de plantilla asignada no es válida');
  const capacidades = Array.isArray(datos.capacidades_autorizadas)
    ? datos.capacidades_autorizadas.filter((id: unknown) => typeof id === 'string')
    : Object.entries(datos.capacidades_autorizadas || {}).filter(([, habilitada]) => habilitada === true).map(([id]) => id);
  const negocio: NegocioReal = {
    negocio_id: datos.id || datos.negocio_id || identidad.negocio_id,
    categoria_id: identidad.categoria_id,
    slug_categoria: identidad.categoria_id,
    ruta_configuracion_secundaria: ruta,
    ruta_npb: `${identidad.contexto_path}/${identidad.categoria_id}/negocio_plantilla_base`,
    version_npb_origen: version,
    cliente_id: '',
    estado: 'activo',
    db_url_operativa: url,
    tipo_acceso: 'negocio_real',
    nombre_comercial: identidad.negocio_id,
    capacidades_autorizadas: capacidades as CapacidadCanonica[],
    roles_permitidos: datos.roles_autorizados,
    cajones_dormidos_forzados: datos.cajones_dormidos_forzados,
  };
  return {
    ...identidad, accessCode: codigo, estado: 'activo', negocio,
    db_url_operativa: url, version_npb_origen: version, nodoPath: `codigo_de_acceso/${codigo}`,
  };
}

export async function resolverAccessCodeO1(db: Database, accessCode: string): Promise<RespuestaAccessCode> {
  const resultado = await resolverAccessCode(db, accessCode);
  return { negocio: resultado.negocio, db_url_operativa: resultado.db_url_operativa };
}
