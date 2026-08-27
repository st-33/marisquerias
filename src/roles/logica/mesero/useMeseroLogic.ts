/**
 * 🧠 CEREBRO - LÓGICA PRINCIPAL DEL MESERO (ORQUESTRADOR HÍBRIDO)
 *
 * Orquesta la interacción con Firebase (mesas y pedidos) y expone un API única
 * para las vistas del rol Mesera. Esta versión está modularizada en sub-hooks.
 *
 * SEPARACIÓN SAGRADA: Lógica desacoplada pura.
 */

import { Database } from 'firebase/database';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MesasRepository, PedidosRepository } from '../../../sistema/persistencia';
import { InventoryV2Repository } from '../../../sistema/persistencia/inventory.v2.repo';
import { useAppStateSync } from '../../../sistema/ciclo_de_vida/useAppStateSync';
import {
  useItemsPedido,
  usePedido,
  usePedidos,
  useProductos,
  useStore,
} from '../../../sistema/store';
import { createLogger } from '../../../sistema/utilidades/logger';

import { useGestionarMesas } from './gestionarMesas';
import { useDescontarInventario } from './descontarInventario';
import { IntegracionLogisticaPedido } from '../../../capacidades/logistica';
import { logisticaHabilitada as evaluarLogisticaHabilitada } from '../../../logica/dominio/logistica';
import { useGestionarImpresion } from './gestionarImpresion';
import { useProcesarPedido } from './procesarPedido';
import { useSharedDrafts } from './useSharedDrafts';

const log = createLogger('useMeseroLogic');

export type PendingItem = {
  id?: string;
  name: string;
  price: number;
  qty: number;
  productId?: string;
  variants?: Record<string, string[]>;
  basePrice?: number;
  variantDelta?: number;
  prepMin?: number;
};

export type OrderItem = {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  estado: string;
  variantes?: Record<string, string[]>;
  variantLabels?: string[];
  inventoryDeducted?: boolean;
  inventoryError?: string | null;
  inventoryErrorCode?: string | null;
  inventoryErrorAt?: number | null;
  productId?: string;
};

type UseMeseroLogicProps = {
  db: Database;
  tenantPath: string;
  accessCode: string;
  tenantId: string;
  onPrintBill?: (mesaId: string) => void;
  onFreeMesa?: (mesaId: string) => void;
  ensureConnection?: () => boolean | Promise<boolean>;
};

