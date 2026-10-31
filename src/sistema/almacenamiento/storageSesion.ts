/**
 * 🔒 ALMACENAMIENTO DE SESIÓN RESILIENTE CON AISLAMIENTO POR PESTAÑA
 *
 * Cumplimiento de la Regla 18:
 * - En Web real (Platform.OS === 'web' con window.sessionStorage activo):
 *   utiliza window.sessionStorage para aislar estrictamente las sesiones
 *   entre pestañas de localhost y prevenir contaminación cruzada.
 * - En Nativo (Android / iOS) o entorno de pruebas unitarias (Jest/Node):
 *   utiliza AsyncStorage persistente estándar / mockeado.
 */

import AsyncStorageNative from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import asyncStorageWeb from './asyncStorageWeb';

const esNavegadorWeb =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof window.sessionStorage !== 'undefined';

export const storageSesion = esNavegadorWeb ? asyncStorageWeb : AsyncStorageNative;
export default storageSesion;
