import { useEffect, useMemo, useRef } from 'react';
import type { Database } from 'firebase/database';
import { PedidosRepository } from '../../sistema/persistencia';
import { usePedidos, useStore } from '../../sistema/store';
import {
  logisticaHabilitada as evaluarLogisticaHabilitada,
  pedidoConfirmadoParaLogistica,
  pedidoRequiereLogistica,
} from '../../logica/dominio/logistica';
import { IntegracionLogisticaPedido } from './IntegracionLogisticaPedido';

export interface SincronizarPedidosLogisticaProps {
  db: Database | null;
  tenantId: string | null;
  tenantPath: string | null;
}

/**
 * Observa el store ya existente y entrega automáticamente pedidos que requieren
 * logística. No crea listeners de Firebase ni copia pedidos a otro dominio.
 */
export function useSincronizarPedidosLogistica({
  db,
  tenantId,
  tenantPath,
}: SincronizarPedidosLogisticaProps): void {
  const pedidos = usePedidos();
  const repartoUrl = useStore((state) => state.dataSources.repartoUrl);
  const logisticaHabilitada = useStore((state) =>
    evaluarLogisticaHabilitada(state.negocio.features)
  );

  const pedidosEnviandoseRef = useRef(new Set<string>());
  const pedidosRef = useRef(pedidos);
  useEffect(() => {
    pedidosRef.current = pedidos;
  }, [pedidos]);
  const pedidosLogisticosIds = useMemo(
    () =>
      Object.values(pedidos)
        .filter((pedido) => pedido && pedidoRequiereLogistica(pedido))
        .map((pedido) => pedido.id)
        .sort(),
    [pedidos]
  );
  const pedidosLogisticosKey = pedidosLogisticosIds.join('|');
  const idsParaSuscripcion = useMemo(
    () => (pedidosLogisticosKey ? pedidosLogisticosKey.split('|') : []),
    [pedidosLogisticosKey]
  );

  const integracion = useMemo(() => {
    if (!db || !tenantId || !tenantPath || !repartoUrl || !logisticaHabilitada) return null;
    return new IntegracionLogisticaPedido(new PedidosRepository(db, tenantPath));
  }, [db, logisticaHabilitada, repartoUrl, tenantId, tenantPath]);

  useEffect(() => {
    if (!integracion || !tenantId || !tenantPath) return;

    Object.values(pedidos).forEach((pedido) => {
      if (
        !pedido ||
        pedido.cerrado ||
        !pedidoConfirmadoParaLogistica(pedido) ||
        !pedidoRequiereLogistica(pedido)
      )
        return;
      if (pedido.logistica?.referenciaMision || pedido.logistica?.estado === 'fallida') return;
      if (pedidosEnviandoseRef.current.has(pedido.id)) return;

      pedidosEnviandoseRef.current.add(pedido.id);
      void integracion
        .solicitarEntrega(pedido as any, { tenantId, tenantPath })
        .finally(() => pedidosEnviandoseRef.current.delete(pedido.id));
    });
  }, [integracion, pedidos, tenantId, tenantPath]);

  useEffect(() => {
    if (!integracion || !tenantId || idsParaSuscripcion.length === 0) return;

    return integracion.suscribirActualizaciones(
      tenantId,
      idsParaSuscripcion,
      ({ pedidoId, estado, referenciaMision }) => {
        const pedido = pedidosRef.current[pedidoId];
        if (!pedido) return;
        void integracion.aplicarActualizacion(pedido as any, estado, referenciaMision);
      }
    );
  }, [integracion, idsParaSuscripcion, pedidosLogisticosKey, tenantId]);
}
