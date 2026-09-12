import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

const STORAGE_KEY_ADI_DEVICE_ID = 'adi_device_id_persistent';

function esEntornoWeb(): boolean {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return true;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rn = require('react-native');
    return rn?.Platform?.OS === 'web';
  } catch {
    return false;
  }
}

function generarUUIDWeb(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Genera o recupera el identificador único del dispositivo de forma persistente.
 * No confiamos únicamente en el ID del sistema operativo; si ya se generó uno,
 * lo leemos de AsyncStorage para garantizar consistencia.
 *
 * Si el hardware no puede derivar un identificador físico en entorno nativo,
 * falla explícitamente sin usar strings genéricos o fallbacks provisionales.
 */
export async function resolverDeviceIdADI(): Promise<string> {
  const persistido = await AsyncStorage.getItem(STORAGE_KEY_ADI_DEVICE_ID);
  if (persistido) {
    // Si el ID guardado previamente era un fallback corrupto o unknown, ignorarlo y forzar regeneración
    if (
      !persistido.includes('UNKNOWN_HW') &&
      !persistido.includes('ADI-FALLBACK-') &&
      persistido !== 'unknown'
    ) {
      return persistido;
    }
  }

  let hardwareId = '';

  if (esEntornoWeb()) {
    // Entorno web legítimo: generamos y persistimos un UUID permanente
    const webUuid = generarUUIDWeb();
    hardwareId = `WEB-${webUuid}`;
  } else {
    try {
      hardwareId = await DeviceInfo.getUniqueId();
    } catch (err) {
      throw new Error(
        `[resolverDeviceIdADI] Error de hardware al consultar DeviceInfo.getUniqueId(): ${
          (err as Error)?.message || err
        }`
      );
    }

    if (!hardwareId || hardwareId.trim() === '' || hardwareId.toLowerCase() === 'unknown') {
      throw new Error(
        '[resolverDeviceIdADI] La API de hardware no devolvió un identificador físico válido'
      );
    }
  }

  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timestamp = Date.now();
  const nuevoId = `ADI-${hardwareId}-${randomPart}-${timestamp}`;

  await AsyncStorage.setItem(STORAGE_KEY_ADI_DEVICE_ID, nuevoId);
  return nuevoId;
}
