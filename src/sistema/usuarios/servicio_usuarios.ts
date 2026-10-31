/**
 * 👥 SERVICIO DE GESTIÓN DE USUARIOS DEL NEGOCIO
 * Responsable de la colección canónica `/usuario` en la RTDB Operativa.
 */

import { get, ref, set, update, remove } from 'firebase/database';
import type { Database } from 'firebase/database';
import type { SexoUsuario, UsuarioNegocio } from './tipos';
import { resolverClaveNominal } from './generador_clave';

export function calcularSiguienteIdUsuario(
  usuarios: Record<string, any> | UsuarioNegocio[] | null | undefined
): string {
  if (!usuarios) return '01';

  const claves = Array.isArray(usuarios)
    ? usuarios.map((u) => u?.id).filter(Boolean)
    : Object.keys(usuarios);

  if (claves.length === 0) return '01';

  let maxId = 0;
  for (const c of claves) {
    const num = parseInt(c, 10);
    if (!isNaN(num) && num > maxId) {
      maxId = num;
    }
  }

  const siguiente = maxId + 1;
  return siguiente < 10 ? `0${siguiente}` : `${siguiente}`;
}

export async function listarUsuarios(
  db: Database,
  rutaRaiz: string = ''
): Promise<UsuarioNegocio[]> {
  const ruta = rutaRaiz ? `${rutaRaiz.replace(/\/+$/, '')}/usuario` : 'usuario';
  const snapshot = await get(ref(db, ruta));

  if (!snapshot.exists()) {
    return [];
  }

  const raw = snapshot.val();
  if (!raw || typeof raw !== 'object') {
    return [];
  }

  const lista: UsuarioNegocio[] = [];
  for (const [id, val] of Object.entries(raw)) {
    if (val && typeof val === 'object') {
      const u = val as any;
      lista.push({
        id,
        nombre: u.nombre || '',
        clave: u.clave || '',
        edad: typeof u.edad === 'number' ? u.edad : parseInt(u.edad, 10) || 0,
        sexo: u.sexo === 'M' ? 'M' : 'H',
        perfil: {
          cargo: u.perfil?.cargo || u.cargo || '',
          sueldo: typeof u.perfil?.sueldo === 'number' ? u.perfil.sueldo : undefined,
          horario_entrada: u.perfil?.horario_entrada,
          horario_salida: u.perfil?.horario_salida,
        },
        creado_en: u.creado_en,
        actualizado_en: u.actualizado_en,
      });
    }
  }

  // Ordenar de forma determinista por consecutivo de 2 dígitos
  return lista.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
}

export interface DatosCrearUsuario {
  nombre: string;
  edad: number;
  sexo: SexoUsuario;
  cargo: string;
  sueldo?: number;
  horario_entrada?: string;
  horario_salida?: string;
}

export async function crearUsuario(
  db: Database,
  datos: DatosCrearUsuario,
  rutaRaiz: string = ''
): Promise<UsuarioNegocio> {
  const nombreLimpio = (datos.nombre || '').trim();
  if (nombreLimpio.length < 2) {
    throw new Error('El nombre del usuario debe contener al menos 2 caracteres.');
  }

  const edadEntera = Math.floor(datos.edad);
  if (isNaN(edadEntera) || edadEntera < 14 || edadEntera > 99) {
    throw new Error('La edad debe ser un número entero válido de 2 dígitos (entre 14 y 99 años).');
  }

  if (datos.sexo !== 'H' && datos.sexo !== 'M') {
    throw new Error('El sexo debe ser "H" (Hombre) o "M" (Mujer).');
  }

  const cargoLimpio = (datos.cargo || '').trim();
  if (!cargoLimpio) {
    throw new Error('El cargo o responsabilidad del usuario es requerido.');
  }

  // 1. Obtener usuarios actuales para verificar clave nominal e ID consecutivo
  const usuariosExistentes = await listarUsuarios(db, rutaRaiz);

  // 2. Resolver clave nominal con detección de colisión
  const resClave = resolverClaveNominal(nombreLimpio, usuariosExistentes);
  if (resClave.tieneConflicto) {
    throw new Error(resClave.error || 'Conflicto al generar la clave nominal del usuario.');
  }

  // 3. Obtener siguiente consecutivo de 2 dígitos
  const nuevoId = calcularSiguienteIdUsuario(usuariosExistentes);

  const timestamp = Date.now();
  const nuevoUsuario: UsuarioNegocio = {
    id: nuevoId,
    nombre: nombreLimpio,
    clave: resClave.clave,
    edad: edadEntera,
    sexo: datos.sexo,
    perfil: {
      cargo: cargoLimpio,
      ...(datos.sueldo !== undefined && !isNaN(datos.sueldo) ? { sueldo: datos.sueldo } : {}),
      ...(datos.horario_entrada ? { horario_entrada: datos.horario_entrada.trim() } : {}),
      ...(datos.horario_salida ? { horario_salida: datos.horario_salida.trim() } : {}),
    },
    creado_en: timestamp,
    actualizado_en: timestamp,
  };

  // 4. Persistir en la ruta canónica `/usuario/{id}`
  const rutaUsuario = rutaRaiz
    ? `${rutaRaiz.replace(/\/+$/, '')}/usuario/${nuevoId}`
    : `usuario/${nuevoId}`;

  await set(ref(db, rutaUsuario), nuevoUsuario);

  return nuevoUsuario;
}

export async function actualizarUsuario(
  db: Database,
  id: string,
  datos: Partial<DatosCrearUsuario>,
  rutaRaiz: string = ''
): Promise<void> {
  const rutaUsuario = rutaRaiz
    ? `${rutaRaiz.replace(/\/+$/, '')}/usuario/${id}`
    : `usuario/${id}`;

  const payload: Record<string, any> = {
    actualizado_en: Date.now(),
  };

  if (datos.nombre !== undefined) {
    payload.nombre = datos.nombre.trim();
  }
  if (datos.edad !== undefined) {
    payload.edad = Math.floor(datos.edad);
  }
  if (datos.sexo !== undefined) {
    payload.sexo = datos.sexo;
  }
  if (datos.cargo !== undefined) {
    payload['perfil/cargo'] = datos.cargo.trim();
  }
  if (datos.sueldo !== undefined) {
    payload['perfil/sueldo'] = datos.sueldo;
  }
  if (datos.horario_entrada !== undefined) {
    payload['perfil/horario_entrada'] = datos.horario_entrada;
  }
  if (datos.horario_salida !== undefined) {
    payload['perfil/horario_salida'] = datos.horario_salida;
  }

  await update(ref(db, rutaUsuario), payload);
}

export async function eliminarUsuario(
  db: Database,
  id: string,
  rutaRaiz: string = ''
): Promise<void> {
  const rutaUsuario = rutaRaiz
    ? `${rutaRaiz.replace(/\/+$/, '')}/usuario/${id}`
    : `usuario/${id}`;

  await remove(ref(db, rutaUsuario));
}
