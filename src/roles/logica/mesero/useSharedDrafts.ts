import type { Database } from 'firebase/database';
import { useCallback, useMemo } from 'react';
import { useSynchronizedArray } from '../../../sistema/sincronizacion';
import { createLogger } from '../../../plataforma/core/utils/logger';

const log = createLogger('useSharedDrafts');

/**
 * DraftItem compatible con el sistema unificado
 * Mantiene la misma estructura que SyncItem pero usando SynchronizableItem
 */
export type DraftItem = {
  id?: string;
  name: string;
  price: number;
  qty: number;
  productId?: string;
  variants?: Record<string, string[]>;
  basePrice?: number;
  variantDelta?: number;
  prepMin?: number;
  variantLabels?: string[];
};

type DraftItemSync = DraftItem & { id: string };

type UseSharedDraftsProps = {
  db: Database;
  tenantPath: string;
  mesaId: string | null;
  tenantId: string;
};

function sanitizeDraft<T>(item: T): T {
  return JSON.parse(JSON.stringify(item));
}

export function useSharedDrafts({ db, tenantPath, mesaId }: UseSharedDraftsProps) {
  const sanitizedMesaId = useMemo(() => {
    if (!mesaId) return null;
    const trimmed = String(mesaId).trim();
    return trimmed.length > 0 && trimmed !== 'undefined' ? trimmed : null;
  }, [mesaId]);

  const sanitizedTenantPath = useMemo(() => {
    const trimmed = tenantPath?.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [tenantPath]);

  // 🔥 NUEVO: Usar sistema unificado de sincronización
  const syncPath = useMemo(() => {
    if (!sanitizedTenantPath || !sanitizedMesaId) return null;
    return `${sanitizedTenantPath}/mesas_pendientes/${sanitizedMesaId}/items`;
  }, [sanitizedTenantPath, sanitizedMesaId]);

  const {
    items: syncedItems,
    isOnline,
    loading,
    addItem: addRemoteItem,
    updateItem: updateRemoteItem,
    removeItem: removeRemoteItem,
    clear: clearRemoteItems,
    getItemById,
    getItemByIndex,
  } = useSynchronizedArray<DraftItemSync>({
    db,
    path: syncPath,
    optimistic: true, // UI instantánea
  });

  // Helper para obtener ID desde índice o ID directo
  const ensureItemId = useCallback(
    (indexOrId: number | string): string | null => {
      if (typeof indexOrId === 'string') {
        return indexOrId;
      }
      const item = getItemByIndex(indexOrId);
      return item?.id ?? null;
    },
    [getItemByIndex]
  );

  const addItem = useCallback(
    async (item: DraftItem) => {
      const normalized = sanitizeDraft({
        name: item.name,
        price: item.price,
        qty: item.qty ?? 1,
        productId: item.productId,
        variants: item.variants,
        variantLabels: item.variantLabels,
      });

      log.debug('➕ addItem', { name: normalized.name, qty: normalized.qty });
      return addRemoteItem(normalized);
    },
    [addRemoteItem]
  );

  const removeItem = useCallback(
    async (indexOrId: number | string) => {
      const itemId = ensureItemId(indexOrId);
      if (!itemId) {
        log.warn('⚠️ removeItem: item no encontrado', { indexOrId });
        return false;
      }

      log.debug('➖ removeItem', { id: itemId });
      return removeRemoteItem(itemId);
    },
    [ensureItemId, removeRemoteItem]
  );

  const updateItem = useCallback(
    async (indexOrId: number | string, updates: Partial<DraftItem>) => {
      const itemId = ensureItemId(indexOrId);
      if (!itemId) {
        log.warn('⚠️ updateItem: item no encontrado', { indexOrId });
        return false;
      }

      const cleanUpdates = sanitizeDraft(updates);
      log.debug('🔄 updateItem', { id: itemId, updates: Object.keys(cleanUpdates) });
      return updateRemoteItem(itemId, cleanUpdates);
    },
    [ensureItemId, updateRemoteItem]
  );

  const incrementItem = useCallback(
    async (indexOrId: number | string) => {
      const itemId = ensureItemId(indexOrId);
      if (!itemId) {
        log.warn('⚠️ incrementItem: item no encontrado', { indexOrId });
        return false;
      }

      const current =
        typeof indexOrId === 'number' ? getItemByIndex(indexOrId) : getItemById(itemId);
      if (!current) {
        log.warn('⚠️ incrementItem: item no localizado', { indexOrId });
        return false;
      }

      return updateRemoteItem(itemId, { qty: current.qty + 1 });
    },
    [ensureItemId, getItemByIndex, getItemById, updateRemoteItem]
  );

  const decrementItem = useCallback(
    async (indexOrId: number | string) => {
      const itemId = ensureItemId(indexOrId);
      if (!itemId) {
        log.warn('⚠️ decrementItem: item no encontrado', { indexOrId });
        return false;
      }

      const current =
        typeof indexOrId === 'number' ? getItemByIndex(indexOrId) : getItemById(itemId);
      if (!current) {
        log.warn('⚠️ decrementItem: item no localizado', { indexOrId });
        return false;
      }

      if (current.qty <= 1) {
        return removeRemoteItem(itemId);
      }

      return updateRemoteItem(itemId, { qty: current.qty - 1 });
    },
    [ensureItemId, getItemByIndex, getItemById, removeRemoteItem, updateRemoteItem]
  );

  const clear = useCallback(async () => {
    log.debug('🧽 clear');
    return clearRemoteItems();
  }, [clearRemoteItems]);

  const totalItems = useCallback(() => syncedItems.length, [syncedItems]);

  const totalAmount = useCallback(
    () => syncedItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    [syncedItems]
  );

  return {
    items: syncedItems,
    loading,
    isOnline,
    addItem,
    removeItem,
    updateItem,
    incrementItem,
    decrementItem,
    clear,
    totalItems,
    totalAmount,
  };
}
