import type { ItemCocina, OrdenCocina } from '../marisqueria/cocina/useCocinaLogic';

/**
 * Deduplicate items within an order based on draftId, keeping the item with the highest
 * state priority (listo > en_preparacion > en_cocina > nuevo).
 */
export function deduplicateItems(items: ItemCocina[]): ItemCocina[] {
  const seenDraftIds = new Map<string, ItemCocina>();
  const estadoPrioridad: Record<string, number> = {
    listo: 3,
    en_preparacion: 2,
    en_cocina: 1,
    nuevo: 0,
  };

  items.forEach((item) => {
    if (!item.draftId) return;
    const existing = seenDraftIds.get(item.draftId);
    if (!existing) {
      seenDraftIds.set(item.draftId, item);
    } else {
      const existingPrio = estadoPrioridad[existing.estado as keyof typeof estadoPrioridad] ?? 0;
      const currentPrio = estadoPrioridad[item.estado as keyof typeof estadoPrioridad] ?? 0;
      if (currentPrio > existingPrio) {
        seenDraftIds.set(item.draftId, item);
      }
    }
  });

  // Filter out duplicates, keeping only the selected ones
  return items.filter((item) => {
    if (!item.draftId) return true;
    return seenDraftIds.get(item.draftId) === item;
  });
}

/**
 * Group items by productId + variantes + notas to create aggregated items.
 * Returns a new array where duplicated items are merged with a summed quantity.
 */
export function groupItems(items: ItemCocina[]): ItemCocina[] {
  const grupos = new Map<string, ItemCocina & { idsAgrupados: string[] }>();
  items.forEach((item) => {
    if (item.estado === 'entregado') return; // skip delivered
    const variantesKey = item.variantes
      ? JSON.stringify(Object.entries(item.variantes).sort())
      : '';
    // ⚡ FIX: Quitar estado de la key para permitir agrupar items de diferentes estados
    const groupKey = `${item.productoId || item.nombre}|${variantesKey}|${item.notas || ''}`;
    const existing = grupos.get(groupKey);
    if (existing) {
      existing.cantidad = (existing.cantidad || 1) + (item.cantidad || 1);
      existing.idsAgrupados.push(item.id);
      // Keep the most advanced state
      const estadoPrioridadArray = ['listo', 'en_preparacion', 'en_cocina', 'nuevo'];
      const currentPriority = estadoPrioridadArray.indexOf(existing.estado as any);
      const newPriority = estadoPrioridadArray.indexOf(item.estado as any);
      if (newPriority < currentPriority) {
        existing.estado = item.estado;
      }
      if (item.startedAt && (!existing.startedAt || item.startedAt < existing.startedAt)) {
        existing.startedAt = item.startedAt;
      }
    } else {
      grupos.set(groupKey, { ...item, idsAgrupados: [item.id] } as any);
    }
  });
  return Array.from(grupos.values());
}

/**
 * Calculate order statistics (total, pending, ready) from aggregated items.
 */
export function calculateStats(orden: OrdenCocina) {
  const itemsTotal = orden.items.length;
  const itemsPendientes = orden.items.filter(
    (it) => it.estado === 'nuevo' || it.estado === 'en_cocina' || it.estado === 'en_preparacion'
  ).length;
  const itemsListos = orden.items.filter((it) => it.estado === 'listo').length;
  return { itemsTotal, itemsPendientes, itemsListos };
}
