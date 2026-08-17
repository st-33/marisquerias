/**
 * 📦 CEREBRO - DESCUENTO DE INVENTARIO
 * Módulo encargado de descontar stock de los ingredientes según la receta del plato
 * SEPARACIÓN SAGRADA: Solo lógica pura de negocio
 */

import { useRef, useCallback } from 'react';
import { InventoryV2Repository } from '../../../base/_persistencia/inventory.v2.repo';
import { PedidosRepository } from '../../../base/_persistencia/pedidos.repo';
import { canonicalizeString } from '../../../core/domain/itemCanonical';
import { useStore } from '../../../core/store';
import { SincronizadorCocina } from '../../../dominios/alimentos_y_bebidas/sincronizacion/SincronizadorCocina';
import { createLogger } from '../../../core/utils/logger';
import {
  classifyInventoryError,
  type InventoryDeductionResult,
  type InventoryErrorCode,
} from './inventoryErrors';

const log = createLogger('descontarInventario');

export { classifyInventoryError } from './inventoryErrors';

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
  const inventarioV2AreaRestauranteRef = useRef<string | null>(null);
  const inventarioV2CatalogMapRef = useRef<Record<string, string> | null>(null);
  const inventoryAutoDiscount =
    useStore((s: any) => s.negocio.features?.inventory_auto_discount?.enabled) === true;

  const resolveInventoryV2ItemId = useCallback(
    async (rawKey: string): Promise<string> => {
      const key = String(rawKey || '').trim();
      if (!key) return '';

      if (!inventarioV2CatalogMapRef.current) {
        const catalog = await inventarioV2Repo.obtenerCatalogo();
        const map: Record<string, string> = {};
        for (const [id, it] of Object.entries(catalog || {})) {
          const byId = String(id);
          if (byId) map[byId] = byId;
          const byName = canonicalizeString((it as any)?.nombre);
          if (byName && !map[byName]) map[byName] = byId;
        }
        inventarioV2CatalogMapRef.current = map;
      }

      const map = inventarioV2CatalogMapRef.current || {};
      return map[key] || map[canonicalizeString(key)] || key;
    },
    [inventarioV2Repo]
  );

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
        log.info(`📦 Descontando inventario: ${item.nombre}`);

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

        const producto = getProductoDelStore(productoId);
        const receta = producto?.receta?.ingredientes;
        const preferredAreaId = producto?.inventoryAreaId ?? producto?.areaId ?? null;

        // Preferir Inventario V2 si hay receta (ingredientes)
        if (receta && Object.keys(receta).length > 0) {
          let areaId = inventarioV2AreaRestauranteRef.current;
          if (!areaId) {
            const areas = await inventarioV2Repo.obtenerAreas();
            const entries = Object.entries(areas || {}).filter(([, a]) => {
              const hub = (a as any)?.hubId;
              return hub === 'restaurante' || hub === undefined;
            });
            const def = entries.find(([, a]) => (a as any)?.metadata?.isDefault === true);
            areaId = def?.[0] || entries?.[0]?.[0] || null;
            inventarioV2AreaRestauranteRef.current = areaId;
          }

          if (!areaId) {
            throw new Error('No hay área de inventario V2 configurada para hubId=restaurante');
          }

          const finalAreaId = preferredAreaId || areaId;
          if (!preferredAreaId) {
            await inventarioV2Repo.registrarMissingAreaAssignment({
              hubId:
                (useStore.getState() as any).sesion.niche === 'venta_crudo'
                  ? 'venta_crudo'
                  : 'restaurante',
              productoId,
              preferredAreaId,
              fallbackAreaId: finalAreaId,
              actor: 'mesero',
              reason: 'no_area_assigned',
              nombre: producto?.nombre || item.nombre,
            });
          }

          const cantidadBase = Number(item.cantidad || 1);
          const itemsSalidaRaw = await Promise.all(
            Object.entries(receta).map(async ([invKey, qty]) => {
              const resolvedId = await resolveInventoryV2ItemId(invKey);
              return {
                itemId: resolvedId,
                cantidad: Number(qty || 0) * cantidadBase,
                razon: `Entrega: ${cantidadBase}x ${producto?.nombre || item.nombre}`,
              };
            })
          );
          const itemsSalida = itemsSalidaRaw.filter((x) => !!x.itemId && Number(x.cantidad) > 0);

          if (itemsSalida.length === 0) {
            throw new Error(
              `No hay ingredientes válidos para descontar del producto ${productoId}`
            );
          }

          await inventarioV2Repo.registrarSalidaMultiple({
            items: itemsSalida,
            areaId: finalAreaId,
            usuario: 'mesero',
            razon: 'Entrega',
            allowNegative: false,
            metadata: {
              origen: 'mesero',
              pedidoId: pedidoActivoId,
              productoId,
            },
          });

          await pedidosRepo.actualizarItem(pedidoActivoId, itemId, {
            inventoryDeducted: true,
            inventoryError: null,
            inventoryErrorCode: null,
            inventoryErrorAt: null,
          });
          return { success: true };
        }

        // Fallback Inventario V1 (legacy)
        const resultado = await SincronizadorCocina.descontarPorReceta(
          productoId,
          item.cantidad || 1
        );
        if (resultado.success) {
          await pedidosRepo.actualizarItem(pedidoActivoId, itemId, {
            inventoryDeducted: true,
            inventoryError: null,
            inventoryErrorCode: null,
            inventoryErrorAt: null,
          });
          return { success: true };
        }

        const failure = classifyInventoryError(resultado.error || 'Error al descontar inventario');
        await persistInventoryError({
          pedidoActivoId,
          itemId,
          error: failure.message,
          code: failure.code,
        });
        return { success: false, error: failure.message, code: failure.code, itemId };
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
      resolveInventoryV2ItemId,
    ]
  );

  return {
    descontarStockDeItem,
    inventoryAutoDiscount,
  };
}
