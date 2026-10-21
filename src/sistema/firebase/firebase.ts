/**
 * 🔥 FIREBASE — MARISQUERÍAS
 *
 * ARQUITECTURA DE CONEXIONES:
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Unidad Secundaria  →  URL fija, conocida al compilar           │
 * │  (códigos de acceso, NPB, perfiles de categoría)               │
 * │  Proyecto: unidad-secundaria | ID: 678908887941                │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  Unidad del Negocio →  URL dinámica, obtenida al resolver       │
 * │  el código de acceso en Unidad Secundaria. Se guarda en         │
 * │  el store (dataSources.operacionUrl). Una por negocio.          │
 * │  Múltiples dispositivos del mismo negocio comparten esta URL.  │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * REGLAS:
 * - No hay URL hardcodeada de ningún negocio en este archivo.
 * - La Unidad del Negocio solo existe en tiempo de ejecución.
 * - El Ecosistema escribe la estructura de cada Unidad al registrar
 *   un negocio. Esta app solo opera dentro de esa estructura.
 * - getOperacionRtdb / getRtdb NUNCA lanzan excepciones que rompan
 *   el ciclo de render de React/Expo si aún no hay sesión activa.
 *   Si la URL operativa aún no fue resuelta, retornan de forma segura
 *   la instancia de Unidad Secundaria como fallback controlado.
 */

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

// ═══════════════════════════════════════════════════════════════════
// CREDENCIALES DEL PROYECTO FIREBASE
// Solo autenticación y metadatos del proyecto.
// NO incluye databaseURL — la Unidad del negocio se asigna
// en tiempo de ejecución, no al compilar.
// ═══════════════════════════════════════════════════════════════════
const CONFIG_PROYECTO = {
  apiKey: 'AIzaSyAIYR6jc2xSveQM_pbitQQMwLl64xeQleI',
  authDomain: 'minegocioaunclick-1539b.firebaseapp.com',
  projectId: 'minegocioaunclick-1539b',
  storageBucket: 'minegocioaunclick-1539b.firebasestorage.app',
  messagingSenderId: '545296477639',
  appId: '1:545296477639:web:0f54262818f149a1be3de2',
};

// ═══════════════════════════════════════════════════════════════════
// UNIDAD SECUNDARIA — URL canónica del Ecosistema
// Esta es la única URL fija que conoce la app de Marisquerías.
// Contiene: códigos de acceso, plantillas NPB, catálogos por categoría.
// ═══════════════════════════════════════════════════════════════════
const URL_SECUNDARIA = 'https://unidad-secundaria-default-rtdb.firebaseio.com';
const NOMBRE_APP_SECUNDARIA = '[unidad-secundaria]';

// ═══════════════════════════════════════════════════════════════════
// INICIALIZADORES DE APP FIREBASE
// ═══════════════════════════════════════════════════════════════════

/** App principal del proyecto. */
export function getFirebaseApp(): FirebaseApp {
  const existente = getApps().find((a) => a.name === '[DEFAULT]');
  return existente ?? initializeApp(CONFIG_PROYECTO);
}

/** App dedicada a la Unidad Secundaria del Ecosistema. */
export function getAppSecundaria(): FirebaseApp {
  const existente = getApps().find((a) => a.name === NOMBRE_APP_SECUNDARIA);
  return (
    existente ??
    initializeApp({ ...CONFIG_PROYECTO, databaseURL: URL_SECUNDARIA }, NOMBRE_APP_SECUNDARIA)
  );
}

// ═══════════════════════════════════════════════════════════════════
// UNIDAD SECUNDARIA
// ═══════════════════════════════════════════════════════════════════

/**
 * Instancia RTDB de la Unidad Secundaria.
 * Disponible desde el arranque — no requiere código de acceso.
 */
export function getSecundariaRtdb(): Database {
  return getDatabase(getAppSecundaria(), URL_SECUNDARIA);
}

// ═══════════════════════════════════════════════════════════════════
// UNIDAD DEL NEGOCIO (OPERATIVA)
// ═══════════════════════════════════════════════════════════════════

function _leerUrlOperativaDelStore(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useStore } = require('../store');
    const url: string | null = useStore.getState().dataSources?.operacionUrl ?? null;
    return url?.trim() || null;
  } catch {
    return null;
  }
}

/** Indica si la sesión activa ya cuenta con la URL operativa de la Unidad. */
export function tieneUrlOperativa(): boolean {
  return !!_leerUrlOperativaDelStore();
}

/**
 * Instancia RTDB de la Unidad del negocio vinculado.
 *
 * La URL se obtiene del store (dataSources.operacionUrl), que se
 * popula cuando el Ecosistema resuelve el código de acceso en
 * Unidad Secundaria y devuelve db_url_operativa.
 *
 * @param urlDirecta — URL explícita (solo para uso interno del arranque O(1))
 * @returns Database operativa si la sesión está activa, o Unidad Secundaria como fallback seguro.
 */
export function getOperacionRtdb(urlDirecta?: string): Database {
  const url = urlDirecta ?? _leerUrlOperativaDelStore();

  if (!url) {
    // Sin sesión vinculada aún — fallback seguro a Unidad Secundaria
    return getSecundariaRtdb();
  }

  return getDatabase(getFirebaseApp(), url);
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN GENÉRICA — resolución por URL o alias
// ═══════════════════════════════════════════════════════════════════

/**
 * Resuelve una instancia RTDB por alias canónico o URL completa.
 *
 * Aliases:
 * - 'secundaria' → Unidad Secundaria del Ecosistema (siempre disponible)
 * - 'operacion'  → Unidad del negocio (desde store, fallback seguro)
 * - 'reparto'    → Sub-URL de reparto del negocio (fallback a operacion)
 *
 * @param source — alias | URL completa (https://...) | undefined/null para operacion
 * @returns Instancia de Database siempre válida
 */
export function getRtdb(source?: string | null): Database {
  // Sin source o alias explícito de operación → Unidad del negocio
  if (!source || source === 'operacion') return getOperacionRtdb();

  // Alias fijo de la única URL conocida al compilar
  if (source === 'secundaria') return getSecundariaRtdb();

  // Sub-URLs opcionales del negocio (reparto, perfiles)
  if (source === 'reparto' || source === 'perfiles') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useStore } = require('../store');
      const ds = useStore.getState().dataSources;
      const url: string | null = source === 'reparto' ? ds?.repartoUrl : ds?.perfilesUrl;
      if (url?.trim()) return getOperacionRtdb(url.trim());
    } catch {
      // fallback a operacion
    }
    return getOperacionRtdb();
  }

  // URL completa pasada directamente
  if (source.startsWith('https://') || source.startsWith('http://')) {
    return getDatabase(getFirebaseApp(), source);
  }

  return getOperacionRtdb();
}

/** Alias tipado por nombre canónico de instancia. */
export function getRtdbByAlias(
  alias: 'secundaria' | 'operacion' | 'reparto' | 'perfiles'
): Database {
  return getRtdb(alias);
}

/** Helper: normaliza una URL RTDB (quita trailing slash, trim). */
export function normalizarUrlRtdb(url?: string | null): string {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
}
