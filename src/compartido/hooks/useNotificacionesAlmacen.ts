/**
 * 🔔 HOOK DE NOTIFICACIONES BASADO EN STORE
 * Detecta cambios en pedidos/mesas del store centralizado
 * SIN crear listeners adicionales de Firebase
 *
 * Reemplaza: usePrintNotificationListener (que creaba listeners redundantes)
 */

import { useEffect, useRef } from 'react';
import { useMesas, usePedidos } from '../../sistema/store';
import type { Mesa } from '../../sistema/persistencia/mesas.repo';

export type RetornoNotificacionAlmacen = (data: {
  mesaId: string;
  type: 'ticket_impreso' | 'mesa_liberada';
}) => void;
export type StoreNotificationCallback = RetornoNotificacionAlmacen;

export type UseNotificacionesAlmacenProps = {
  onNotification: RetornoNotificacionAlmacen;
  enabled?: boolean;
};
export type UseStoreNotificationsProps = UseNotificacionesAlmacenProps;

export function useNotificacionesAlmacen({
  onNotification,
  enabled = true,
}: UseNotificacionesAlmacenProps) {
  const pedidos = usePedidos();
  const mesas = useMesas();

  const previousPrintedRef = useRef<Set<string>>(new Set());
  const previousOccupiedRef = useRef<Set<string>>(new Set());
  const isFirstRenderRef = useRef(true);

  // Detectar tickets impresos
  useEffect(() => {
    if (!enabled) return;

    // Primera render: solo inicializar refs
    if (isFirstRenderRef.current) {
      Object.entries(pedidos).forEach(([pedidoId, pedido]) => {
        if (pedido.cuentaImpresa === true) {
          const key = `${pedidoId}:${pedido.mesaId}`;
          previousPrintedRef.current.add(key);
        }
      });
      isFirstRenderRef.current = false;
      return;
    }

    // Renders posteriores: detectar NUEVOS tickets impresos
    Object.entries(pedidos).forEach(([pedidoId, pedido]) => {
      if (!pedido.mesaId) return; // Guardia: pedido sin mesa

      const mesaId = pedido.mesaId;
      const key = `${pedidoId}:${mesaId}`;

      if (pedido.cuentaImpresa === true && !previousPrintedRef.current.has(key)) {
        previousPrintedRef.current.add(key);
        onNotification({ mesaId, type: 'ticket_impreso' });
      }
    });
  }, [pedidos, enabled, onNotification]);

  // Detectar mesas liberadas
  useEffect(() => {
    if (!enabled) return;

    const currentOccupied = new Set<string>();
    Object.entries(mesas).forEach(([mesaId, mesaData]) => {
      const mesa = mesaData as Mesa;
      if (mesa.estado !== 'libre') {
        currentOccupied.add(mesaId);
      }
    });

    // Detectar mesas recién liberadas
    previousOccupiedRef.current.forEach((mesaId) => {
      if (!currentOccupied.has(mesaId)) {
        onNotification({ mesaId, type: 'mesa_liberada' });
      }
    });

    previousOccupiedRef.current = currentOccupied;
  }, [mesas, enabled, onNotification]);
}

export const useStoreNotifications = useNotificacionesAlmacen;
