/**
 * 🔄 CLASE DE SINCRONIZACIÓN INVENTARIO ↔ COCINA (DOGMA V2)
 * Delega la autoridad única de consumo a `ServicioMovimientosInventario`,
 * manteniendo compatibilidad de firma con `pedidos.repositorio.ts`.
 */

import { getRtdb } from '../../sistema/firebase';
import { InventoryV2Repository } from '../../sistema/persistencia/inventario.repositorio';
import { RepositorioLibroPlatillos } from '../../sistema/persistencia/platillos.repositorio';
import {
  ServicioMovimientosInventario,
  resolverLineasConsumoParaProducto,
} from '../../sistema/servicios/ServicioMovimientosInventario';
import { useInventoryV2Store, useOperacionStore, useStore } from '../../sistema/store';

export type DescuentoResult = {
  success: boolean;
  sinStock?: string[];
  descontados?: string[];
  error?: string;
};

export class SincronizadorCocina {
  /**
   * Descontar ingredientes o artículo directo de un producto del inventario
   * delegando en `ServicioMovimientosInventario`.
   */
  static async descontarPorReceta(
    productoId: string,
    cantidad: number = 1,
    operacionIdOverride?: string
  ): Promise<DescuentoResult> {
    try {
      const db = getRtdb();

      if (!useStore || typeof useStore.getState !== 'function') {
        throw new Error(
          '[SincronizadorCocina] useStore no está disponible o no ha sido inicializado.'
        );
      }

      const rutaNegocio = useStore.getState().sesion?.rutaNegocio || '';

      let producto = useOperacionStore.getState().productos?.[productoId];
      if (!producto) {
        for (let intento = 1; intento <= 3; intento++) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          producto = useOperacionStore.getState().productos?.[productoId];
          if (producto) break;
        }
      }

      if (!producto) {
        return { success: false, error: `Producto ${productoId} no encontrado` };
      }

      const checkStoreListo = () => {
        const state = useInventoryV2Store.getState();
        const cat = state?.catalog;
        const ar = state?.areas;
        return Boolean(cat && Object.keys(cat).length > 0 && ar && Object.keys(ar).length > 0);
      };

      let catalog = useInventoryV2Store.getState()?.catalog;
      let areas = useInventoryV2Store.getState()?.areas;

      if (
        !catalog ||
        Object.keys(catalog).length === 0 ||
        !areas ||
        Object.keys(areas).length === 0
      ) {
        for (let intento = 1; intento <= 3; intento++) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          if (checkStoreListo()) break;
        }

        const refreshed = useInventoryV2Store.getState();
        catalog = refreshed?.catalog;
        areas = refreshed?.areas;

        if (
          (!catalog ||
            Object.keys(catalog).length === 0 ||
            !areas ||
            Object.keys(areas).length === 0) &&
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
            console.warn(
              '[SincronizadorCocina] Contingencia directa con repositorio falló:',
              repoErr
            );
          }
        }
      }

      if (
        !catalog ||
        Object.keys(catalog).length === 0 ||
        !areas ||
        Object.keys(areas).length === 0
      ) {
        throw new Error(
          `[SincronizadorCocina] Store de inventario no inicializado (catálogo o áreas vacíos). Descuento pospuesto para ${productoId} para prevenir falso sin stock.`
        );
      }

      let platilloAsociado: any = null;
      if (rutaNegocio && ((producto as any).origenTipo === 'platillo' || (producto as any).origenId)) {
        try {
          const repoPlatillos = new RepositorioLibroPlatillos(db, rutaNegocio);
          const platillosMap = await repoPlatillos.obtenerPlatillos();
          const origenKey = (producto as any).origenId || productoId;
          platilloAsociado = platillosMap[origenKey] || null;
        } catch {
          platilloAsociado = null;
        }
      }

      const { lineas } = resolverLineasConsumoParaProducto({
        producto: producto as any,
        platillo: platilloAsociado,
        cantidadVendida: cantidad,
        catalogoInventario: catalog,
      });

      if (lineas.length === 0) {
        return { success: true, descontados: [] };
      }

      const sinStock: string[] = [];
      for (const linea of lineas) {
        let stockConsolidado = 0;
        Object.values(areas).forEach((area: any) => {
          if (area?.stock && typeof area.stock[linea.itemId] === 'number') {
            stockConsolidado += area.stock[linea.itemId];
          }
        });
        if (stockConsolidado < linea.cantidadBase) {
          sinStock.push(linea.nombre || linea.itemId);
        }
      }

      if (sinStock.length > 0) {
        return {
          success: false,
          sinStock,
          error: `Stock insuficiente en: ${sinStock.join(', ')}`,
        };
      }

      const ajustarDelta = useInventoryV2Store.getState().ajustarStockDelta;
      if (operacionIdOverride && rutaNegocio) {
        const res = await ServicioMovimientosInventario.aplicarConsumoIdempotente({
          db,
          rutaNegocio,
          operacionId: operacionIdOverride,
          lineas,
          allowNegative: false,
          metadata: { productoId, cantidad },
        });
        return {
          success: res.aplicado || res.yaEstabaAplicado,
          descontados: res.lineasAplicadas.map((l) => l.itemId),
        };
      }

      const descontados: string[] = [];
      for (const linea of lineas) {
        let contenedorId: string | null = null;
        for (const [id, area] of Object.entries(areas)) {
          if ((area as any).stock?.[linea.itemId] > 0) {
            contenedorId = id;
            break;
          }
        }
        if (contenedorId) {
          await ajustarDelta({
            db,
            rutaNegocio,
            containerId: contenedorId,
            itemId: linea.itemId,
            delta: -linea.cantidadBase,
            razon: linea.razon || `Preparación: ${cantidad}x ${producto.nombre}`,
          });
          descontados.push(linea.itemId);
        }
      }

      return { success: true, descontados };
    } catch (error: any) {
      console.error('[SincronizadorCocina] Error al descontar:', error);
      return { success: false, error: error?.message || 'Error desconocido' };
    }
  }
}
