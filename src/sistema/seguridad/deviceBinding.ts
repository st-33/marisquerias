/**
 * 🔒 DEVICE BINDING (VINCULACIÓN DE DISPOSITIVO)
 *
 * Sistema de seguridad que vincula un código de acceso a un dispositivo específico.
 *
 * FLUJO:
 * 1. Usuario ingresa código de acceso por primera vez
 * 2. Sistema obtiene ID único del dispositivo
 * 3. Guarda vinculación en AsyncStorage local
 * 4. Guarda dispositivo autorizado en Firebase
 * 5. Próximas veces: Salta pantalla de código
 *
 * SEGURIDAD:
 * - Código solo se pide la primera vez en cada dispositivo
 * - Si roban el dispositivo, puedes revocar acceso desde Firebase Console
 * - Si reinstalan la app, AsyncStorage se limpia y pide código de nuevo
 *
 * USO:
 * ```typescript
 * import { deviceBinding } from '@/core/security/deviceBinding';
 *
 * // Verificar si dispositivo ya está registrado
 * const isRegistered = await deviceBinding.isDeviceRegistered();
 *
 * // Registrar dispositivo después de login exitoso
 * await deviceBinding.registerDevice(negocioId);
 *
 * // Obtener info del dispositivo
 * const info = await deviceBinding.getDeviceInfo();
 * ```
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, serverTimestamp, set } from 'firebase/database';
import DeviceInfo from 'react-native-device-info';
import { logger } from '../monitoreo';
import { validar_ruta_negocio, descomponer_ruta_negocio } from '../rtdb/rutas/ruta_negocio';

const STORAGE_KEY = 'device_registered';
const STORAGE_KEY_DEVICE_ID = 'device_id';

export interface DeviceInfoData {
  /** ID único del dispositivo */
  deviceId: string;

  /** Marca del dispositivo (ej: "Samsung") */
  brand: string;

  /** Modelo del dispositivo (ej: "Galaxy A52") */
  model: string;

  /** Versión del sistema operativo */
  systemVersion: string;

  /** Nombre del sistema operativo */
  systemName: string;

  /** Si es un emulador/simulador */
  isEmulator: boolean;
}

/**
 * Obtener información del dispositivo actual
 */
export async function getDeviceInfo(): Promise<DeviceInfoData> {
  try {
    const [deviceId, brand, model, systemVersion, systemName, isEmulator] = await Promise.all([
      DeviceInfo.getUniqueId(),
      DeviceInfo.getBrand(),
      DeviceInfo.getModel(),
      DeviceInfo.getSystemVersion(),
      DeviceInfo.getSystemName(),
      DeviceInfo.isEmulator(),
    ]);

    return {
      deviceId,
      brand,
      model,
      systemVersion,
      systemName,
      isEmulator,
    };
  } catch (error) {
    logger.error('SECURITY', 'Error al obtener info del dispositivo', error as Error);
    throw error;
  }
}

/**
 * Verificar si el dispositivo actual ya está registrado
 *
 * @returns true si el dispositivo ya está vinculado a un negocio
 */
export async function isDeviceRegistered(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem('adi_dispositivo_vinculado');
    if (!raw) return false;
    const dispositivo = JSON.parse(raw);
    return dispositivo && dispositivo.estado === 'activo' && !!dispositivo.deviceIdADI;
  } catch (error) {
    logger.error('SECURITY', 'Error al verificar registro de dispositivo', error as Error);
    return false;
  }
}

/**
 * Registrar el dispositivo actual como autorizador
 *
 * Guarda:
 * 1. Flag local en AsyncStorage (para saltar pantalla de código)
 * 2. Info del dispositivo en Firebase (para auditoría y revocación)
 *
 * @param rutaNegocio - Path del negocio (ej: "2 alimentos_y_bebidas/marisquerias/puerto-libres")
 */