export function useMeseroLogic({
  db,
  tenantPath,
  accessCode,
  tenantId,
  onPrintBill,
  onFreeMesa,
  ensureConnection,
}: UseMeseroLogicProps) {
  // Repositorios especializados
  const pedidosRepo = useMemo(() => new PedidosRepository(db, tenantPath), [db, tenantPath]);
  const mesasRepo = useMemo(() => new MesasRepository(db, tenantPath), [db, tenantPath]);
  const inventarioV2Repo = useMemo(
    () => new InventoryV2Repository(db, tenantPath),
    [db, tenantPath]
  );
  const repartoUrl = useStore((state) => state.dataSources.repartoUrl);
  const logisticaHabilitada = useStore((state) =>
    evaluarLogisticaHabilitada(state.negocio.features)
  );

  // 🔄 SINCRONIZACIÓN CON APP STATE
  const [, setForceRefresh] = useState(0);
  useAppStateSync(() => {
    setForceRefresh((prev) => prev + 1);
  });

  // 1. Hook de Gestión de Mesas
  const {
    tables,
    selectedTable,
    setSelectedTable,
    loading,
    tablesRef,
    selectTable,
    occupyTable,
    freeTable,
  } = useGestionarMesas({ mesasRepo });

  // 2. Drafts compartidos
  const {
    items: sharedDraftItems,
    loading: draftsLoading,
    addItem: addDraftItem,
    removeItem: removeDraftItem,
    incrementItem: incrementDraftItem,
    decrementItem: decrementDraftItem,
    clear: clearDrafts,
    isOnline,
  } = useSharedDrafts({
    db,
    tenantPath,
    mesaId: selectedTable,
    tenantId,
  });

  const activeSubpedidoId = 'default';
  const activePendingItems = useMemo(() => sharedDraftItems, [sharedDraftItems]);
  const activePendingItemsRef = useRef(activePendingItems);
  useEffect(() => {
    activePendingItemsRef.current = activePendingItems;
  }, [activePendingItems]);

  const pendingItems = useMemo(
    () => ({
      [activeSubpedidoId]: activePendingItems,
    }),
    [activeSubpedidoId, activePendingItems]
  );

  const clearPendingItems = useCallback(
    async (subpedidoId?: string) => {
      await clearDrafts();
    },
    [clearDrafts]
  );

  const addPendingItem = useCallback(
    async (item: PendingItem, subpedidoId: string = 'default') => {
      if (!selectedTable) {
        log.warn('❌ No se puede agregar item sin mesa seleccionada');
        return;
      }
      await addDraftItem(item);
    },
    [selectedTable, addDraftItem]
  );

  const removePendingItem = useCallback(
    async (index: number, subpedidoId: string = 'default') => {
      await removeDraftItem(index);
    },
    [removeDraftItem]
  );

  const incrementPendingItem = useCallback(
    async (index: number, subpedidoId: string = 'default') => {
      await incrementDraftItem(index);
    },
    [incrementDraftItem]
  );

  const decrementPendingItem = useCallback(
    async (index: number, subpedidoId: string = 'default') => {
      await decrementDraftItem(index);
    },
    [decrementDraftItem]
  );

  // 3. Hook de Procesamiento de Pedido
  const { isSending, lastError, puentePedidoId, sendOrder, sendOrderWithValidation } =
    useProcesarPedido({
      selectedTable,
      activePendingItemsRef,
      clearPendingItems,
      addDraftItem,
      tenantId,
      pedidosRepo,
      mesasRepo,
    });

  // Store y Selectores
  const pedidosDelStore = usePedidos();
  const productosDelStore = useProductos();
  const decoratedTables = useMemo(() => {
    return tables.map((table) => {
      // 1. Obtener pedido activo de la mesa
      let activePedido: any = null;
      if (table.pedidoActivoId) {
        activePedido = pedidosDelStore[table.pedidoActivoId];
      } else {
        const hoy = new Date().setHours(0, 0, 0, 0);
        const pedidoEncontrado = Object.values(pedidosDelStore || {}).find((p: any) => {
          return p && p.mesaId === table.id && p.cerrado !== true && (p.createdAt || 0) >= hoy;
        });
        if (pedidoEncontrado) {
          activePedido = pedidoEncontrado;
        }
      }

      // 2. Obtener items en curso del pedido activo
      const items = activePedido ? Object.values(activePedido.items || {}) : [];
      const liveCount = items.filter((it: any) => (it.estado || 'nuevo') !== 'entregado').length;
      const hasReady = items.some((it: any) => (it.estado || 'nuevo') === 'listo');

      // 3. Obtener drafts de la mesa
      // Los borradores sólo se consideran para la mesa activa. La fuente de verdad
      // está acotada por tenantPath + mesaId en useSharedDrafts; no leer el slice
      // global keyed únicamente por mesa evita arrastres al cambiar de tenant.
      const hasPending = table.id === selectedTable && activePendingItems.length > 0;

      return {
        ...table,
        liveCount,
        hasReady,
        hasPending,
      };
    });
  }, [tables, pedidosDelStore, selectedTable, activePendingItems]);

  const getProductoDelStore = useCallback(
    (productoId: string) => productosDelStore[productoId] || null,
    [productosDelStore]
  );

  const pedidoActivoId = useMemo(() => {
    if (!selectedTable) return null;

    const table = tables.find((t) => t.id === selectedTable);
    if (table?.pedidoActivoId) return table.pedidoActivoId;

    const hoy = new Date().setHours(0, 0, 0, 0);
    const pedidosDeMesa = Object.entries(pedidosDelStore || {}).find(([_, p]: [string, any]) => {
      if (!p) return false;
      if (p.mesaId !== selectedTable) return false;
      if (p.cerrado === true) return false;
      const createdAt = p.createdAt || 0;
      if (createdAt < hoy) return false;
      return true;
    });
    if (pedidosDeMesa) {
      return pedidosDeMesa[0];
    }

    return puentePedidoId || null;
  }, [tables, selectedTable, puentePedidoId, pedidosDelStore]);

  const itemsDelPedido = useItemsPedido(pedidoActivoId);
  const pedidoActivo = usePedido(pedidoActivoId);
  const integracionLogistica = useMemo(
    () => (logisticaHabilitada && repartoUrl ? new IntegracionLogisticaPedido(pedidosRepo) : null),
    [logisticaHabilitada, pedidosRepo, repartoUrl]
  );
  const [solicitandoEntrega, setSolicitandoEntrega] = useState(false);

  const solicitarEntrega = useCallback(async () => {
    if (!pedidoActivo) {
      return { success: false, estado: 'fallida' as const, error: 'No hay pedido activo' };
    }
    if (!logisticaHabilitada) {
      return {
        success: false,
        estado: 'fallida' as const,
        error: 'La capacidad logística está desactivada para este negocio.',
      };
    }
    if (!integracionLogistica) {
      return {
        success: false,
        estado: 'fallida' as const,
        error: 'No existe una fuente de reparto configurada.',
      };
    }

    setSolicitandoEntrega(true);
    try {
      return await integracionLogistica.solicitarEntrega(pedidoActivo as any, {
        tenantId,
        tenantPath,
      });
    } finally {
      setSolicitandoEntrega(false);
    }
  }, [integracionLogistica, logisticaHabilitada, pedidoActivo, tenantId, tenantPath]);

  const liveItems = useMemo((): OrderItem[] => {
    if (!pedidoActivoId) return [];
    const entradas = Object.entries(itemsDelPedido);
    if (entradas.length === 0) return [];

    return entradas.map(([itemId, detalleItem]) => ({
      id: itemId,
      nombre: detalleItem.nombre,
      precio: detalleItem.precio,
      cantidad: detalleItem.cantidad,
      estado: detalleItem.estado || 'nuevo',
      variantes: detalleItem.variantes,
      variantLabels: detalleItem.variantLabels,
      inventoryDeducted: detalleItem.inventoryDeducted,
      inventoryError: detalleItem.inventoryError,
      inventoryErrorCode: detalleItem.inventoryErrorCode,
      inventoryErrorAt: detalleItem.inventoryErrorAt,
      productId: detalleItem.productId,
    }));
  }, [pedidoActivoId, itemsDelPedido]);

  const liveItemsRef = useRef(liveItems);
  useEffect(() => {
    liveItemsRef.current = liveItems;
  }, [liveItems]);

  const totalPending = useMemo(() => {
    return Object.values(pendingItems).reduce((sum, items) => {
      return sum + items.reduce((itemSum, item) => itemSum + item.price * item.qty, 0);
    }, 0);
  }, [pendingItems]);

  const totalPendingItems = useMemo(() => {
    return Object.values(pendingItems).reduce((sum, items) => sum + items.length, 0);
  }, [pendingItems]);

  const totalOrder = useMemo(() => {
    const liveTot = liveItems.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    return totalPending + liveTot;
  }, [totalPending, liveItems]);

  // 4. Hook de Gestión de Impresión
  const {
    hasPrinted,
    isPrinting,
    printPolicies,
    printBill,
    printBillWithConnectionCheck,
    requestBill,
  } = useGestionarImpresion({
    db,
    tenantPath,
    selectedTable,
    tablesRef,
    liveItems,
    totalOrder,
    pedidosRepo,
    mesasRepo,
    onPrintBill,
    pedidoActivo,
  });

  // 5. Hook de Gestión de Inventario
  const { descontarStockDeItem, inventoryAutoDiscount } = useDescontarInventario({
    inventarioV2Repo,
    pedidosRepo,
    getProductoDelStore,
  });

  const markAsDelivered = useCallback(
    async (itemId: string) => {
      if (!selectedTable) return { success: false, error: 'No hay mesa seleccionada' };

      try {
        const table = tablesRef.current.find((t) => t.id === selectedTable);
        if (!table?.pedidoActivoId) {
          return { success: false, error: 'No hay pedido activo' };
        }

        const item = liveItemsRef.current.find((it) => it.id === itemId);

        if (inventoryAutoDiscount && !item) {
          return { success: false, error: 'No se encontró el ítem para validar inventario' };
        }

        if (inventoryAutoDiscount && item && !item.inventoryDeducted) {
          const inventoryResult = await descontarStockDeItem({
            item,
            pedidoActivoId: table.pedidoActivoId!,
            itemId,
          });

          if (!inventoryResult.success) {
            return {
              success: false,
              error: inventoryResult.error,
              inventoryCode: inventoryResult.code,
            };
          }
        }

        await pedidosRepo.actualizarEstadoItem(table.pedidoActivoId, itemId, 'entregado');
        return { success: true };
      } catch (error) {
        log.error('Error al marcar como entregado:', error);
        return { success: false, error: 'Error al marcar como entregado' };
      }
    },
    [selectedTable, pedidosRepo, inventoryAutoDiscount, descontarStockDeItem, tablesRef]
  );

  const markAsPaid = useCallback(async () => {
    if (!selectedTable) return { success: false, error: 'No hay mesa seleccionada' };

    try {
      const table = tablesRef.current.find((t) => t.id === selectedTable);
      if (!table?.pedidoActivoId) {
        return { success: false, error: 'No hay pedido activo' };
      }

      await pedidosRepo.cerrar(table.pedidoActivoId);
      await mesasRepo.liberar(selectedTable);
      onFreeMesa?.(selectedTable);
      setSelectedTable(null);

      return { success: true };
    } catch (error) {
      log.error('Error al marcar como pagado:', error);
      return { success: false, error: 'Error al marcar como pagado' };
    }
  }, [selectedTable, pedidosRepo, mesasRepo, onFreeMesa, setSelectedTable, tablesRef]);

  const liveInProgress = useMemo(
    () => liveItems.filter((item) => item.estado !== 'entregado'),
    [liveItems]
  );
  const readyItems = useMemo(
    () => liveItems.filter((item) => item.estado === 'listo'),
    [liveItems]
  );

  const canSend = activePendingItems.length > 0 && !isSending;
  const hasReadyItems = readyItems.length > 0;
  const hasUndelivered = liveInProgress.length > 0;

  const allItemsDelivered = useMemo(() => {
    return liveItems.length > 0 && liveItems.every((item) => item.estado === 'entregado');
  }, [liveItems]);

  const canMarkPaid = hasPrinted && allItemsDelivered;
  const combinedLoading = useMemo(() => loading || draftsLoading, [loading, draftsLoading]);

  return {
    tables: decoratedTables,
    selectedTable,
    selectedTableData: decoratedTables.find((t) => t.id === selectedTable) || null,
    pedidoActivo,
    logisticaHabilitada,
    solicitandoEntrega,
    solicitarEntrega,
    pendingItems,
    activePendingItems,
    liveItems,
    liveInProgress,
    readyItems,
    loading: combinedLoading,
    cartsLoading: draftsLoading,
    isSending,
    isPrinting,
    isOnline,
    lastError,
    canSend,
    hasReadyItems,
    hasUndelivered,
    allItemsDelivered,
    hasPrinted,
    canMarkPaid,
    activeSubpedidoId,
    printPolicies,
    permitirMeseraImprimirCuenta: printPolicies.permitirMeseraImprimirCuenta !== false,

    totalPending,
    totalPendingItems,
    totalOrder,

    selectTable,
    addPendingItem,
    removePendingItem,
    incrementPendingItem,
    decrementPendingItem,
    clearPendingItems,
    sendOrder,
    sendOrderWithValidation,
    requestBill,
    printBill,
    canReprint: hasPrinted && allItemsDelivered,
    printBillWithConnectionCheck,
    markAsPaid,
    occupyTable,
    markAsDelivered,
    freeTable,
  };
}
