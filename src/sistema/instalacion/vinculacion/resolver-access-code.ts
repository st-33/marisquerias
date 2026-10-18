import { get, ref } from 'firebase/database';
import type { Database } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  descomponer_ruta_negocio,
  es_ruta_legacy,
  type IdentidadNegocio,
} from '../../rtdb/rutas/ruta_negocio';
import type { NegocioReal, RespuestaAccessCode } from '../npb/tiposNegocioReal';

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

/**
 * Flujo de Login y Resolución (Normativo):
 * Resuelve la ruta del negocio en RTDB a partir del código de acceso.
 *
 * @param codigo - Código de acceso ingresado por el usuario
 * @param db - Instancia de Firebase Database
 * @returns String con la ruta del negocio en RTDB (ej: "marisquerias/mpl") o null si no existe
 */
export async function resolverNegocioPorCodigo(codigo: string, db: any): Promise<string | null> {
  const cod = codigo.trim().toUpperCase();
  if (!cod) return null;
  const snapshot = await get(ref(db, `codigo_de_acceso/${cod}`));
  if (snapshot.exists()) {
    const val = snapshot.val();
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object' && typeof (val as any).tenantPath === 'string') {
      return (val as any).tenantPath;
    }
    if (val && typeof val === 'object' && typeof (val as any).rutaNegocio === 'string') {
      return (val as any).rutaNegocio;
    }
    return typeof val === 'string' ? val : null;
  }
  return null;
}

/**
 * Consulta en Unidad Secundaria si el código de acceso existe y es válido.
 * Fuente Contractual: `codigo_de_acceso/{CODIGO}`
 *
 * Reglas O(1):
 * - Verifica que el código no esté expirado ni revocado.
 * - Retorna NegocioReal + db_url_operativa.
 * - Guarda sesión local en AsyncStorage.
 */
