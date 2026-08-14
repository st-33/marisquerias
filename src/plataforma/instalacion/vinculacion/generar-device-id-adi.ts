import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

const STORAGE_KEY_ADI_DEVICE_ID = 'adi_device_id_persistent';

/**
 * Genera o recupera el identificador único del dispositivo de forma persistente.
 * No confiamos únicamente en el ID del sistema operativo; si ya se generó uno,
 * lo leemos de AsyncStorage para garantizar consistencia.
 */
export async function resolverDeviceIdADI(): Promise<string> {
  try {
    const persistido = await AsyncStorage.getItem(STORAGE_KEY_ADI_DEVICE_ID);
    if (persistido) {
      return persistido;
    }

    let hardwareId = '';
    try {
      hardwareId = await DeviceInfo.getUniqueId();
    } catch {
      hardwareId = 'UNKNOWN_HW';
    }

    // Estructuramos un ID compuesto con firma ADI
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    const timestamp = Date.now();
    const nuevoId = `ADI-${hardwareId}-${randomPart}-${timestamp}`;

    await AsyncStorage.setItem(STORAGE_KEY_ADI_DEVICE_ID, nuevoId);
    return nuevoId;
  } catch {
    // Fallback extremo
    return `ADI-FALLBACK-${Date.now()}`;
  }
}
