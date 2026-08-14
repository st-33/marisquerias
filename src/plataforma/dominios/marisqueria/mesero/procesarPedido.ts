/**
 * 🚀 CEREBRO - PROCESAMIENTO DE PEDIDOS
 * Módulo encargado de gestionar el envío de pedidos a cocina
 * SEPARACIÓN SAGRADA: Solo lógica pura de negocio
 */

import { useState, useCallback } from 'react';
import { PedidosRepository, MesasRepository } from '../../../base/_persistencia';
import { PendingItem } from './useMeseroLogic';
import { createLogger } from '../../../core/utils/logger';

const log = createLogger('procesarPedido');

const LOCK_TIMEOUT_MS = 15000;

type MesaSnapshot = {
  estado?: string;
  pedidoActivoId?: string | null;
  updatedAt?: number;
  _sendOrderLock?: {
    owner?: string;
    timestamp?: number;
  } | null;
};

type ProcesarPedidoProps = {
  selectedTable: string | null;
  activePendingItemsRef: React.MutableRefObject<PendingItem[]>;
  clearPendingItems: (subpedidoId?: string) => Promise<void>;
  addDraftItem: (item: PendingItem) => Promise<any>;
  tenantId: string;
  pedidosRepo: PedidosRepository;
  mesasRepo: MesasRepository;
};

const buildPedidoItemPayload = (item: PendingItem) => {
  const payload: any = {
    nombre: item.name,
    precio: item.price,
    cantidad: item.qty,
    estado: 'nuevo' as const,
    productId: item.productId || null,
    prepMin: item.prepMin || null,
    impreso: true,
  };

  if (item.id) {
    payload.draftId = item.id;
  }

  if (item.variants !== undefined) {
    payload.variantes = item.variants;
  }

  if ((item as any).variantLabels !== undefined) {
    payload.variantLabels = (item as any).variantLabels;
  }

  return payload;
};

export function useProcesarPedido({
  selectedTable,
  activePendingItemsRef,
  clearPendingItems,
  addDraftItem,
  tenantId,
  pedidosRepo,
  mesasRepo,
}: ProcesarPedidoProps) {
  const [isSending, setIsSending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [puentePedidoId, setPuentePedidoId] = useState<string | null>(null);
  const [prevTable, setPrevTable] = useState(selectedTable);

  if (selectedTable !== prevTable) {
    setPrevTable(selectedTable);
    setPuentePedidoId(null);
  }

  const sendOrder = useCallback(
    async (subpedidoId: string = 'default') => {
      if (!selectedTable) {
        log.warn('❌ sendOrder sin mesa seleccionada', { subpedidoId });
        return { success: false, error: 'No hay mesa seleccionada' };
      }

      const items = activePendingItemsRef.current;
      const itemsParaEnviar = items.filter((item: PendingItem) => Number(item.qty) > 0);

      if (itemsParaEnviar.length === 0) {
        return { success: false, error: 'No hay items para enviar a cocina' };
      }

      const previousDrafts = [...items];
      setIsSending(true);

      // Optimistic draft clean
      await clearPendingItems(subpedidoId);

      const sessionId = `${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const transactionResult = await mesasRepo.intentarBloquearMesaPedido(
        selectedTable,
        sessionId,
        LOCK_TIMEOUT_MS
      );

      if (!transactionResult.committed) {
        throw new Error('La mesa está siendo modificada por otro mesero. Intenta de nuevo.');
      }

      const mesaSnapshot = transactionResult.snapshotVal as MesaSnapshot | null;
      if (!mesaSnapshot) throw new Error('Error de consistencia en mesa');

      try {
        let pedidoId = mesaSnapshot.pedidoActivoId || undefined;
        let promisePedido: Promise<string | void>;

        if (pedidoId) {
          const itemPromises = itemsParaEnviar.map((item) =>
            pedidosRepo.agregarItem(pedidoId!, buildPedidoItemPayload(item) as any)
          );
          promisePedido = Promise.all(itemPromises).then(() => pedidoId!);
        } else {
          const itemsRecord: Record<string, any> = {};
          itemsParaEnviar.forEach((item, index) => {
            itemsRecord[`item_${index}`] = buildPedidoItemPayload(item);
          });

          const nuevoPedido = {
            tipo: 'mesa' as const,
            mesaId: selectedTable,
            estatus: 'activo',
            items: itemsRecord,
          };

          promisePedido = pedidosRepo.crear(nuevoPedido as any).then(async (newId: string) => {
            pedidoId = newId;
            setPuentePedidoId(newId);
            await mesasRepo.asignarPedido(selectedTable, newId);
            return newId;
          });
        }

        await promisePedido;

        await Promise.all([
          pedidosRepo.enviarACocina(pedidoId!),
          mesasRepo.actualizarEstado(selectedTable, 'ocupada'),
        ]);

        mesasRepo.liberarBloqueoMesaPedido(selectedTable).catch(console.error);

        log.info('🚀 Lógica Cuántica Completada', { pedidoId });
        return { success: true, pedidoId };
      } catch (err) {
        log.error('💥 Error en Lógica Cuántica:', err);

        // Rollback
        if (previousDrafts.length > 0) {
          log.info('🔄 Restaurando drafts por error...');
          for (const item of previousDrafts) {
            await addDraftItem(item);
          }
        }

        const error = err instanceof Error ? err : new Error(String(err));
        setLastError(error.message);

        try {
          await mesasRepo.liberarBloqueoMesaPedido(selectedTable);
        } catch {}

        return { success: false, error: error.message };
      } finally {
        setIsSending(false);
      }
    },
    [
      selectedTable,
      pedidosRepo,
      mesasRepo,
      clearPendingItems,
      tenantId,
      addDraftItem,
      activePendingItemsRef,
    ]
  );

  const sendOrderWithValidation = useCallback(
    async (subpedidoId: string) => {
      return sendOrder(subpedidoId);
    },
    [sendOrder]
  );

  return {
    isSending,
    lastError,
    setLastError,
    puentePedidoId,
    setPuentePedidoId,
    sendOrder,
    sendOrderWithValidation,
  };
}
