/**
 * 🔄 CLASE DE SINCRONIZACIÓN INVENTARIO ↔ COCINA (DOGMA V2)
 * Descuenta automáticamente el inventario cuando Kitchen comienza a preparar items
 */

import { getRtdb } from '../../sistema/firebase';
import { InventoryV2Repository } from '../../sistema/persistencia/inventario.repo';
import { useInventoryV2Store, useOperacionStore, useStore } from '../../sistema/store';

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

      // Guard de inicialización básica del store
      if (!useStore || typeof useStore.getState !== 'function') {
        throw new Error(
          '[SincronizadorCocina] useStore no está disponible o no ha sido inicializado.'
        );
      }

      const rutaNegocio = useStore.getState().sesion?.rutaNegocio || '';

      // 1. Obtener producto con receta del store local
      let producto = useOperacionStore.getState().productos?.[productoId];
      if (!producto) {
        // Breve espera por si los productos están terminando de sincronizar
        for (let intento = 1; intento <= 3; intento++) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          producto = useOperacionStore.getState().productos?.[productoId];
          if (producto) break;
        }
      }

      if (!producto) {
        return { success: false, error: `Producto ${productoId} no encontrado` };
      }

      const receta = (producto as any).receta?.ingredientes;
      if (!receta || Object.keys(receta).length === 0) {
        return { success: true, descontados: [] };
      }

      // 2. Validar stock instantáneamente con el store
      // En V2 el stock está distribuido por áreas/contenedores.
      const checkStoreListo = () => {
        const state = useInventoryV2Store.getState();
        const cat = state?.catalog;
        const ar = state?.areas;
        return Boolean(cat && Object.keys(cat).length > 0 && ar && Object.keys(ar).length > 0);
      };

      let catalog = useInventoryV2Store.getState()?.catalog;
      let areas = useInventoryV2Store.getState()?.areas;

      // Si el catálogo o las áreas están vacíos (store no inicializado), activar contingencia
      if (!catalog || Object.keys(catalog).length === 0 || !areas || Object.keys(areas).length === 0) {
        // Contingencia 1: Reintentos breves para esperar hidratación de listeners
        const MAX_INTENTOS = 3;
        const DELAY_MS = 250;
        for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
          if (checkStoreListo()) {
            break;
          }
        }

        const refreshed = useInventoryV2Store.getState();
        catalog = refreshed?.catalog;
        areas = refreshed?.areas;

        // Contingencia 2: Si el store persiste vacío, consultar directamente al repositorio de persistencia
        if (
          (!catalog || Object.keys(catalog).length === 0 || !areas || Object.keys(areas).length === 0) &&
          rutaNegocio
        ) {
          try {
            const repo = new InventoryV2Repository(db, rutaNegocio);
            const [catRemoto, areasRemotas] = await Promise.all([
              repo.obtenerCatalogo(),
              repo.obtenerAreas(),
            ]);
            if (
              catRemoto &&
              Object.keys(catRemoto).length > 0 &&
              areasRemotas &&
              Object.keys(areasRemotas).length > 0
            ) {
              catalog = catRemoto;
              areas = areasRemotas;
            }
          } catch (repoErr) {
            console.warn('[SincronizadorCocina] Contingencia directa con repositorio falló:', repoErr);
          }
        }
      }

      // Si tras la contingencia el inventario sigue sin estar disponible:
      // NO hacemos return ciego ni evaluamos stock contra colecciones vacías (evita falso "sin stock").
      if (!catalog || Object.keys(catalog).length === 0 || !areas || Object.keys(areas).length === 0) {
        throw new Error(
          `[SincronizadorCocina] Store de inventario no inicializado (catálogo o áreas vacíos). Descuento pospuesto para ${productoId} para prevenir falso sin stock.`
        );
      }
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
            rutaNegocio,
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
