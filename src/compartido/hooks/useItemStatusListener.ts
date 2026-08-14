/**
 * 👂 LISTENER DE ITEMS LISTOS
 * Hook que escucha cuando items de CUALQUIER mesa pasan a estado "listo"
 * y notifica al mesero correspondiente
 *
 * IMPORTANTE:
 * - Solo escucha items en estado "listo"
 * - NO modifica la mesa actual del usuario
 * - Solo muestra notificación flash
 */

import type { Database } from 'firebase/database';
import { useEffect, useRef } from 'react';
import { usePedidos } from '../../plataforma/core/store';

export type ItemReadyCallback = (data: {
  mesaId: string;
  itemId: string;
  itemName: string;
  pedidoId: string;
}) => void;

type UseItemStatusListenerProps = {
  db: Database;
  tenantPath: string;
  onItemReady: ItemReadyCallback;
  enabled?: boolean;
};

export function useItemStatusListener({
  db,
  tenantPath,
  onItemReady,
  enabled = true,
}: UseItemStatusListenerProps) {
  // 🔌 DOGMA V2: Leer pedidos del store centralizado (NO crear listener)
  const pedidos = usePedidos();
  const previousItemsRef = useRef<Map<string, string>>(new Map()); // itemKey -> estado
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!enabled || !tenantPath) return;

    // Evitar notificaciones en el primer render (carga inicial)
    if (isFirstRender.current) {
      // Poblar el mapa inicial con todos los items y sus estados
      Object.entries(pedidos).forEach(([pedidoId, pedido]: [string, any]) => {
        const items = pedido.items || {};
        Object.entries(items).forEach(([itemId, item]: [string, any]) => {
          const itemKey = `${pedidoId}:${itemId}`;
          previousItemsRef.current.set(itemKey, item.estado || 'nuevo');
        });
      });
      isFirstRender.current = false;
      console.log('[ItemStatusListener] 👂 Iniciado (leyendo del store)');
      return;
    }

    // Detectar transiciones a "listo"
    Object.entries(pedidos).forEach(([pedidoId, pedido]: [string, any]) => {
      const mesaId = pedido.mesaId;
      const items = pedido.items || {};

      Object.entries(items).forEach(([itemId, item]: [string, any]) => {
        const itemKey = `${pedidoId}:${itemId}`;
        const previousState = previousItemsRef.current.get(itemKey);
        const currentState = item.estado || 'nuevo';

        // Actualizar mapa
        previousItemsRef.current.set(itemKey, currentState);

        // 🔔 Detectar transición a "listo" (solo si antes NO estaba en listo)
        if (currentState === 'listo' && previousState && previousState !== 'listo') {
          console.log('[ItemStatusListener] 🔔 Item listo detectado:', {
            mesaId,
            itemId,
            itemName: item.nombre,
          });

          onItemReady({
            mesaId,
            itemId,
            itemName: item.nombre || 'Item',
            pedidoId,
          });
        }
      });
    });

    // Limpiar items que ya no existen
    const currentKeys = new Set<string>();
    Object.entries(pedidos).forEach(([pedidoId, pedido]: [string, any]) => {
      const items = pedido.items || {};
      Object.keys(items).forEach((itemId) => {
        currentKeys.add(`${pedidoId}:${itemId}`);
      });
    });

    previousItemsRef.current.forEach((_, key) => {
      if (!currentKeys.has(key)) {
        previousItemsRef.current.delete(key);
      }
    });
  }, [pedidos, tenantPath, onItemReady, enabled]);
}
