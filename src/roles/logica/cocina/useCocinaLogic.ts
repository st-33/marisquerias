/**
 * 🧠 CEREBRO - LÓGICA DE COCINA (KDS)
 * Hook maestro que gestiona toda la lógica del módulo de cocina
 *
 * SEPARACIÓN SAGRADA:
 * - Este hook NUNCA renderiza UI
 * - Solo maneja estado, suscripciones y acciones
 * - Usa repositorios para acceder a datos
 */

import type { Database } from 'firebase/database';
import { ref, update } from 'firebase/database';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PedidosRepository, type PedidoItem } from '../../../sistema/persistencia';
import { InventoryV2Repository } from '../../../sistema/persistencia/inventory.v2.repo';
import { useAppStateSync } from '../../../plataforma/base/hooks';
import { canonicalizeString } from '../../../plataforma/core/domain/itemCanonical';
import { normalizePedido } from '../../../plataforma/core/domain/normalizers';
import { createModuleLogger } from '../../../sistema/monitoreo';
// 🔌 DOGMA V2: Leer datos del store centralizado
import { useCategorias, usePedidos, useProductos, useStore } from '../../../sistema/store';
import { SincronizadorCocina } from '../../../capacidades/cocina/SincronizadorCocina';
import { useCocinaAudio } from './useCocinaAudio';

// Logger del módulo
const logger = createModuleLogger('COCINA');

// ⚡ DEBOUNCE SIMPLE (optimización de latencia)
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}
// Helper para transformar los datos de pedidos en órdenes de cocina
/**
 * Convierte la estructura cruda de pedidos de Firebase en un array de `OrdenCocina`.
 * Aplica deduplicación, agrupación, cálculo de métricas y marca de urgencia.
 */
