/**
 * 🔧 NORMALIZADORES DE DATOS
 *
 * Funciones que convierten datos legacy/malformados de Firebase
 * a estructuras correctas y tipadas.
 *
 * PROBLEMA:
 * - Firebase puede tener datos de diferentes versiones
 * - Algunos campos pueden ser string, otros object
 * - Algunos timestamps son number, otros object
 *
 * SOLUCIÓN:
 * - Normalizar SIEMPRE antes de usar
 * - Ser defensivo con los tipos
 * - Loguear cuando se detecten datos raros
 */

import { logger } from '../../sistema/monitoreo';
import type { ItemStatus, OrderStatus } from './status';
import { toItemCanonical, toOrderCanonical } from './status';

/**
 * Normalizar campo de estado que puede venir como string u object
 *
 * Casos:
 * - "nuevo" → "nuevo" ✅
 * - { estado: "nuevo" } → "nuevo" ✅
 * - { estado: { estado: "nuevo" } } → "nuevo" ✅ (nested)
 */
export function normalizeEstado(raw: any): ItemStatus {
  // Si es string directo, usar
  if (typeof raw === 'string') {
    return toItemCanonical(raw);
  }

  // Si es object, buscar el campo 'estado'
  if (typeof raw === 'object' && raw !== null) {
    // Caso nested: { estado: { estado: "nuevo" } }
    if (raw.estado && typeof raw.estado === 'object' && raw.estado.estado) {
      logger.warn('NORMALIZER', 'Estado nested detectado, normalizando', { raw });
      return toItemCanonical(raw.estado.estado);
    }

    // Caso normal: { estado: "nuevo" }
    if (raw.estado) {
      return toItemCanonical(raw.estado);
    }

    // Si el object tiene propiedades pero no 'estado', loguear error
    logger.error(
      'NORMALIZER',
      'Estructura de estado inválida',
      new Error('Invalid estado structure'),
      { raw }
    );
  }

  // Fallback
  logger.warn('NORMALIZER', 'Estado desconocido, usando fallback "nuevo"', { raw });
  return 'nuevo';
}

/**
 * Normalizar campo de estatus de orden
 */
export function normalizeEstatus(raw: any): OrderStatus {
  if (typeof raw === 'string') {
    return toOrderCanonical(raw);
  }

  if (typeof raw === 'object' && raw !== null) {
    if (raw.estatus && typeof raw.estatus === 'object' && raw.estatus.estatus) {
      logger.warn('NORMALIZER', 'Estatus nested detectado, normalizando', { raw });
      return toOrderCanonical(raw.estatus.estatus);
    }

    if (raw.estatus) {
      return toOrderCanonical(raw.estatus);
    }

    logger.error(
      'NORMALIZER',
      'Estructura de estatus inválida',
      new Error('Invalid estatus structure'),
      { raw }
    );
  }

  logger.warn('NORMALIZER', 'Estatus desconocido, usando fallback "creado"', { raw });
  return 'creado';
}

/**
 * Normalizar timestamp que puede venir como number u object
 *
 * Casos:
 * - 1732512345678 → 1732512345678 ✅
 * - { seconds: 1732512345, nanoseconds: 678000000 } → 1732512345678 ✅ (Firestore)
 * - { _seconds: 1732512345, _nanoseconds: 678000000 } → 1732512345678 ✅ (Firebase Admin)
 */
export function normalizeTimestamp(raw: any): number {
  // Si es number directo, usar
  if (typeof raw === 'number') {
    return raw;
  }

  // Si es object de Firestore/Firebase Admin
  if (typeof raw === 'object' && raw !== null) {
    // Firestore Timestamp
    if (raw.seconds !== undefined) {
      return raw.seconds * 1000 + Math.floor((raw.nanoseconds || 0) / 1000000);
    }

    // Firebase Admin Timestamp
    if (raw._seconds !== undefined) {
      return raw._seconds * 1000 + Math.floor((raw._nanoseconds || 0) / 1000000);
    }

    logger.warn('NORMALIZER', 'Timestamp con estructura desconocida', { raw });
  }

  // Fallback: usar timestamp actual
  logger.warn('NORMALIZER', 'Timestamp inválido, usando Date.now()', { raw });
  return Date.now();
}

/**
 * Garantiza que un valor timestamp siempre sea un número.
 * Wrapper sobre normalizeTimestamp que NUNCA falla.
 *
 * Uso:
 * - En mergeMaps para comparar updatedAt
 * - En filtros de fecha para comparar createdAt
 * - En payloads de escritura para asegurar tipo correcto
 */
export function ensureNumberTimestamp(value: any): number {
  if (value === null || value === undefined) {
    return Date.now();
  }
  return normalizeTimestamp(value);
}

/**
 * Normalizar item de pedido
 */
export function normalizeItem(raw: any): any {
  if (!raw || typeof raw !== 'object') {
    logger.error('NORMALIZER', 'Item inválido', new Error('Invalid item'), { raw });
    return null;
  }

  return {
    ...raw,
    estado: normalizeEstado(raw.estado),
    startedAt: raw.startedAt ? normalizeTimestamp(raw.startedAt) : undefined,
  };
}

/**
 * Normalizar pedido completo
 */
export function normalizePedido(raw: any): any {
  if (!raw || typeof raw !== 'object') {
    logger.error('NORMALIZER', 'Pedido inválido', new Error('Invalid pedido'), { raw });
    return null;
  }

  // Normalizar items
  const items = raw.items || {};
  const normalizedItems: Record<string, any> = {};

  Object.entries(items).forEach(([id, item]) => {
    const normalized = normalizeItem(item);
    if (normalized) {
      normalizedItems[id] = normalized;
    }
  });

  return {
    ...raw,
    estatus: normalizeEstatus(raw.estatus),
    items: normalizedItems,
    createdAt: raw.createdAt ? normalizeTimestamp(raw.createdAt) : Date.now(),
    updatedAt: raw.updatedAt ? normalizeTimestamp(raw.updatedAt) : Date.now(),
    sentToKitchenAt: raw.sentToKitchenAt ? normalizeTimestamp(raw.sentToKitchenAt) : undefined,
  };
}

/**
 * Normalizar mesa
 */
export function normalizeMesa(raw: any): any {
  if (!raw || typeof raw !== 'object') {
    logger.error('NORMALIZER', 'Mesa inválida', new Error('Invalid mesa'), { raw });
    return null;
  }

  return {
    ...raw,
    updatedAt: raw.updatedAt ? normalizeTimestamp(raw.updatedAt) : Date.now(),
  };
}