export async function registerDevice(rutaNegocio: string): Promise<void> {
  try {
    if (!validar_ruta_negocio(rutaNegocio)) {
      throw new Error(`Intento de registrar dispositivo en ruta inválida/legacy: ${rutaNegocio}`);
    }

    const { resolverDeviceIdADI } = await import(
      '../instalacion/vinculacion/generar-device-id-adi'
    );
    const deviceIdADI = await resolverDeviceIdADI();
    const deviceInfo = await getDeviceInfo();

    // Cláusula de guardia estricta contra dispositivos genéricos o corruptos
    if (
      !deviceIdADI ||
      deviceIdADI === 'unknown' ||
      deviceIdADI.includes('UNKNOWN_HW') ||
      deviceIdADI.includes('FALLBACK') ||
      deviceInfo.deviceId === 'unknown' ||
      deviceInfo.brand.toLowerCase() === 'unknown'
    ) {
      const errorMsg = `[deviceBinding] Registro abortado: Dispositivo inválido o genérico (deviceIdADI: ${deviceIdADI}, brand: ${deviceInfo?.brand}, hardwareId: ${deviceInfo?.deviceId})`;
      logger.error('SECURITY', errorMsg);
      throw new Error(errorMsg);
    }

    // 1. Guardar flags locales de compatibilidad
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    await AsyncStorage.setItem(STORAGE_KEY_DEVICE_ID, deviceIdADI);
    await AsyncStorage.setItem('adi_device_id_persistent', deviceIdADI);

    // Guardar también en la persistencia de vinculación local
    const localVinculoRaw = await AsyncStorage.getItem('adi_dispositivo_vinculado');
    let localVinculo = localVinculoRaw ? JSON.parse(localVinculoRaw) : null;
    if (!localVinculo) {
      localVinculo = {
        deviceIdADI,
        rutaNegocio,
        negocioId: descomponer_ruta_negocio(rutaNegocio)?.negocio_id || 'desconocido',
        aliasDispositivo: `Fierro ADI ${deviceIdADI.substring(4, 10)}`,
        estado: 'activo',
        nivelOperativo: 'operador',
        puedeCambiarRol: true,
        vinculadoEn: Date.now(),
        actualizadoEn: Date.now(),
      };
      await AsyncStorage.setItem('adi_dispositivo_vinculado', JSON.stringify(localVinculo));
    }

    // 2. Guardar en Firebase para auditoría
    // 🔥 FIX: Import dinámico para evitar ciclo
    const { getRtdb } = await import('../firebase');
    const db = getRtdb();
    const deviceRef = ref(db, `${rutaNegocio}/dispositivos/${deviceIdADI}`);

    await set(deviceRef, {
      deviceId: deviceIdADI,
      brand: deviceInfo.brand,
      model: deviceInfo.model,
      systemVersion: deviceInfo.systemVersion,
      systemName: deviceInfo.systemName,
      isEmulator: deviceInfo.isEmulator,
      estado: 'activo',
      fechaRegistro: serverTimestamp(),
      ultimoAcceso: serverTimestamp(),
    });

    logger.info('SECURITY', 'Dispositivo registrado exitosamente', {
      deviceId: deviceIdADI,
      model: deviceInfo.model,
    });

    logger.event('device_registered', {
      rutaNegocio,
      deviceId: deviceIdADI,
      model: deviceInfo.model,
    });
  } catch (error) {
    logger.error('SECURITY', 'Error al registrar dispositivo', error as Error);
    throw error;
  }
}

/**
 * Actualizar timestamp de último acceso del dispositivo
 *
 * Llamar esto cada vez que la app inicia para mantener registro de actividad.
 *
 * @param rutaNegocio - Path del negocio
 */
export async function updateLastAccess(rutaNegocio: string): Promise<void> {
  try {
    if (!validar_ruta_negocio(rutaNegocio)) {
      logger.warn('SECURITY', 'Intento de actualizar último acceso con ruta inválida/legacy', {
        rutaNegocio,
      });
      return;
    }

    const deviceId = await getStoredDeviceId();
    if (!deviceId) return;

    // 🔥 FIX: Import dinámico para evitar ciclo
    const { getRtdb } = await import('../firebase');
    const db = getRtdb();
    const deviceRef = ref(db, `${rutaNegocio}/dispositivos/${deviceId}/ultimoAcceso`);

    await set(deviceRef, serverTimestamp());

    logger.debug('SECURITY', 'Último acceso actualizado', { deviceId });
  } catch (error) {
    logger.warn('SECURITY', 'Error al actualizar último acceso', { error });
  }
}

/**
 * Desregistrar el dispositivo actual
 *
 * Útil para:
 * - Logout completo
 * - Testing
 * - Cambio de negocio
 */
export async function unregisterDevice(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(STORAGE_KEY_DEVICE_ID);
    await AsyncStorage.removeItem('adi_dispositivo_vinculado');
    await AsyncStorage.removeItem('adi_device_id_persistent');

    logger.info('SECURITY', 'Dispositivo desregistrado');
  } catch (error) {
    logger.error('SECURITY', 'Error al desregistrar dispositivo', error as Error);
    throw error;
  }
}

/**
 * Obtener ID del dispositivo guardado localmente
 *
 * @returns Device ID o null si no está registrado
 */
export async function getStoredDeviceId(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem('adi_dispositivo_vinculado');
    if (raw) {
      const dispositivo = JSON.parse(raw);
      if (dispositivo && dispositivo.deviceIdADI) {
        return dispositivo.deviceIdADI;
      }
    }
    const legacyId = await AsyncStorage.getItem(STORAGE_KEY_DEVICE_ID);
    if (legacyId) return legacyId;
    return await AsyncStorage.getItem('adi_device_id_persistent');
  } catch (error) {
    logger.error('SECURITY', 'Error al obtener device ID', error as Error);
    return null;
  }
}

// Exportar como objeto para facilitar mocking en tests
export const deviceBinding = {
  getDeviceInfo,
  isDeviceRegistered,
  registerDevice,
  updateLastAccess,
  unregisterDevice,
  getStoredDeviceId,
};
