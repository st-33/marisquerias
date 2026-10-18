/**
 * 🍳 FILTROS KDS POR ESTACIÓN DE PREPARACIÓN (Barman, Barista, Parrillero, Empacador)
 *
 * Filtra comandas para pantallas especializadas por estación:
 * - Si `estacion` es undefined -> Retorna todas las comandas completas.
 * - Si `estacion` está definida -> Filtra comandas por producto.estacion_preparacion === estacion.
 * - Los productos sin estacion_preparacion NO aparecen en filtros por estación (van a la vista general).
 * - Las comandas sin items para la estación no se muestran.
 */

import type { OrdenCocina, ItemCocina } from './useLogicaCocina';

export function filtrarComandasPorEstacion(
  ordenes: OrdenCocina[],
  productos: Record<string, { estacion_preparacion?: string; [key: string]: any }>,
  estacion?: string
): OrdenCocina[] {
  if (!estacion || !estacion.trim()) {
    return ordenes;
  }

  const estacionNormalizada = estacion.trim().toLowerCase();

  return ordenes
    .map((orden) => {
      const itemsEstacion = (orden.items || []).filter((item: ItemCocina) => {
        const prodId = item.productoId ?? (item as any).productId;
        const prod = prodId ? productos[prodId] : undefined;
        const estProd = prod?.estacion_preparacion ?? (item as any).estacion_preparacion;

        // Productos sin estacion_preparacion van a la vista general, no a la estación
        if (!estProd || typeof estProd !== 'string') {
          return false;
        }

        return estProd.trim().toLowerCase() === estacionNormalizada;
      });

      if (itemsEstacion.length === 0) {
        return null;
      }

      const itemsPendientes = itemsEstacion.filter((i) => i.estado !== 'listo').length;
      const itemsListos = itemsEstacion.filter((i) => i.estado === 'listo').length;

      return {
        ...orden,
        items: itemsEstacion,
        itemsTotal: itemsEstacion.length,
        itemsPendientes,
        itemsListos,
      };
    })
    .filter((orden): orden is OrdenCocina => orden !== null);
}
