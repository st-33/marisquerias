/**
 * 📱 SERVICIO DE SESIÓN OPERATIVA Y ADMISIÓN DE TERMINALES
 * Control de cuotas de terminales simultáneas y vigencia de sesiones.
 *
 * ARQUITECTURA DE DATOS:
 * - Unidad Operativa (/sesiones/{plaza}): Fuente única de sesiones vivas con
 *   token_sesion, dispositivo_id, instalacion_id, operador, timestamps y estado ('activa'|'inactiva'|'drenando').
 * - Unidad Secundaria (/monitoreo/dispositivos/{plaza}): Proyección visual de solo lectura
 *   restringida estrictamente a string 'activo' | 'inactivo'.
 *
 * Reglas de Admisión y Presencia:
 * - Web: Acceso directo sin consumir cupo de terminales (salvo simulacionNativo explícito).
 * - Nativo (Android/iOS): Admisión atómica mediante runTransaction sobre /sesiones.
 * - Heartbeat Técnico (30s): Mantiene viva la plaza independientemente de taps humanos.
 * - Abandono Técnico (180s): Solo tras 180s sin latido técnico se autoriza la reclamación de plaza.
 * - Desplazamiento por Token: Cada nueva asignación genera un token_sesion único;
 *   si la terminal previa despierta, su token queda revocado.
 */

import { storageSesion } from '../almacenamiento/storageSesion';
import { get, ref, set, update, runTransaction } from 'firebase/database';
import type { Database } from 'firebase/database';
import { Platform } from 'react-native';
import type {
  EstadoAdmisionSesion,
  RegistroAuditoriaOperador,
  SesionOperativaLocal,
  SesionOperativaRemota,
} from './tipos';

const CLAVE_STORAGE_SESION = 'adi_sesion_operativa_local';
const CLAVE_STORAGE_AUDITORIA = 'adi_auditoria_operadores';
export const LIMITE_DEFAULT_TERMINALES = 3;
export const TTL_ABANDONO_TECNICO_MS = 180_000; // 180 segundos (3 minutos)
export const INTERVALO_LATIDO_PRESENCIA_MS = 30_000; // 30 segundos

export function formatearSlotId(numero: number): string {
  return numero < 10 ? `0${numero}` : `${numero}`;
}

export function generarTokenSesion(): string {
  const rand = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  return `tok_${time}_${rand}`;
}

export function esSlotActivo(slotData: any): boolean {
  if (!slotData) return false;
  if (typeof slotData === 'string') {
    return slotData.trim().toLowerCase() === 'activo';
  }
  if (typeof slotData === 'object') {
    return slotData.estado === 'activo' || slotData.estado === 'activa';
  }
  return false;
}