function transformPedidosData(
  pedidosData: Record<string, any>,
  urgentThresholdMinutes: number,
  now: number
): OrdenCocina[] {
  const urgentThreshold = urgentThresholdMinutes * 60 * 1000;

  const ordenesActivas = Object.entries(pedidosData)
    .filter(([_, pedido]) => {
      const estatus = pedido.estatus?.toLowerCase() || '';
      if (estatus !== 'enviado_cocina' && estatus !== 'en_preparacion') return false;

      // ⚠️ RELAXED FILTER: Show all active orders regardless of date
      // This fixes "Ghost Orders" where a table was left open for days.
      /*
      const createdAt = pedido.createdAt || 0;
      if (createdAt < hoy) {
        console.log(`[COCINA] ⚠️ Ignorando pedido viejo del ${new Date(createdAt).toLocaleDateString()}`);
        return false;
      }
      */

      return true;
    })
    .map(([id, pedido]): OrdenCocina => {
      const items = pedido.items || {};
      let itemsArray: ItemCocina[] = Object.entries(items).map(([itemId, item]) => {
        // 🔥 FIX: Estado por defecto es 'nuevo' (listo para comenzar)
        const estado = (item as any).estado || 'nuevo';
        // 🔥 DEBUG: Ver qué estado llega cada item
        console.log(`[COCINA] Item ${(item as any).nombre}: estado=${estado}`);
        return {
          id: itemId,
          nombre: (item as any).nombre || '',
          productoId: (item as any).productoId ?? (item as any).productId,
          cantidad: (item as any).cantidad || 1,
          precio: (item as any).precio || 0,
          variantes: (item as any).variantes,
          variantLabels: (item as any).variantLabels,
          notas: (item as any).notas,
          estado,
          prepMin: (item as any).prepMin,
          startedAt: (item as any).startedAt,
          inventoryDeducted: (item as any).inventoryDeducted,
          draftId: (item as any).draftId,
        };
      });

      // Deduplicación por draftId
      const seenDraftIds = new Map<string, ItemCocina>();
      const estadoPrioridad: Record<string, number> = {
        listo: 3,
        en_preparacion: 2,
        en_cocina: 1,
        nuevo: 0,
      };
      itemsArray.forEach((item) => {
        if (item.draftId) {
          const existing = seenDraftIds.get(item.draftId);
          if (!existing) {
            seenDraftIds.set(item.draftId, item);
          } else {
            const existingPrio = estadoPrioridad[existing.estado] ?? 0;
            const currentPrio = estadoPrioridad[item.estado] ?? 0;
            if (currentPrio > existingPrio) {
              seenDraftIds.set(item.draftId, item);
            }
          }
        }
      });
      itemsArray = itemsArray.filter(
        (item) => !item.draftId || seenDraftIds.get(item.draftId) === item
      );

      // Agrupación de items idénticos
      // ⚡ OPCIÓN A: NO agrupar items con diferentes estados (más claridad visual)
      const grupos = new Map<string, ItemCocina & { idsAgrupados: string[] }>();
      itemsArray.forEach((item) => {
        if (item.estado === 'entregado') return;
        const variantesKey = item.variantes
          ? JSON.stringify(Object.entries(item.variantes).sort())
          : '';
        // 🔑 Incluir estado en el groupKey para NO agrupar items con diferentes estados
        const groupKey = `${item.productoId || item.nombre}|${variantesKey}|${item.notas || ''}|${
          item.estado
        }`;
        const existing = grupos.get(groupKey);
        if (existing) {
          existing.cantidad = (existing.cantidad || 1) + (item.cantidad || 1);
          existing.idsAgrupados.push(item.id);
          const prioridad = ['listo', 'en_preparacion', 'en_cocina', 'nuevo'];
          const curIdx = prioridad.indexOf(item.estado);
          const existIdx = prioridad.indexOf(existing.estado);
          if (curIdx < existIdx) existing.estado = item.estado;
          if (item.startedAt && (!existing.startedAt || item.startedAt < existing.startedAt)) {
            existing.startedAt = item.startedAt;
          }
        } else {
          grupos.set(groupKey, { ...item, idsAgrupados: [item.id] });
        }
      });
      const itemsAgrupados: ItemCocina[] = [];
      grupos.forEach((it) => itemsAgrupados.push(it as ItemCocina));

      const itemsTotal = itemsAgrupados.length;
      const itemsPendientes = itemsAgrupados.filter(
        (it) => it.estado === 'nuevo' || it.estado === 'en_cocina' || it.estado === 'en_preparacion'
      ).length;
      const itemsListos = itemsAgrupados.filter((it) => it.estado === 'listo').length;

      const baseTime = pedido.sentToKitchenAt || pedido.createdAt || now;
      const tiempoTranscurrido = Math.floor((now - baseTime) / 1000);
      const esUrgente = now - baseTime >= urgentThreshold;

      return {
        id,
        tipo: pedido.tipo || 'mesa',
        mesaId: pedido.mesaId,
        estatus: pedido.estatus || '',
        items: itemsAgrupados,
        itemsTotal,
        itemsPendientes,
        itemsListos,
        tiempoTranscurrido,
        esUrgente,
        createdAt: pedido.createdAt || now,
        sentToKitchenAt: pedido.sentToKitchenAt,
      };
    });

  // Ordenar: urgentes primero, luego por antigüedad
  ordenesActivas.sort((a, b) => {
    if (a.esUrgente !== b.esUrgente) return a.esUrgente ? -1 : 1;
    const timeA = a.sentToKitchenAt || a.createdAt;
    const timeB = b.sentToKitchenAt || b.createdAt;
    return timeA - timeB;
  });

  return ordenesActivas;
}

export type ItemCocina = PedidoItem & {
  cantidad: number;
  nombre: string;
  productoId?: string; // ID del producto para obtener la receta
  variantes?: Record<string, string[]>;
  variantLabels?: string[]; // 🔥 Etiquetas legibles de variantes
  notas?: string;
  prepMin?: number; // Tiempo límite de preparación en minutos
  startedAt?: number; // Timestamp cuando se empezó a preparar
  draftId?: string; // ID del draft original para deduplicación
  idsAgrupados?: string[]; // 🔥 FIX: IDs agrupados para batch operations
};

export type OrdenCocina = {
  id: string;
  tipo: 'mesa' | 'para_llevar' | 'delivery';
  mesaId?: string;
  estatus: string;
  items: ItemCocina[];
  itemsTotal: number;
  itemsPendientes: number;
  itemsListos: number;
  tiempoTranscurrido: number; // en segundos
  esUrgente: boolean;
  createdAt: number;
  sentToKitchenAt?: number;
};