export async function resolverAccessCode(
  db: Database,
  accessCode: string
): Promise<InfoAccessCode> {
  const cleanCode = accessCode.trim().toUpperCase();
  if (!cleanCode) {
    throw new Error('El código de acceso no puede estar vacío');
  }

  const nodoPath = `codigo_de_acceso/${cleanCode}`;
  const codeRef = ref(db, nodoPath);
  const snapshot = await get(codeRef);

  if (!snapshot.exists()) {
    throw new Error('Código de acceso no encontrado o inválido');
  }

  const val: any = snapshot.val();

  let rutaNegocio = '';
  let estado: 'activo' | 'usado' | 'revocado' | 'expirado' = 'activo';
  let maxUsos: number | undefined;
  let usosActuales: number | undefined;
  let expiraEn: number | undefined;
  let creadoEn: number | undefined;
  let usadoPorDeviceIds: string[] = [];
  let rolesPermitidos: string[] | undefined;
  let modulosPermitidos: string[] | undefined;

  if (typeof val === 'string') {
    rutaNegocio = val;
  } else if (val !== null && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    rutaNegocio =
      typeof obj.rutaNegocio === 'string'
        ? obj.rutaNegocio
        : typeof obj.tenantPath === 'string'
          ? obj.tenantPath
          : typeof (obj.negocio as any)?.ruta_negocio === 'string'
            ? (obj.negocio as any).ruta_negocio
            : '';

    // Si viene en formato canónico de Unidad Secundaria con slug_categoria y negocio_id
    if (
      !rutaNegocio &&
      typeof obj.slug_categoria === 'string' &&
      typeof obj.negocio_id === 'string'
    ) {
      rutaNegocio = `${obj.slug_categoria}/${obj.negocio_id}`;
    }

    if (
      obj.estado === 'activo' ||
      obj.estado === 'usado' ||
      obj.estado === 'revocado' ||
      obj.estado === 'expirado'
    ) {
      estado = obj.estado;
    }
    if (typeof obj.maxUsos === 'number') maxUsos = obj.maxUsos;
    if (typeof obj.usosActuales === 'number') usosActuales = obj.usosActuales;
    if (typeof obj.expiraEn === 'number') expiraEn = obj.expiraEn;
    if (typeof obj.creadoEn === 'number') creadoEn = obj.creadoEn;
    if (Array.isArray(obj.rolesPermitidos)) rolesPermitidos = obj.rolesPermitidos as string[];
    if (Array.isArray(obj.modulosPermitidos)) modulosPermitidos = obj.modulosPermitidos as string[];

    if (obj.usadoPorDeviceIds) {
      usadoPorDeviceIds = Array.isArray(obj.usadoPorDeviceIds)
        ? (obj.usadoPorDeviceIds as string[])
        : Object.keys(obj.usadoPorDeviceIds as Record<string, unknown>);
    }
  }

  if (estado === 'revocado') {
    throw new Error('El código de acceso ha sido revocado');
  }
  if (estado === 'expirado') {
    throw new Error('El código de acceso ha expirado');
  }
  if (expiraEn && Date.now() > expiraEn) {
    throw new Error('El código de acceso ha expirado temporalmente');
  }
  if (maxUsos !== undefined && usosActuales !== undefined && usosActuales >= maxUsos) {
    throw new Error('El código de acceso ha agotado su límite de usos');
  }

  if (!rutaNegocio) {
    throw new Error('La referencia del negocio asociada al código está vacía');
  }

  if (es_ruta_legacy(rutaNegocio)) {
    throw new Error('El código de acceso apunta a una ruta obsoleta. Contacta a soporte.');
  }

  const identidad = descomponer_ruta_negocio(rutaNegocio);
  if (!identidad) {
    throw new Error('Estructura de ruta inválida o incompleta');
  }

  const db_url_operativa =
    typeof val === 'object' && val !== null
      ? (val.db_url_operativa as string) || (val.operacionUrl as string) || ''
      : '';

  const versionNpbOrigen =
    typeof val === 'object' && val !== null
      ? Number(val.version_npb_origen ?? (val.negocio as any)?.version_npb_origen ?? 1)
      : 1;

  const clienteId =
    typeof val === 'object' && val !== null
      ? (val.cliente_id as string) || (val.negocio as any)?.cliente_id || 'cliente-local'
      : 'cliente-local';

  const negocio: NegocioReal = {
    negocio_id:
      (typeof val === 'object' &&
        val !== null &&
        (val.negocio_id || (val.negocio as any)?.negocio_id)) ||
      identidad.negocio_id,
    categoria_id:
      (typeof val === 'object' &&
        val !== null &&
        (val.categoria_id || (val.negocio as any)?.categoria_id)) ||
      identidad.categoria_id,
    slug_categoria:
      (typeof val === 'object' &&
        val !== null &&
        (val.slug_categoria || (val.negocio as any)?.slug_categoria)) ||
      identidad.categoria_id,
    version_npb_origen: versionNpbOrigen,
    cliente_id: clienteId,
    estado,
    db_url_operativa,
  };

  // Guardar sesión local en AsyncStorage
  try {
    if (typeof AsyncStorage.multiSet === 'function') {
      await AsyncStorage.multiSet([
        ['@negocio_id', negocio.negocio_id],
        ['@slug_categoria', negocio.slug_categoria],
        ['@version_npb_origen', String(negocio.version_npb_origen)],
        ['@db_url_operativa', db_url_operativa],
      ]);
    } else if (typeof AsyncStorage.setItem === 'function') {
      await AsyncStorage.setItem('@negocio_id', negocio.negocio_id);
      await AsyncStorage.setItem('@slug_categoria', negocio.slug_categoria);
      await AsyncStorage.setItem('@version_npb_origen', String(negocio.version_npb_origen));
      await AsyncStorage.setItem('@db_url_operativa', db_url_operativa);
    }
  } catch (error) {
    console.warn('[resolverAccessCode] No se pudo guardar la sesión en AsyncStorage', error);
  }

  return {
    ...identidad,
    accessCode: cleanCode,
    estado,
    maxUsos,
    usosActuales,
    expiraEn,
    creadoEn,
    usadoPorDeviceIds,
    rolesPermitidos,
    modulosPermitidos,
    negocio,
    db_url_operativa,
    version_npb_origen: versionNpbOrigen,
    nodoPath,
  };
}

export async function resolverAccessCodeO1(
  db: Database,
  accessCode: string
): Promise<RespuestaAccessCode> {
  const res = await resolverAccessCode(db, accessCode);
  const negocio: NegocioReal = {
    negocio_id: res.negocio.negocio_id,
    categoria_id: res.negocio.categoria_id,
    slug_categoria: res.negocio.slug_categoria,
    version_npb_origen: res.negocio.version_npb_origen,
    cliente_id: res.negocio.cliente_id,
  };
  return {
    negocio,
    db_url_operativa: res.db_url_operativa,
  };
}