export function extraerDispositivoIdDeSlot(slotData: any): string | null {
  if (slotData && typeof slotData === 'object' && typeof slotData.dispositivo_id === 'string') {
    return slotData.dispositivo_id;
  }
  return null;
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
    simulacionNativo?: boolean;
    dbSecundaria?: Database;
    rutaSecundariaMonitoreo?: string;
  }
): Promise<EstadoAdmisionSesion> {
  const esWebPuro = (params.esWebForzado ?? Platform.OS === 'web') && !params.simulacionNativo;

  // 1. En Web puro el acceso es directo y no consume plazas de terminales
  if (esWebPuro) {
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
      estado: 'activa',
    };
    await guardarSesionOperativaLocal(sesionWeb);
    return {
      admitido: true,
      esWeb: true,
      estado: 'activa',
    };
  }

  // 2. Determinar límite aplicable (autoridad de Central)
  let limite = params.limiteDispositivos;
  if (!limite || limite < 1) {
    try {
      const snapCupo = await get(ref(db, 'configuracion/cupo_operativo/limite_aplicado'));
      if (snapCupo.exists() && typeof snapCupo.val() === 'number') {
        limite = snapCupo.val();
      } else {
        const snapDispositivos = await get(ref(db, 'configuracion/dispositivos'));
        if (snapDispositivos.exists() && typeof snapDispositivos.val() === 'number') {
          limite = snapDispositivos.val();
        }
      }
    } catch {
      // Fallback a default si no hay red o ruta no existe aún
    }
  }
  const limiteEfectivo = Math.max(1, limite ?? LIMITE_DEFAULT_TERMINALES);

  const rutaBaseSesiones = params.rutaRaizOperativa
    ? `${params.rutaRaizOperativa.replace(/\/+$/, '')}/sesiones`
    : 'sesiones';
  const rutaBaseMonitoreo = params.rutaRaizOperativa
    ? `${params.rutaRaizOperativa.replace(/\/+$/, '')}/monitoreo/dispositivos`
    : 'monitoreo/dispositivos';

  let slotAsignado: string | null = null;
  let tokenAsignado: string | null = null;
  let estadoAsignado: 'activa' | 'drenando' = 'activa';

  const ahora = Date.now();

  // 3. Ejecutar runTransaction atómica para garantizar que no existan colisiones en la última plaza
  const resultadoTx = await runTransaction(ref(db, rutaBaseSesiones), (sesionesRaw) => {
    const sesiones: Record<string, any> = sesionesRaw || {};
    slotAsignado = null;
    tokenAsignado = null;

    // 3a. ¿Este dispositivo ya posee una plaza asignada?
    for (let i = 1; i <= limiteEfectivo; i++) {
      const slotKey = formatearSlotId(i);
      const ses = sesiones[slotKey];
      if (
        ses &&
        ses.dispositivo_id === params.deviceId &&
        (ses.estado === 'activa' || ses.estado === 'drenando')
      ) {
        slotAsignado = slotKey;
        tokenAsignado = ses.token_sesion || generarTokenSesion();
        estadoAsignado = ses.estado;

        ses.token_sesion = tokenAsignado;
        ses.operador_id = params.usuarioId || ses.operador_id || '';
        ses.operador_nombre = params.usuarioNombre || ses.operador_nombre || '';
        ses.rol_activo = params.cargo || ses.rol_activo || 'operador';
        ses.ultimo_latido_presencia = ahora;
        ses.ultima_interaccion_humana = ahora;
        return sesiones;
      }
    }

    // 3b. Buscar primer slot libre dentro del cupo
    for (let i = 1; i <= limiteEfectivo; i++) {
      const slotKey = formatearSlotId(i);
      const ses = sesiones[slotKey];
      if (!ses || ses.estado === 'inactiva' || ses.estado === 'inactivo' || !ses.estado) {
        slotAsignado = slotKey;
        tokenAsignado = generarTokenSesion();
        estadoAsignado = 'activa';

        sesiones[slotKey] = {
          plaza_id: slotKey,
          estado: 'activa',
          token_sesion: tokenAsignado,
          dispositivo_id: params.deviceId,
          instalacion_id: params.instalacionId || params.deviceId,
          operador_id: params.usuarioId || '',
          operador_nombre: params.usuarioNombre || '',
          rol_activo: params.cargo || 'operador',
          inicio: ahora,
          ultimo_latido_presencia: ahora,
          ultima_interaccion_humana: ahora,
        };
        return sesiones;
      }
    }

    // 3c. Reclamación oportunista de plaza huérfana (> 180s sin latido técnico de fondo)
    for (let i = 1; i <= limiteEfectivo; i++) {
      const slotKey = formatearSlotId(i);
      const ses = sesiones[slotKey];
      const ultimoLatido = ses?.ultimo_latido_presencia || ses?.ultima_actividad || 0;

      if (
        ses &&
        (ses.estado === 'activa' || ses.estado === 'drenando' || ses.estado === 'activo') &&
        ahora - ultimoLatido > TTL_ABANDONO_TECNICO_MS
      ) {
        slotAsignado = slotKey;
        tokenAsignado = generarTokenSesion(); // Nuevo token invalida terminal anterior
        estadoAsignado = 'activa';

        sesiones[slotKey] = {
          plaza_id: slotKey,
          estado: 'activa',
          token_sesion: tokenAsignado,
          dispositivo_id: params.deviceId,
          instalacion_id: params.instalacionId || params.deviceId,
          operador_id: params.usuarioId || '',
          operador_nombre: params.usuarioNombre || '',
          rol_activo: params.cargo || 'operador',
          inicio: ahora,
          ultimo_latido_presencia: ahora,
          ultima_interaccion_humana: ahora,
          reclamada_de_dispositivo: ses.dispositivo_id,
        };
        return sesiones;
      }
    }

    // 3d. Cupo agotado y sin abandono técnico: abortar transacción
    return undefined;
  });

  if (!resultadoTx.committed || !slotAsignado || !tokenAsignado) {
    return {
      admitido: false,
      esWeb: false,
      error: `Límite de terminales simultáneas alcanzado (${limiteEfectivo} permitidas). Todas las terminales están activas y transmitiendo latido.`,
    };
  }

  // 4. Sincronizar proyección string puro 'activo' en monitoreo/dispositivos (Secundaria / Operativa)
  try {
    await set(ref(db, `${rutaBaseMonitoreo}/${slotAsignado}`), 'activo');
    if (params.dbSecundaria && params.rutaSecundariaMonitoreo) {
      await set(
        ref(params.dbSecundaria, `${params.rutaSecundariaMonitoreo}/${slotAsignado}`),
        'activo'
      );
    }
  } catch (err) {
    console.warn('[SesionDispositivo] Error al sincronizar proyección string en monitoreo:', err);
  }

  // 5. Guardar sesión operativa local
  const nuevaSesion: SesionOperativaLocal = {
    dispositivo_id: params.deviceId,
    instalacionId: params.instalacionId || params.deviceId,
    instalacion_id: params.instalacionId || params.deviceId,
    slot_id: slotAsignado,
    token_sesion: tokenAsignado,
    usuario_id: params.usuarioId,
    usuario_nombre: params.usuarioNombre,
    usuario_clave: params.usuarioClave,
    cargo: params.cargo,
    plataforma: params.simulacionNativo ? 'native' : Platform.OS === 'web' ? 'web' : 'native',
    fecha_inicio: ahora,
    ultima_actividad: ahora,
    estado: estadoAsignado,
  };
  await guardarSesionOperativaLocal(nuevaSesion);

  // 6. Asegurar flag de dispositivo vinculado para el guardia de autenticación
  try {
    const vinculo = {
      deviceIdADI: params.deviceId,
      estado: 'activo',
      usuarioId: params.usuarioId,
      usuarioNombre: params.usuarioNombre,
      cargo: params.cargo,
      slotId: slotAsignado,
      vinculadoEn: ahora,
      actualizadoEn: ahora,
    };
    await storageSesion.setItem('adi_dispositivo_vinculado', JSON.stringify(vinculo));
    await storageSesion.setItem('device_registered', 'true');
    await storageSesion.setItem('adi_device_id_persistent', params.deviceId);
  } catch (err) {
    console.warn('[SesionDispositivo] Error al persistir vínculo de dispositivo:', err);
  }

  return {
    admitido: true,
    esWeb: false,
    slotId: slotAsignado,
    tokenSesion: tokenAsignado,
    estado: estadoAsignado,
  };
}

