/**
 * 📦 CEREBRO - DESCUENTO DE INVENTARIO (MESERO / ENTREGA)
 * Módulo encargado de descontar existencias al entregar un artículo o platillo,
 * delegando en la Autoridad Única (`ServicioMovimientosInventario`) con `operacionId` idempotente.
 */

import { useCallback } from 'react';
import { InventoryV2Repository } from '../../../sistema/persistencia/inventario.repositorio';
import { PedidosRepository } from '../../../sistema/persistencia/pedidos.repositorio';
import { RepositorioLibroPlatillos } from '../../../sistema/persistencia/platillos.repositorio';
import {
  ServicioMovimientosInventario,
  resolverLineasConsumoParaProducto,
} from '../../../sistema/servicios/ServicioMovimientosInventario';
import { useStore } from '../../../sistema/store';
import { getRtdb } from '../../../sistema/firebase';
import { createLogger } from '../../../sistema/monitoreo';
import {
  classifyInventoryError,
  type InventoryDeductionResult,
  type InventoryErrorCode,
} from './erroresInventario';

const log = createLogger('descontarInventario');

type DescontarInventarioProps = {
  inventarioV2Repo: InventoryV2Repository;
  pedidosRepo: PedidosRepository;
  getProductoDelStore: (productoId: string) => any;
};

export function useDescontarInventario({
  inventarioV2Repo,
  pedidosRepo,
  getProductoDelStore,
}: DescontarInventarioProps) {
  const inventoryAutoDiscount =
    useStore((s: any) => s.negocio.features?.inventory_auto_discount?.enabled) !== false;

  const persistInventoryError = useCallback(
    async ({
      pedidoActivoId,
      itemId,
      error,
      code,
    }: {
      pedidoActivoId: string;
      itemId: string;
      error: string;
      code: InventoryErrorCode;
    }) => {
      try {
        await pedidosRepo.actualizarItem(pedidoActivoId, itemId, {
          inventoryError: error,
          inventoryErrorCode: code,
          inventoryErrorAt: Date.now(),
        });
      } catch (persistError) {
        log.error('💥 No se pudo persistir el error de inventario:', persistError);
      }
    },
    [pedidosRepo]
  );

  const descontarStockDeItem = useCallback(
    async (params: {
      item: any;
      pedidoActivoId: string;
      itemId: string;
    }): Promise<InventoryDeductionResult> => {
      const { item, pedidoActivoId, itemId } = params;
      if (!inventoryAutoDiscount || !item || item.inventoryDeducted) {
        return { success: true, skipped: true };
      }

      try {
        log.info(`📦 Descontando inventario por entrega: ${item.nombre}`);

        const productoId = item.productId ?? item.productoId;
        if (!productoId) {
          const error = 'No se puede descontar inventario: el item no tiene productId';
          await persistInventoryError({
            pedidoActivoId,
            itemId,
            error,
            code: 'INVENTORY_DEDUCTION_FAILED',
          });
          return { success: false, error, code: 'INVENTORY_DEDUCTION_FAILED', itemId };
        }

        const state = useStore.getState() as any;
        const rutaNegocio = state.sesion?.rutaNegocio || '/';
        const db = getRtdb(state.dataSources?.operacionUrl || undefined);
        const producto = getProductoDelStore(productoId);
        const cantidadVendida = Number(item.cantidad || 1);

        let catalogoInventario = state.catalog || {};
        if (Object.keys(catalogoInventario).length === 0) {
          catalogoInventario = await inventarioV2Repo.obtenerCatalogo();
        }

        let platillo = null;
        if (producto?.origenTipo === 'platillo' && producto?.origenId) {
          const libroRepo = new RepositorioLibroPlatillos(db, rutaNegocio);
          const platillosMap = await libroRepo.obtenerPlatillos();
          platillo = platillosMap[producto.origenId] || null;
        }

        const { lineas } = resolverLineasConsumoParaProducto({
          producto,
          platillo,
          cantidadVendida,
          nombreFallback: item.nombre,
          catalogoInventario,
        });

        if (lineas.length > 0) {
          const operacionId = `pedido_${pedidoActivoId}_item_${itemId}`;
          await ServicioMovimientosInventario.aplicarConsumoIdempotente({
            db,
            rutaNegocio,
            operacionId,
            lineas,
            hubPreferido: state.sesion?.niche === 'venta_crudo' ? 'venta_crudo' : 'restaurante',
            usuario: state.sesion?.usuario?.nombre || 'mesero',
            allowNegative: false,
            metadata: {
              origen: 'mesero',
              pedidoId: pedidoActivoId,
              itemId,
              productoId,
            },
          });
        }

        await pedidosRepo.actualizarItem(pedidoActivoId, itemId, {
          inventoryDeducted: true,
          inventoryError: null,
          inventoryErrorCode: null,
          inventoryErrorAt: null,
        });
        return { success: true };
      } catch (inventoryError) {
        const failure = classifyInventoryError(inventoryError);
        log.error('💥 Error de inventario controlado:', inventoryError);
        await persistInventoryError({
          pedidoActivoId,
          itemId,
          error: failure.message,
          code: failure.code,
        });
        return { success: false, error: failure.message, code: failure.code, itemId };
      }
    },
    [
      inventoryAutoDiscount,
      getProductoDelStore,
      inventarioV2Repo,
      pedidosRepo,
      persistInventoryError,
    ]
  );

  return {
    descontarStockDeItem,
    inventoryAutoDiscount,
  };
}

export const useInventoryDeduction = useDescontarInventario;
export { classifyInventoryError };
export type { InventoryDeductionResult, InventoryErrorCode };
