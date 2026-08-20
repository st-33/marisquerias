/**
 * 🔄 HOOK UNIFICADO DE SINCRONIZACIÓN DE ARRAYS
 *
 * Reemplaza:
 * - useMultiDeviceSync
 * - useOptimisticArray (de useOptimisticRTDB)
 *
 * CARACTERÍSTICAS:
 * - Sincronización en tiempo real con Firebase
 * - Updates optimistas (UI instantánea)
 * - Transacciones atómicas (sin race conditions)
 * - Detección automática de ecos
 * - IDs únicos obligatorios
 *
 * USO:
 * ```ts
 * const { items, loading, addItem, removeItem, updateItem } = useSynchronizedArray({
 *   db,
 *   path: `${tenantPath}/mesas_pendientes/${mesaId}/items`,
 *   optimistic: true, // UI instantánea
 * });
 * ```
 */

import { Database } from 'firebase/database';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SynchronizationService,
  synchronizationService,
  type SynchronizableItem,
} from './SynchronizationService';
import { createLogger } from '../../plataforma/core/utils/logger';

const log = createLogger('useSynchronizedArray');

export interface UseSynchronizedArrayConfig<T extends SynchronizableItem> {
  /** Instancia de Firebase Database */
  db: Database;

  /** Path completo en Firebase (ej: "tenant/mesas_pendientes/mesa1/items") */
  path: string | null;

  /** Habilitar updates optimistas (default: true) */
  optimistic?: boolean;

  /** Tiempo en ms para detectar ecos (default: 150ms) */
  echoWindow?: number;

  /** Callback cuando hay cambios remotos */
  onRemoteChange?: (items: T[]) => void;

  /** Callback cuando hay error */
  onError?: (error: Error) => void;
}

export interface SynchronizedArrayResult<T extends SynchronizableItem> {
  /** Items sincronizados (fuente de verdad) */
  items: T[];

  /** Estado de carga inicial */
  loading: boolean;

  /** Estado de conexión */
  isOnline: boolean;

  /** Timestamp de última sincronización */
  lastSync: number;

  /** Agregar item (con ID único automático si no se provee) */
  addItem: (item: Omit<T, 'id'> & { id?: string }) => Promise<boolean>;

  /** Actualizar item por ID */
  updateItem: (id: string, updates: Partial<Omit<T, 'id'>>) => Promise<boolean>;

  /** Eliminar item por ID */
  removeItem: (id: string) => Promise<boolean>;

  /** Limpiar todos los items */
  clear: () => Promise<boolean>;

  /** Obtener item por ID */
  getItemById: (id: string) => T | undefined;

  /** Obtener item por índice (legacy support) */
  getItemByIndex: (index: number) => T | undefined;
}

/**
 * Hook unificado para sincronización de arrays
 */