export type EstadisticasCocina = {
  total: number;
  urgentes: number;
  itemsPendientes: number;
  itemsListos: number;
};

type UseCocinaLogicProps = {
  db: Database;
  tenantPath: string;
  urgentThresholdMinutes?: number; // Umbral para marcar como urgente
  autoDescuentoInventario?: boolean; // Si TRUE, descuenta inventario automáticamente
};

export function useCocinaLogic({
  db,
  tenantPath,
  urgentThresholdMinutes = 15,
  autoDescuentoInventario = false,
}: UseCocinaLogicProps) {
  // Estado
  const [loading, setLoading] = useState(true);
  const [ordenes, setOrdenes] = useState<OrdenCocina[]>([]);

  // 🔄 SINCRONIZACIÓN CON APP STATE (Socket Sordo Fix)
  useAppStateSync(() => {
    logger.info('App volvió a foreground');
  });

  // Crear repositorios
  const pedidosRepo = useMemo(() => new PedidosRepository(db, tenantPath), [db, tenantPath]);

  const inventarioV2Repo = useMemo(
    () => new InventoryV2Repository(db, tenantPath),
    [db, tenantPath]
  );

  const inventarioV2AreaRestauranteRef = useRef<string | null>(null);
  const inventarioV2CatalogMapRef = useRef<Record<string, string> | null>(null);

  // 🔌 DOGMA V2: Leer categorías y productos del store (NO crear listeners)
  const categoriasDelStore = useCategorias();
  const productosDelStore = useProductos();

  // Funciones para obtener datos del store (síncronas, sin await)
  const getCategoriaDelStore = useCallback(
    (categoriaId: string) => {
      return categoriasDelStore[categoriaId] || null;
    },
    [categoriasDelStore]
  );

  const getProductoDelStore = useCallback(
    (productoId: string) => {
      return productosDelStore[productoId] || null;
    },
    [productosDelStore]
  );

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

  // 🔌 DOGMA V2: Leer pedidos del store centralizado (NO crear listener)
  const pedidosDelStore = usePedidos();
  const pedidosRef = useRef(pedidosDelStore);

  // Actualizar ref sin trigger re-render
  useEffect(() => {
    pedidosRef.current = pedidosDelStore;
  }, [pedidosDelStore]);

  // ⚡ OPTIMIZACIÓN: Debounce de transformación (300ms)
  // Previene recálculos en cada cambio de pedido (mejora -90% re-renders)
  const calculateOrdenesDebounced = useMemo(
    () =>
      debounce((pedidos: Record<string, any>, now: number) => {
        const totalPedidos = Object.keys(pedidos).length;
        if (totalPedidos > 0) {
          logger.debug(`Total de pedidos en store: ${totalPedidos}`);
        }

        // Normalizar datos
        const pedidosNormalizados: Record<string, any> = {};
        Object.entries(pedidos).forEach(([id, pedido]) => {
          const normalized = normalizePedido(pedido);
          if (normalized) {
            pedidosNormalizados[id] = normalized;
          }
        });

        const ordenesActivas = transformPedidosData(
          pedidosNormalizados,
          urgentThresholdMinutes,
          now
        );

        if (ordenesActivas.length > 0) {
          logger.debug(`${ordenesActivas.length} órdenes activas`);
        }

        setOrdenes(ordenesActivas);
        setLoading(false);
      }, 50), // ⚡ OPTIMIZACIÓN: Debounce reducido a 50ms (antes 300ms) para respuesta "instantánea"
    [urgentThresholdMinutes]
  );

  // Trigger cálculo cuando cambia el store
  useEffect(() => {
    calculateOrdenesDebounced(pedidosDelStore, Date.now());
  }, [pedidosDelStore, calculateOrdenesDebounced]);

  // 🔔 EFECTOS DE AUDIO (Encapsulados)
  useCocinaAudio(ordenes);

  // 🧹 AUTO-CORRECCIÓN: Cerrar órdenes completadas
  // Detecta casos donde todos los items están listos pero el estatus no se actualizó
  useEffect(() => {
    ordenes.forEach((orden) => {
      if (orden.itemsTotal > 0 && orden.itemsPendientes === 0 && orden.estatus !== 'listo') {
        logger.info(`🧹 Auto-cerrando orden completada: ${orden.id}`);
        pedidosRepo.actualizar(orden.id, { estatus: 'listo' }).catch((err) => {
          logger.error('Error al auto-cerrar orden', err);
        });
      }
    });
  }, [ordenes, pedidosRepo]);

  // Calcular estadísticas
  const stats: EstadisticasCocina = useMemo(() => {
    return {
      total: ordenes.length,
      urgentes: ordenes.filter((o) => o.esUrgente).length,
      itemsPendientes: ordenes.reduce((sum, o) => sum + o.itemsPendientes, 0),
      itemsListos: ordenes.reduce((sum, o) => sum + o.itemsListos, 0),
    };
  }, [ordenes]);

  // ==================== ACCIONES ====================

  /**
   * Iniciar preparación de item (o grupo de items agrupados)
   * ⚡ OPTIMIZADO: Maneja agrupación automática
   */
  const startItem = async (ordenId: string, itemId: string) => {
    try {
      // 1. Buscar el item para obtener su productoId y cantidad
      const orden = ordenes.find((o) => o.id === ordenId);
      const item = orden?.items.find((it) => it.id === itemId) as any;

      if (!item) {
        throw new Error(`Item ${itemId} no encontrado en orden ${ordenId}`);
      }

      // 🔑 Obtener TODOS los IDs a iniciar (si está agrupado)
      const idsToStart: string[] = item.idsAgrupados || [itemId];
      logger.debug(`Iniciando ${idsToStart.length} item(s): ${item.nombre}`);

      // 2. ⚡ Verificar configuración para saltarPreparando (PRODUCTO > CATEGORÍA)
      // DEFAULT: false (siempre pasa por estado 'en_preparacion')
      let saltarPreparando = false;

      if (item.productoId) {
        const producto = getProductoDelStore(item.productoId);

        // PRIORIDAD 1: Configuración del producto (si existe, prevalece)
        if (producto?.saltarPreparando === true) {
          saltarPreparando = true;
          logger.info(`⚡ PRODUCTO ${item.nombre}: saltarPreparando=TRUE (directo a listo)`);
        }
        // PRIORIDAD 2: Configuración de la categoría (herencia)
        else if (producto?.categoriaId) {
          const categoria = getCategoriaDelStore(producto.categoriaId);
          if (categoria?.saltarPreparando === true) {
            saltarPreparando = true;
            logger.info(
              `⚡ CATEGORÍA ${categoria?.nombre}: saltarPreparando=TRUE (directo a listo)`
            );
          } else {
            logger.info(`🔄 ${item.nombre}: Flujo NORMAL (pasará por en_preparacion)`);
          }
        } else {
          logger.info(`🔄 ${item.nombre}: Sin categoría, flujo NORMAL`);
        }
      } else {
        logger.info(`🔄 ${item.nombre}: Sin productoId, flujo NORMAL`);
      }

      const shouldAutoDeduct =
        autoDescuentoInventario && !item.inventoryDeducted && !!item.productoId;
      const productoId = item.productoId;
      const cantidadBase = Number(item.cantidad || 1);

      // 4. ⚡ Marcar TODOS los items del grupo (BATCH)
      // Si saltarPreparando = true, vamos directo a 'listo', sino a 'en_preparacion'
      const timestamp = Date.now();
      const nuevoEstado = saltarPreparando ? 'listo' : 'en_preparacion';

      logger.info(
        `${saltarPreparando ? '⚡ FAST-TRACK' : '🔄 NORMAL'}: ${item.nombre} -> ${nuevoEstado}`
      );

      await pedidosRepo.actualizarEstadoItemsBatch(
        ordenId,
        idsToStart.map((id) => ({
          itemId: id,
          estado: nuevoEstado,
          startedAt: timestamp,
        }))
      );

      if (shouldAutoDeduct && productoId) {
        (async () => {
          try {
            const producto = getProductoDelStore(productoId);
            const receta = producto?.receta?.ingredientes;

            const preferredAreaId =
              (producto as any)?.inventoryAreaId ?? (producto as any)?.areaId ?? null;

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
                    useStore.getState().sesion.niche === 'venta_crudo'
                      ? 'venta_crudo'
                      : 'restaurante',
                  productoId,
                  preferredAreaId,
                  fallbackAreaId: finalAreaId,
                  actor: 'cocina',
                  reason: 'no_area_assigned',
                  nombre: producto?.nombre || item.nombre,
                });
              }

              const itemsSalidaRaw = await Promise.all(
                Object.entries(receta).map(async ([invKey, qty]) => {
                  const resolvedId = await resolveInventoryV2ItemId(invKey);
                  return {
                    itemId: resolvedId,
                    cantidad: Number(qty || 0) * cantidadBase,
                    razon: `Preparación: ${cantidadBase}x ${producto?.nombre || item.nombre}`,
                  };
                })
              );

              const itemsSalida = itemsSalidaRaw.filter(
                (x) => !!x.itemId && Number(x.cantidad) > 0
              );

              await inventarioV2Repo.registrarSalidaMultiple({
                items: itemsSalida,
                areaId: finalAreaId,
                usuario: 'cocina',
                razon: 'Preparación',
                allowNegative: false,
                metadata: { origen: 'cocina', pedidoId: ordenId, productoId },
              });
            } else {
              await SincronizadorCocina.descontarPorReceta(productoId, cantidadBase);
            }

            const updates: Record<string, any> = {};
            idsToStart.forEach((id) => {
              updates[`${tenantPath}/pedidos/${ordenId}/items/${id}/inventoryDeducted`] = true;
            });
            await update(ref(db), updates);
          } catch (e) {
            try {
              await SincronizadorCocina.descontarPorReceta(productoId, cantidadBase);
              const updates: Record<string, any> = {};
              idsToStart.forEach((id) => {
                updates[`${tenantPath}/pedidos/${ordenId}/items/${id}/inventoryDeducted`] = true;
              });
              await update(ref(db), updates);
            } catch (e2) {
              logger.warn('Auto-descuento inventario falló (no bloqueante)', { e, e2 });
            }
          }
        })();
      }

      // 6. Si es el primer item que se empieza, actualizar estado de la orden
      if (orden && orden.estatus === 'enviado_cocina') {
        await pedidosRepo.actualizar(ordenId, {
          estatus: saltarPreparando ? 'listo' : 'en_preparacion',
        });
      }
    } catch (error) {
      logger.error('Error starting item', error as Error);
      throw error;
    }
  };

  /**
   * Marcar item como listo (o grupo de items agrupados)
   */
  const finishItem = async (ordenId: string, itemId: string) => {
    try {
      // 🔑 Buscar item para obtener IDs agrupados
      const orden = ordenes.find((o) => o.id === ordenId);
      const item = orden?.items.find((it) => it.id === itemId) as any;
      const idsToFinish: string[] = item?.idsAgrupados || [itemId];

      logger.debug(`Finalizando ${idsToFinish.length} item(s)`);

      // ⚡ Marcar TODOS los items del grupo como listos (BATCH)
      await pedidosRepo.actualizarEstadoItemsBatch(
        ordenId,
        idsToFinish.map((id) => ({ itemId: id, estado: 'listo' }))
      );

      // Verificar si todos los items de la orden están listos
      if (orden) {
        const todosListos = orden.items.every((it) => {
          const ids = (it as any).idsAgrupados || [it.id];
          return ids.every((id: string) => idsToFinish.includes(id) || it.estado === 'listo');
        });

        if (todosListos) {
          await pedidosRepo.actualizar(ordenId, { estatus: 'listo' });
        }
      }
    } catch (error) {
      logger.error('Error finishing item', error as Error);
      throw error;
    }
  };

  /**
   * Marcar toda la orden como lista
   * ⚡ OPTIMIZADO: Usa batch update (1 escritura en lugar de N)
   */
  const finishOrder = async (ordenId: string) => {
    try {
      const orden = ordenes.find((o) => o.id === ordenId);
      if (!orden) return;

      // ⚡ BATCH: Recolectar items y descontar inventario si hace falta
      const itemsToFinish = orden.items
        .filter((item) => item.estado !== 'listo')
        .flatMap((item) => {
          const ids = (item as any).idsAgrupados || [item.id];

          // 🆕 Descuento por "Start" bypass
          if (autoDescuentoInventario && !(item as any).inventoryDeducted && item.productoId) {
            // Es async, pero estamos en un flatMap síncrono.
            // Necesitamos hacerlo antes o dispararlo "fire and forget" o cambiar loop.
            // Mejor cambiador loop a for-of.
            // Para simplificar, NO descontamos aquí (demasiado complejo async en flatMap),
            // PERO lanzamos la promesa en background o refactorizamos a bucle async.
          }

          return ids.map((id: string) => ({ itemId: id, estado: 'listo' as const }));
        });

      // ⚡ REFACTOR AYNC LOOP PARA INVENTARIO
      if (autoDescuentoInventario) {
        for (const item of orden.items) {
          if (item.estado !== 'listo' && !(item as any).inventoryDeducted && item.productoId) {
            try {
              const producto = getProductoDelStore(item.productoId);
              const receta = producto?.receta?.ingredientes;

              if (receta && Object.keys(receta).length > 0) {
                let areaId = inventarioV2AreaRestauranteRef.current;
                if (!areaId) {
                  const areas = await inventarioV2Repo.obtenerAreas();
                  areaId =
                    Object.entries(areas).find(([, a]) => a?.hubId === 'restaurante')?.[0] || null;
                  inventarioV2AreaRestauranteRef.current = areaId;
                }

                if (!areaId) {
                  throw new Error(
                    'No hay área de inventario V2 configurada para hubId=restaurante'
                  );
                }

                const cantidadBase = Number(item.cantidad || 1);
                const itemsSalida = Object.entries(receta)
                  .map(([invItemId, qty]) => ({
                    itemId: invItemId,
                    cantidad: Number(qty || 0) * cantidadBase,
                    razon: `Preparación: ${cantidadBase}x ${producto?.nombre || item.nombre}`,
                  }))
                  .filter((x) => !!x.itemId && Number(x.cantidad) > 0);

                await inventarioV2Repo.registrarSalidaMultiple({
                  items: itemsSalida,
                  areaId,
                  usuario: 'cocina',
                  razon: 'Preparación',
                  allowNegative: false,
                  metadata: {
                    origen: 'cocina',
                    pedidoId: ordenId,
                    productoId: item.productoId,
                  },
                });

                if (itemsSalida.length > 0) {
                  const ids = (item as any).idsAgrupados || [item.id];
                  const updates: Record<string, any> = {};
                  ids.forEach((id: string) => {
                    updates[`${tenantPath}/pedidos/${ordenId}/items/${id}/inventoryDeducted`] =
                      true;
                  });
                  await update(ref(db), updates);
                }
              } else {
                const res = await SincronizadorCocina.descontarPorReceta(
                  item.productoId,
                  item.cantidad || 1
                );
                if (res.success && res.descontados && res.descontados.length > 0) {
                  const ids = (item as any).idsAgrupados || [item.id];
                  const updates: Record<string, any> = {};
                  ids.forEach((id: string) => {
                    updates[`${tenantPath}/pedidos/${ordenId}/items/${id}/inventoryDeducted`] =
                      true;
                  });
                  await update(ref(db), updates);
                }
              }
            } catch (e) {
              logger.error('Error auto-deducting in finishOrder', e);
            }
          }
        }
      }

      // ⚡ Una sola escritura en lugar de N (Estado)
      if (itemsToFinish.length > 0) {
        await pedidosRepo.actualizarEstadoItemsBatch(ordenId, itemsToFinish);
      }

      // Marcar orden como lista
      await pedidosRepo.actualizar(ordenId, { estatus: 'listo' });
    } catch (error) {
      logger.error('Error finishing order', error as Error);
      throw error;
    }
  };

  return {
    // Estado
    orders: ordenes,
    stats,
    loading,

    // Acciones
    actions: {
      startItem,
      finishItem,
      finishOrder,
    },
  };
}

// Tipos ya están exportados arriba, no necesitan re-export
