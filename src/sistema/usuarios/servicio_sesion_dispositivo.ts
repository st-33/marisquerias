/**
 * 📱 SERVICIO DE SESIÓN OPERATIVA Y ADMISIÓN DE TERMINALES
 * Control de cuotas de terminales simultáneas en `/monitoreo/dispositivos`.
 *
 * Reglas de Arquitectura:
 * - Web: Acceso directo, no requiere registro de usuario obligatorio y no consume cupo de terminales.
 * - Nativo (Android/iOS): Requiere vinculación, usuario responsable y cupo de terminales (slots 01..N).
 * - Terminal compartida: Cambiar de operador actualiza el slot existente sin consumir un cupo extra.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { get, ref, set, update } from 'firebase/database';
import type { Database } from 'firebase/database';
import { Platform } from 'react-native';
import type {
  EstadoAdmisionSesion,
  RegistroAuditoriaOperador,
  SesionOperativaLocal,
  SlotMonitoreoDispositivo,
} from './tipos';

const CLAVE_STORAGE_SESION = 'adi_sesion_operativa_local';
const CLAVE_STORAGE_AUDITORIA = 'adi_auditoria_operadores';
const LIMITE_DEFAULT_TERMINALES = 3;

export function formatearSlotId(numero: number): string {
  return numero < 10 ? `0${numero}` : `${numero}`;
}

export async function admitirSesionDispositivo(
  db: Database,
  params: {
    deviceId: string;
    instalacionId?: string;
    usuarioId?: string;
    usuarioNombre?: string;
    usuarioClave?: string;
    cargo?: string;
    limiteDispositivos?: number;
    rutaRaizOperativa?: string;
    esWebForzado?: boolean;
  }
): Promise<EstadoAdmisionSesion> {
  const esWeb = params.esWebForzado ?? Platform.OS === 'web';

  // 1. En Web el acceso es directo y no consume slots de monitoreo
  if (esWeb) {
    const sesionWeb: SesionOperativaLocal = {
      dispositivo_id: params.deviceId,
      instalacionId: params.instalacionId || 'web-browser',
      instalacion_id: params.instalacionId || 'web-browser',
      usuario_id: params.usuarioId,
      usuario_nombre: params.usuarioNombre,
      usuario_clave: params.usuarioClave,
      cargo: params.cargo,
      plataforma: 'web',
      fecha_inicio: Date.now(),
      ultima_actividad: Date.now(),
    };
    await guardarSesionOperativaLocal(sesionWeb);
    return {
      admitido: true,
      esWeb: true,
    };
  }

  // 2. En Nativo validamos y consumimos un slot en `/monitoreo/dispositivos`
  const limite = Math.max(1, params.limiteDispositivos ?? LIMITE_DEFAULT_TERMINALES);
  const rutaBaseMonitoreo = params.rutaRaizOperativa
    ? `${params.rutaRaizOperativa.replace(/\/+$/, '')}/monitoreo/dispositivos`
    : 'monitoreo/dispositivos';

  const snapshot = await get(ref(db, rutaBaseMonitoreo));
  const slotsActuales: Record<string, SlotMonitoreoDispositivo> = snapshot.exists()
    ? (snapshot.val() as Record<string, SlotMonitoreoDispositivo>) || {}
    : {};

  // 2a. Verificar si este dispositivo ya tiene un slot asignado activo
  let slotExistenteId: string | null = null;
  for (const [idSlot, dataSlot] of Object.entries(slotsActuales)) {
    if (
      dataSlot &&
      dataSlot.estado === 'activo' &&
      dataSlot.dispositivo_id === params.deviceId
    ) {
      slotExistenteId = idSlot;
      break;
    }
  }

  const timestamp = Date.now();

  if (slotExistenteId) {
    // Ya tiene slot asignado: refrescar actividad y actualizar operador responsable
    const payloadActualizacion: Record<string, any> = {
      ultima_actividad: timestamp,
      usuario_id: params.usuarioId || '',
      usuario_nombre: params.usuarioNombre || '',
      rol: params.cargo || '',
    };

    await update(ref(db, `${rutaBaseMonitoreo}/${slotExistenteId}`), payloadActualizacion);

    const sesion: SesionOperativaLocal = {
      dispositivo_id: params.deviceId,
      instalacionId: params.instalacionId || params.deviceId,
      instalacion_id: params.instalacionId || params.deviceId,
      slot_id: slotExistenteId,
      usuario_id: params.usuarioId,
      usuario_nombre: params.usuarioNombre,
      usuario_clave: params.usuarioClave,
      cargo: params.cargo,
      plataforma: 'native',
      fecha_inicio: timestamp,
      ultima_actividad: timestamp,
    };
    await guardarSesionOperativaLocal(sesion);

    return {
      admitido: true,
      esWeb: false,
      slotId: slotExistenteId,
    };
  }

  // 2b. Buscar primer slot libre disponible dentro del límite
  let slotAsignadoId: string | null = null;
  for (let i = 1; i <= limite; i++) {
    const idCandidato = formatearSlotId(i);
    const slotData = slotsActuales[idCandidato];
    if (!slotData || slotData.estado !== 'activo') {
      slotAsignadoId = idCandidato;
      break;
    }
  }

  if (!slotAsignadoId) {
    return {
      admitido: false,
      esWeb: false,
      error: `Límite de terminales simultáneas alcanzado (${limite} permitidas). Libere una terminal para continuar.`,
    };
  }

  // 2c. Asignar el nuevo slot
  const nuevoSlot: SlotMonitoreoDispositivo = {
    estado: 'activo',
    dispositivo_id: params.deviceId,
    rol: params.cargo || 'operador',
    usuario_id: params.usuarioId || '',
    usuario_nombre: params.usuarioNombre || '',
    ultima_actividad: timestamp,
  };

  await set(ref(db, `${rutaBaseMonitoreo}/${slotAsignadoId}`), nuevoSlot);

  const nuevaSesion: SesionOperativaLocal = {
    dispositivo_id: params.deviceId,
    instalacionId: params.instalacionId || params.deviceId,
    instalacion_id: params.instalacionId || params.deviceId,
    slot_id: slotAsignadoId,
    usuario_id: params.usuarioId,
    usuario_nombre: params.usuarioNombre,
    usuario_clave: params.usuarioClave,
    cargo: params.cargo,
    plataforma: 'native',
    fecha_inicio: timestamp,
    ultima_actividad: timestamp,
  };
  await guardarSesionOperativaLocal(nuevaSesion);

  return {
    admitido: true,
    esWeb: false,
    slotId: slotAsignadoId,
  };
}

export async function cambiarOperadorResponsable(
  db: Database,
  params: {
    deviceId: string;
    slotId?: string;
    nuevoUsuarioId: string;
    nuevoUsuarioNombre: string;
    nuevoCargo: string;
    rutaRaizOperativa?: string;
    motivo?: string;
  }
): Promise<void> {
  const sesionActual = await obtenerSesionOperativaLocal();
  const slotId = params.slotId || sesionActual?.slot_id;
  const timestamp = Date.now();

  // 1. Si estamos en nativo y tenemos slotId, actualizar en Firebase RTDB
  if (slotId) {
    const rutaSlot = params.rutaRaizOperativa
      ? `${params.rutaRaizOperativa.replace(/\/+$/, '')}/monitoreo/dispositivos/${slotId}`
      : `monitoreo/dispositivos/${slotId}`;

    await update(ref(db, rutaSlot), {
      usuario_id: params.nuevoUsuarioId,
      usuario_nombre: params.nuevoUsuarioNombre,
      rol: params.nuevoCargo,
      ultima_actividad: timestamp,
    });
  }

  // 2. Registrar en la bitácora local de auditoría de operadores
  const registroAuditoria: RegistroAuditoriaOperador = {
    id: `audit_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
    dispositivo_id: params.deviceId,
    slot_id: slotId,
    usuario_id_anterior: sesionActual?.usuario_id,
    usuario_nombre_anterior: sesionActual?.usuario_nombre,
    usuario_id_nuevo: params.nuevoUsuarioId,
    usuario_nombre_nuevo: params.nuevoUsuarioNombre,
    cargo_nuevo: params.nuevoCargo,
    timestamp,
    motivo: params.motivo || 'Cambio de turno / operador',
  };

  await agregarRegistroAuditoriaLocal(registroAuditoria);

  // 3. Actualizar la sesión operativa local conservando el slot y dispositivo
  const sesionActualizada: SesionOperativaLocal = {
    ...(sesionActual || {
      dispositivo_id: params.deviceId,
      instalacionId: params.deviceId,
      instalacion_id: params.deviceId,
      plataforma: Platform.OS === 'web' ? 'web' : 'native',
      fecha_inicio: timestamp,
    }),
    slot_id: slotId,
    usuario_id: params.nuevoUsuarioId,
    usuario_nombre: params.nuevoUsuarioNombre,
    cargo: params.nuevoCargo,
    ultima_actividad: timestamp,
  };

  await guardarSesionOperativaLocal(sesionActualizada);
}

export async function liberarSesionDispositivo(
  db: Database,
  params: {
    slotId?: string;
    rutaRaizOperativa?: string;
  }
): Promise<void> {
  const sesionActual = await obtenerSesionOperativaLocal();
  const slotId = params.slotId || sesionActual?.slot_id;

  if (slotId) {
    const rutaSlot = params.rutaRaizOperativa
      ? `${params.rutaRaizOperativa.replace(/\/+$/, '')}/monitoreo/dispositivos/${slotId}`
      : `monitoreo/dispositivos/${slotId}`;

    await update(ref(db, rutaSlot), {
      estado: 'inactivo',
      ultima_actividad: Date.now(),
    });
  }

  await limpiarSesionOperativaLocal();
}

// ═══════════════════════════════════════════════════════════════════
// PERSISTENCIA LOCAL (AsyncStorage)
// ═══════════════════════════════════════════════════════════════════

export async function obtenerSesionOperativaLocal(): Promise<SesionOperativaLocal | null> {
  try {
    const raw = await AsyncStorage.getItem(CLAVE_STORAGE_SESION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function guardarSesionOperativaLocal(sesion: SesionOperativaLocal): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_STORAGE_SESION, JSON.stringify(sesion));
  } catch (err) {
    console.warn('[SesionDispositivo] Error al guardar sesión local', err);
  }
}

export async function limpiarSesionOperativaLocal(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CLAVE_STORAGE_SESION);
  } catch (err) {
    console.warn('[SesionDispositivo] Error al limpiar sesión local', err);
  }
}

export async function listarAuditoriaOperadores(): Promise<RegistroAuditoriaOperador[]> {
  try {
    const raw = await AsyncStorage.getItem(CLAVE_STORAGE_AUDITORIA);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function agregarRegistroAuditoriaLocal(registro: RegistroAuditoriaOperador): Promise<void> {
  try {
    const lista = await listarAuditoriaOperadores();
    lista.unshift(registro);
    // Conservar máximo los últimos 100 eventos
    const recortada = lista.slice(0, 100);
    await AsyncStorage.setItem(CLAVE_STORAGE_AUDITORIA, JSON.stringify(recortada));
  } catch (err) {
    console.warn('[SesionDispositivo] Error al registrar auditoría de operador', err);
  }
}