export function useSynchronizedArray<T extends SynchronizableItem>(
  config: UseSynchronizedArrayConfig<T>
): SynchronizedArrayResult<T> {
  const { db, path, optimistic = true, echoWindow = 150, onRemoteChange, onError } = config;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState(0);

  // Refs para evitar closure stale
  const itemsRef = useRef<T[]>([]);
  const pathRef = useRef<string | null>(null);
  const optimisticItemsRef = useRef<T[]>([]); // Estado optimista local

  // Actualizar refs
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  // Suscripción a Firebase
  useEffect(() => {
    if (!path) {
      optimisticItemsRef.current = [];
      return;
    }

    log.debug(`🔗 Iniciando suscripción: ${path}`);

    const unsubscribe = synchronizationService.subscribe(
      db,
      {
        path,
        echoWindow,
        onRemoteChange: (newItems) => {
          // Actualizar estado real
          setItems(newItems as T[]);
          optimisticItemsRef.current = newItems as T[];
          setLastSync(Date.now());
          setIsOnline(true);

          // Notificar callback
          onRemoteChange?.(newItems as T[]);
        },
        onError: (error) => {
          log.error('❌ Error en sincronización:', error);
          setIsOnline(false);
          setLoading(false);
          onError?.(error);
        },
      },
      (newItems) => {
        // Callback interno del servicio
        setItems(newItems as T[]);
        optimisticItemsRef.current = newItems as T[];
        setLastSync(Date.now());
        setIsOnline(true);
        setLoading(false);
      }
    );

    return () => {
      log.debug(`🔌 Limpiando suscripción: ${path}`);
      unsubscribe();
    };
  }, [db, path, echoWindow, onRemoteChange, onError]);

  // Agregar item
  const addItem = useCallback(
    async (item: Omit<T, 'id'> & { id?: string }): Promise<boolean> => {
      const activePath = pathRef.current;
      if (!activePath) {
        log.warn('⚠️ Path no disponible para agregar item');
        return false;
      }

      // Update optimista
      if (optimistic) {
        const itemWithId = synchronizationService.ensureId(item);
        const optimisticItems = [...optimisticItemsRef.current, itemWithId];
        optimisticItemsRef.current = optimisticItems;
        setItems(optimisticItems);
      }

      // Operación real
      const success = await synchronizationService.addItem<T>(db, activePath, item);

      if (!success && optimistic) {
        // Rollback en caso de error
        optimisticItemsRef.current = itemsRef.current;
        setItems(itemsRef.current);
        log.warn('⚠️ Rollback: error al agregar item');
      }

      return success;
    },
    [db, optimistic]
  );

  // Actualizar item por ID
  const updateItem = useCallback(
    async (id: string, updates: Partial<Omit<T, 'id'>>): Promise<boolean> => {
      const activePath = pathRef.current;
      if (!activePath) {
        log.warn('⚠️ Path no disponible para actualizar item');
        return false;
      }

      // Update optimista
      if (optimistic) {
        const optimisticItems = optimisticItemsRef.current.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        );
        optimisticItemsRef.current = optimisticItems;
        setItems(optimisticItems);
      }

      // Operación real
      const success = await synchronizationService.updateItemById<T>(db, activePath, id, updates);

      if (!success && optimistic) {
        // Rollback
        optimisticItemsRef.current = itemsRef.current;
        setItems(itemsRef.current);
        log.warn('⚠️ Rollback: error al actualizar item');
      }

      return success;
    },
    [db, optimistic]
  );

  // Eliminar item por ID
  const removeItem = useCallback(
    async (id: string): Promise<boolean> => {
      const activePath = pathRef.current;
      if (!activePath) {
        log.warn('⚠️ Path no disponible para eliminar item');
        return false;
      }

      // Update optimista
      if (optimistic) {
        const optimisticItems = optimisticItemsRef.current.filter((item) => item.id !== id);
        optimisticItemsRef.current = optimisticItems;
        setItems(optimisticItems);
      }

      // Operación real
      const success = await synchronizationService.removeItemById(db, activePath, id);

      if (!success && optimistic) {
        // Rollback
        optimisticItemsRef.current = itemsRef.current;
        setItems(itemsRef.current);
        log.warn('⚠️ Rollback: error al eliminar item');
      }

      return success;
    },
    [db, optimistic]
  );

  // Limpiar todos los items
  const clear = useCallback(async (): Promise<boolean> => {
    const activePath = pathRef.current;
    if (!activePath) {
      setItems([]);
      optimisticItemsRef.current = [];
      return true;
    }

    // Update optimista
    if (optimistic) {
      optimisticItemsRef.current = [];
      setItems([]);
    }

    // Operación real
    const success = await synchronizationService.clearItems(db, activePath);

    if (!success && optimistic) {
      // Rollback
      optimisticItemsRef.current = itemsRef.current;
      setItems(itemsRef.current);
      log.warn('⚠️ Rollback: error al limpiar items');
    }

    return success;
  }, [db, optimistic]);

  // Helpers
  const getItemById = useCallback((id: string): T | undefined => {
    return itemsRef.current.find((item) => item.id === id);
  }, []);

  const getItemByIndex = useCallback((index: number): T | undefined => {
    return index >= 0 && index < itemsRef.current.length ? itemsRef.current[index] : undefined;
  }, []);

  return {
    items: path ? items : [],
    loading: path ? loading : false,
    isOnline,
    lastSync,
    addItem,
    updateItem,
    removeItem,
    clear,
    getItemById,
    getItemByIndex,
  };
}