export async function registrarLatidoPresencia(
  db: Database,
  params: {
    slotId: string;
    tokenSesion: string;
    rutaRaizOperativa?: string;
  }
): Promise<{ ok: boolean; revocada?: boolean }> {
  const rutaSesion = params.rutaRaizOperativa
    ? `${params.rutaRaizOperativa.replace(/\/+$/, '')}/sesiones/${params.slotId}`
    : `sesiones/${params.slotId}`;

  try {
    const snap = await get(ref(db, rutaSesion));
    if (!snap.exists()) {
      return { ok: false, revocada: true };
    }
    const remota = snap.val() as SesionOperativaRemota;
    if (remota.token_sesion !== params.tokenSesion || remota.estado === 'inactiva') {
      return { ok: false, revocada: true };
    }

    await update(ref(db, rutaSesion), {
      ultimo_latido_presencia: Date.now(),
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function validarTokenSesion(
  db: Database,
  slotId: string,
  tokenSesion: string,
  rutaRaizOperativa?: string
): Promise<boolean> {
  try {
    const rutaSesion = rutaRaizOperativa
      ? `${rutaRaizOperativa.replace(/\/+$/, '')}/sesiones/${slotId}`
      : `sesiones/${slotId}`;
    const snap = await get(ref(db, rutaSesion));
    if (!snap.exists()) return false;
    const ses = snap.val();
    return ses.token_sesion === tokenSesion && ses.estado !== 'inactiva';
  } catch {
    return false;
  }
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

  // 1. Si tenemos slotId, actualizar en Firebase RTDB Operativa
  if (slotId) {
    const rutaSesion = params.rutaRaizOperativa
      ? `${params.rutaRaizOperativa.replace(/\/+$/, '')}/sesiones/${slotId}`
      : `sesiones/${slotId}`;

    await update(ref(db, rutaSesion), {
      operador_id: params.nuevoUsuarioId,
      operador_nombre: params.nuevoUsuarioNombre,
      rol_activo: params.nuevoCargo,
      ultima_interaccion_humana: timestamp,
    });

    // Registrar en bitácora operativa si existe la ruta
    try {
      const rutaBitacora = params.rutaRaizOperativa
        ? `${params.rutaRaizOperativa.replace(/\/+$/, '')}/bitacora_sesiones`
        : 'bitacora_sesiones';
      await update(ref(db, `${rutaBitacora}/${timestamp}`), {
        tipo: 'cambio_operador',
        slot_id: slotId,
        usuario_anterior: sesionActual?.usuario_id || '',
        usuario_nuevo: params.nuevoUsuarioId,
        nombre_nuevo: params.nuevoUsuarioNombre,
        cargo_nuevo: params.nuevoCargo,
        timestamp,
      });
    } catch {
      // No bloqueante
    }
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

  // 3. Actualizar la sesión operativa local conservando el slot, token y dispositivo
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
    dbSecundaria?: Database;
    rutaSecundariaMonitoreo?: string;
  }
): Promise<void> {
  const sesionActual = await obtenerSesionOperativaLocal();
  const slotId = params.slotId || sesionActual?.slot_id;

  if (slotId) {
    const rutaSesion = params.rutaRaizOperativa
      ? `${params.rutaRaizOperativa.replace(/\/+$/, '')}/sesiones/${slotId}`
      : `sesiones/${slotId}`;
    const rutaMonitoreo = params.rutaRaizOperativa
      ? `${params.rutaRaizOperativa.replace(/\/+$/, '')}/monitoreo/dispositivos/${slotId}`
      : `monitoreo/dispositivos/${slotId}`;

    await update(ref(db, rutaSesion), {
      estado: 'inactiva',
      ultimo_latido_presencia: Date.now(),
    });

    try {
      await set(ref(db, rutaMonitoreo), 'inactivo');
      if (params.dbSecundaria && params.rutaSecundariaMonitoreo) {
        await set(
          ref(params.dbSecundaria, `${params.rutaSecundariaMonitoreo}/${slotId}`),
          'inactivo'
        );
      }
    } catch {
      // Ignorar si no hay conexión
    }
  }

  await limpiarSesionOperativaLocal();
}

// ═══════════════════════════════════════════════════════════════════
// PERSISTENCIA LOCAL (storageSesion con aislamiento multi-pestaña)
// ═══════════════════════════════════════════════════════════════════

export async function obtenerSesionOperativaLocal(): Promise<SesionOperativaLocal | null> {
  try {
    const raw = await storageSesion.getItem(CLAVE_STORAGE_SESION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function guardarSesionOperativaLocal(sesion: SesionOperativaLocal): Promise<void> {
  try {
    await storageSesion.setItem(CLAVE_STORAGE_SESION, JSON.stringify(sesion));
  } catch (err) {
    console.warn('[SesionDispositivo] Error al guardar sesión local', err);
  }
}

export async function limpiarSesionOperativaLocal(): Promise<void> {
  try {
    await storageSesion.removeItem(CLAVE_STORAGE_SESION);
  } catch (err) {
    console.warn('[SesionDispositivo] Error al limpiar sesión local', err);
  }
}

export async function listarAuditoriaOperadores(): Promise<RegistroAuditoriaOperador[]> {
  try {
    const raw = await storageSesion.getItem(CLAVE_STORAGE_AUDITORIA);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function agregarRegistroAuditoriaLocal(registro: RegistroAuditoriaOperador): Promise<void> {
  try {
    const lista = await listarAuditoriaOperadores();
    lista.unshift(registro);
    const recortada = lista.slice(0, 100);
    await storageSesion.setItem(CLAVE_STORAGE_AUDITORIA, JSON.stringify(recortada));
  } catch (err) {
    console.warn('[SesionDispositivo] Error al registrar auditoría de operador', err);
  }
}
