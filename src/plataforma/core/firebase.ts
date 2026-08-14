import { getApps, initializeApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
// 🔥 FIX: useStore se carga lazy dentro de getRtdb para evitar dependencia circular

// Firebase Web SDK config (público). Proporcionado por el usuario.
const firebaseConfig = {
  apiKey: 'AIzaSyAIYR6jc2xSveQM_pbitQQMwLl64xeQleI',
  authDomain: 'minegocioaunclick-1539b.firebaseapp.com',
  databaseURL: 'https://minegocioaunclick-1539b-default-rtdb.firebaseio.com',
  projectId: 'minegocioaunclick-1539b',
  storageBucket: 'minegocioaunclick-1539b.firebasestorage.app',
  messagingSenderId: '545296477639',
  appId: '1:545296477639:web:0f54262818f149a1be3de2',
  measurementId: 'G-PPBXXMQ6EZ',
};

export function getFirebaseApp() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return app;
}

/**
 * 🔥 FUNCIÓN MULTI-RTDB
 *
 * Obtiene una instancia de Firebase Realtime Database con soporte para múltiples instancias.
 *
 * ARQUITECTURA:
 * - Sin parámetros: Usa la URL por defecto (operacionUrl del store)
 * - Con alias: 'reparto' | 'perfiles' -> Usa la URL correspondiente del store
 * - Con URL completa: Usa la URL personalizada directamente
 *
 * EJEMPLOS:
 * ```ts
 * // Base de datos operacional (por defecto)
 * const db = getRtdb();
 *
 * // Base de datos de reparto
 * const dbReparto = getRtdb('reparto');
 *
 * // Base de datos de perfiles
 * const dbPerfiles = getRtdb('perfiles');
 *
 * // URL personalizada
 * const dbCustom = getRtdb('https://mi-instancia.firebaseio.com');
 * ```
 *
 * @param source - Alias ('reparto', 'perfiles') o URL completa de RTDB
 * @returns Instancia de Database
 */
export function getRtdb(source?: string): Database {
  const app = getFirebaseApp();

  // Si no hay source, usar la URL por defecto (operacionUrl)
  if (!source) {
    // 🔥 FIX: Import dinámico para evitar ciclo
    const { useStore } = require('../core/store');
    const dataSources = useStore.getState().dataSources;
    const url = dataSources.operacionUrl;

    if (!url) {
      // Fallback a la URL del config si no hay operacionUrl configurada
      return getDatabase(app);
    }

    return getDatabase(app, url);
  }

  // Si es un alias conocido, usar la URL del store
  if (source === 'reparto' || source === 'perfiles') {
    // 🔥 FIX: Import dinámico para evitar ciclo
    const { useStore } = require('../core/store');
    const dataSources = useStore.getState().dataSources;
    const url = source === 'reparto' ? dataSources.repartoUrl : dataSources.perfilesUrl;

    if (!url) {
      console.warn(`[getRtdb] No hay URL configurada para '${source}'. Usando RTDB por defecto.`);
      return getDatabase(app);
    }

    return getDatabase(app, url);
  }

  // Si es una URL completa (empieza con https://), usarla directamente
  if (source.startsWith('https://')) {
    return getDatabase(app, source);
  }

  // Si no es ninguno de los casos anteriores, advertir y usar por defecto
  console.warn(`[getRtdb] Source '${source}' no reconocido. Usando RTDB por defecto.`);
  return getDatabase(app);
}

/**
 * 🔄 HELPER PARA OBTENER RTDB POR ALIAS
 *
 * Versión tipada que solo acepta aliases conocidos.
 *
 * @example
 * const dbReparto = getRtdbByAlias('reparto');
 */
export function getRtdbByAlias(alias: 'operacion' | 'reparto' | 'perfiles'): Database {
  if (alias === 'operacion') return getRtdb();
  return getRtdb(alias);
}
