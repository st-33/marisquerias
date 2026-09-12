import { get, ref } from 'firebase/database';
import type { Database } from 'firebase/database';
import {
  descomponer_ruta_negocio,
  es_ruta_legacy,
  type IdentidadNegocio,
} from '../../rtdb/rutas/ruta_negocio';

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
}

/**
 * Flujo de Login y Resolución (Normativo):
 * Resuelve la ruta del negocio en RTDB a partir del código de acceso.
 *
 * @param codigo - Código de acceso ingresado por el usuario
 * @param db - Instancia de Firebase Database
 * @returns String con la ruta del negocio en RTDB (ej: "Marisquerias/mpl") o null si no existe
 */
export async function resolverNegocioPorCodigo(codigo: string, db: any): Promise<string | null> {
  const cod = codigo.trim().toUpperCase();
  if (!cod) return null;
  const snapshot = await get(ref(db, `codigo_acceso/${cod}`));
  if (snapshot.exists()) {
    const val = snapshot.val();
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object' && typeof (val as any).tenantPath === 'string') {
      return (val as any).tenantPath;
    }
    return typeof val === 'string' ? val : null;
  }
  return null;
}

/**
 * Consulta en Firebase RTDB si el código de acceso existe y es válido.
 * Firebase es la única fuente de verdad: no existe resolución local ni fallback.
 *
 * Fuente Contractual: `codigo_acceso/{CODIGO}`
 *   - string  -> rutaNegocio directo
 *   - object  -> { rutaNegocio?: string, tenantPath?: string, estado?, maxUsos?, usosActuales?, expiraEn?, ... }
 *
 * El rutaNegocio resuelto debe tener una estructura de ruta válida.
 * Si RTDB no responde, el código no existe o la ruta es inválida, el resolver falla explícitamente.
 */
export async function resolverAccessCode(
  db: Database,
  accessCode: string
): Promise<InfoAccessCode> {
  const cleanCode = accessCode.trim().toUpperCase();
  if (!cleanCode) {
    throw new Error('El código de acceso no puede estar vacío');
  }

  const codeRef = ref(db, `codigo_acceso/${cleanCode}`);
  const snapshot = await get(codeRef);

  if (!snapshot.exists()) {
    throw new Error('Código de acceso no encontrado o inválido');
  }

  const val: unknown = snapshot.val();

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
          : '';
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
  };
}
