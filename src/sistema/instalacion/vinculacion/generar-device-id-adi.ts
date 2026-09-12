import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_ADI_DEVICE_ID = 'adi_device_id_persistent';
const CLAVE_STORAGE_WEB = '@adi_device_id';

/**
 * Resiliencia de Terminales en Expo Web / Navegadores:
 * Evita el bloqueo por marca unknown generando un identificador persistente en el cliente.
 */
export function obtenerDeviceIdResiliente(): string {
  const clave = CLAVE_STORAGE_WEB;
  let devId: string | null = null;
  if (typeof localStorage !== 'undefined') {
    try {
      devId = localStorage.getItem(clave);
    } catch {
      // Ignorar restricciones locales de navegador
    }
  }
  if (!devId) {
    devId = `ADI-web-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now()}`;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(clave, devId);
      } catch {
        // Ignorar
      }
    }
  }
  return devId;
}

/**
 * Genera o recupera el identificador único del dispositivo de forma persistente.
 * No confiamos únicamente en el ID del sistema operativo; si ya se generó uno,
 * lo leemos de AsyncStorage o localStorage para garantizar consistencia.
 */
export async function resolverDeviceIdADI(): Promise<string> {
  const isWeb = typeof window !== 'undefined' && typeof window.document !== 'undefined';
  if (isWeb) {
    return obtenerDeviceIdResiliente();
  }

  try {
    const persistido = await AsyncStorage.getItem(STORAGE_KEY_ADI_DEVICE_ID);
    if (persistido) {
      return persistido;
    }

    let hardwareId = '';
    try {
      const DeviceInfo = (await import('react-native-device-info')).default;
      if (DeviceInfo && typeof DeviceInfo.getUniqueId === 'function') {
        hardwareId = await DeviceInfo.getUniqueId();
      }
    } catch {
      hardwareId = 'UNKNOWN_HW';
    }

    // Estructuramos un ID compuesto con firma ADI
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    const timestamp = Date.now();
    const nuevoId = `ADI-${hardwareId || 'DEV'}-${randomPart}-${timestamp}`;

    await AsyncStorage.setItem(STORAGE_KEY_ADI_DEVICE_ID, nuevoId);
    return nuevoId;
  } catch {
    return obtenerDeviceIdResiliente();
  }
}
