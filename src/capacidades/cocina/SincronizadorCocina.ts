/**
 * 🔄 CLASE DE SINCRONIZACIÓN INVENTARIO ↔ COCINA (DOGMA V2)
 * Descuenta automáticamente el inventario cuando Kitchen comienza a preparar items
 */

import { getRtdb } from '../../plataforma/core/firebase';
import { useInventoryV2Store, useOperacionStore, useStore } from '../../plataforma/core/store';

export type DescuentoResult = {
  success: boolean;
  sinStock?: string[];
  descontados?: string[];
  error?: string;
};

export class SincronizadorCocina {
  /**
   * Descontar ingredientes de un producto del inventario
   * Usa el store para validación instantánea y actualiza Firebase
   */
  static async descontarPorReceta(
    productoId: string,
    cantidad: number = 1
  ): Promise<DescuentoResult> {
    try {
      const db = getRtdb();
      const tenantPath = useStore.getState().sesion.tenantPath || '';

      // 1. Obtener producto con receta del store local
      const producto = useOperacionStore.getState().productos[productoId];
      if (!producto) {
        return { success: false, error: `Producto ${productoId} no encontrado` };
      }

      const receta = (producto as any).receta?.ingredientes;
      if (!receta || Object.keys(receta).length === 0) {
        return { success: true, descontados: [] };
      }

      // 2. Validar stock instantáneamente con el store
      // En V2 el stock está distribuido por áreas/contenedores.
      // Debemos decidir de qué área descontar o si hay una lógica de fallback.
      const catalog = useInventoryV2Store.getState().catalog;
      const areas = useInventoryV2Store.getState().areas;
      const sinStock: string[] = [];

      for (const [itemId, cantidadReceta] of Object.entries(receta)) {
        const cantidadNecesaria = (cantidadReceta as number) * cantidad;
        const item = catalog[itemId];

        let stockConsolidado = 0;
        Object.values(areas).forEach((area: any) => {
          if (area.stock && area.stock[itemId]) {
            stockConsolidado += area.stock[itemId];
          }
        });

        if (!item || stockConsolidado < cantidadNecesaria) {
          sinStock.push(item?.nombre || itemId);
        }
      }

      if (sinStock.length > 0) {
        return {
          success: false,
          sinStock,
          error: `Stock insuficiente en: ${sinStock.join(', ')}`,
        };
      }

      // 3. Ejecutar descuentos (asíncrono)
      const ajustarDelta = useInventoryV2Store.getState().ajustarStockDelta;
      const descontados: string[] = [];

      for (const [itemId, cantidadReceta] of Object.entries(receta)) {
        const cantidadA_Descontar = (cantidadReceta as number) * cantidad;

        // Estrategia simple: buscar el primer contenedor que tenga stock de este item
        let contenedorId: string | null = null;
        for (const [id, area] of Object.entries(areas)) {
          if ((area as any).stock?.[itemId] > 0) {
            contenedorId = id;
            break;
          }
        }

        if (contenedorId) {
          await ajustarDelta({
            db,
            tenantPath,
            containerId: contenedorId,
            itemId,
            delta: -cantidadA_Descontar,
            razon: `Preparación: ${cantidad}x ${producto.nombre}`,
          });
          descontados.push(itemId);
        }
      }

      return { success: true, descontados };
    } catch (error: any) {
      console.error('[SincronizadorCocina] Error al descontar:', error);
      return { success: false, error: error?.message || 'Error desconocido' };
    }
  }
}
