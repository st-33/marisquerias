import { get, ref } from 'firebase/database';
import type { Database } from 'firebase/database';
import {
  descomponerRutaTenant,
  esRutaLegacy,
  type IdentidadTenant,
} from '../../rtdb/rutas/RutaTenant';

export interface InfoAccessCode extends IdentidadTenant {
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
 * Consulta en Firebase RTDB si el código de acceso existe y es válido.
 * Firebase es la única fuente de verdad: no existe resolución local ni fallback.
 *
 * Contrato de nodo remoto `access_codes/{CODIGO}`:
 *   - string  -> tenantPath directo (formato legible, válido si son 2 segmentos)
 *   - object  -> { tenantPath: string, estado?, maxUsos?, usosActuales?, expiraEn?, ... }
 *
 * El tenantPath resuelto debe tener exactamente 2 segmentos: {categoria}/{negocio}.
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

  const codeRef = ref(db, `access_codes/${cleanCode}`);
  const snapshot = await get(codeRef);

  if (!snapshot.exists()) {
    throw new Error('Código de acceso no encontrado o inválido');
  }

  const val: unknown = snapshot.val();

  let tenantPath = '';
  let estado: 'activo' | 'usado' | 'revocado' | 'expirado' = 'activo';
  let maxUsos: number | undefined;
  let usosActuales: number | undefined;
  let expiraEn: number | undefined;
  let creadoEn: number | undefined;
  let usadoPorDeviceIds: string[] = [];
  let rolesPermitidos: string[] | undefined;
  let modulosPermitidos: string[] | undefined;

  if (typeof val === 'string') {
    tenantPath = val;
  } else if (val !== null && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    tenantPath = typeof obj.tenantPath === 'string' ? obj.tenantPath : '';
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

  if (!tenantPath) {
    throw new Error('La referencia del tenant asociada al código está vacía');
  }

  if (esRutaLegacy(tenantPath)) {
    throw new Error('El código de acceso apunta a una ruta obsoleta. Contacta a soporte.');
  }

  const identidad = descomponerRutaTenant(tenantPath);
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
