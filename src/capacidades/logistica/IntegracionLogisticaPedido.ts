import type { Pedido, PedidoItem } from '../../sistema/persistencia/pedidos.repo';
import {
  pedidoRequiereLogistica,
  type EstadoLogistico,
  type LogisticaPedido,
} from '../../logica/dominio/logistica';
import type {
  EstadoMision,
  ItemMision,
  Mision,
  MisionDelivery,
  PrioridadMision,
} from '../../sistema/persistencia/reparto.repo';
import { RepartoRepository } from '../../sistema/persistencia/reparto.repo';

export interface SolicitudLogisticaPedido {
  pedidoId: string;
  tenantId: string;
  tenantPath: string;
  prioridad?: PrioridadMision;
  pedido: Pick<
    Pedido,
    'cliente' | 'destino' | 'items' | 'totales' | 'tipo' | 'modalidad' | 'origen'
  >;
}

export interface ResultadoSolicitudLogistica {
  success: boolean;
  referenciaMision?: string;
  estado: EstadoLogistico;
  error?: string;
}

export interface MotorLogistico {
  crearMisionDelivery(
    mision: Omit<MisionDelivery, 'id' | 'createdAt' | 'createdAtISO' | 'estado'>
  ): Promise<string>;
  suscribirPorTenant?: (
    tenantId: string,
    callback: (misiones: Record<string, Mision>) => void
  ) => () => void;
}

export interface PedidosLogisticaWriter {
  actualizar(pedidoId: string, datos: Partial<Pedido>): Promise<void>;
}

const ESTADOS_MISION_A_LOGISTICA: Record<EstadoMision, EstadoLogistico> = {
  pendiente: 'solicitada',
  asignada: 'asignada',
  en_camino: 'en_camino',
  en_ubicacion: 'en_ubicacion',
  completada: 'completada',
  cancelada: 'cancelada',
  fallida: 'fallida',
};

function toItemMision(itemId: string, item: PedidoItem): ItemMision {
  const unidad = (item as PedidoItem & { unidad?: ItemMision['unidad'] }).unidad;
  return {
    id: itemId,
    nombre: item.nombre,
    cantidad: Number(item.cantidad || 0),
    unidad: unidad || 'pza',
    precio: Number(item.precio || 0),
    notas: item.notas,
  };
}

function buildLogisticaBase(pedido: Pedido): LogisticaPedido {
  return {
    requiereEntrega: true,
    modalidad:
      pedido.modalidad === 'recoleccion' || pedido.modalidad === 'entrega'
        ? pedido.modalidad
        : 'domicilio',
    origen: pedido.origen || 'negocio',
    estado: 'solicitada',
    referenciaMision: null,
    actualizadoEn: Date.now(),
    error: null,
  };
}

/**
 * Frontera entre el pedido propiedad de Marisquerías y el motor de reparto.
 * No replica el pedido ni inventario: solo crea una misión con los mínimos
 * necesarios y persiste en el pedido la referencia/estado logístico.
 */
export class IntegracionLogisticaPedido {
  constructor(
    private readonly pedidos: PedidosLogisticaWriter,
    private readonly motor: MotorLogistico = new RepartoRepository()
  ) {}

  async solicitarEntrega(
    pedido: Pedido,
    contexto: Pick<SolicitudLogisticaPedido, 'tenantId' | 'tenantPath'> & {
      prioridad?: PrioridadMision;
    }
  ): Promise<ResultadoSolicitudLogistica> {
    if (!pedidoRequiereLogistica(pedido)) {
      return {
        success: false,
        estado: 'no_requerida',
        error: 'El pedido no requiere una operación logística.',
      };
    }

    const destino = pedido.destino;
    const cliente = pedido.cliente;
    if (!destino?.direccion || !cliente?.nombre) {
      const error = 'Faltan cliente o destino para solicitar la entrega.';
      await this.pedidos.actualizar(pedido.id, {
        logistica: {
          ...buildLogisticaBase(pedido),
          estado: 'fallida',
          actualizadoEn: Date.now(),
          error,
        },
      });
      return { success: false, estado: 'fallida', error };
    }

    if (pedido.logistica?.referenciaMision) {
      return {
        success: true,
        referenciaMision: pedido.logistica.referenciaMision,
        estado: pedido.logistica.estado || 'solicitada',
      };
    }

    if (typeof destino.lat !== 'number' || typeof destino.lng !== 'number') {
      const error =
        'El contrato MisionDelivery.v1 exige coordenadas lat/lng; el pedido solo tiene una dirección.';
      await this.pedidos.actualizar(pedido.id, {
        logistica: {
          ...buildLogisticaBase(pedido),
          estado: 'fallida',
          actualizadoEn: Date.now(),
          error,
        },
      });
      return { success: false, estado: 'fallida', error };
    }

    const items = Object.fromEntries(
      Object.entries(pedido.items || {}).map(([itemId, item]) => [
        itemId,
        toItemMision(itemId, item),
      ])
    );

    try {
      const referenciaMision = await this.motor.crearMisionDelivery({
        tipo: 'delivery',
        prioridad: contexto.prioridad || 'media',
        pedidoId: pedido.id,
        tenantId: contexto.tenantId,
        tenantPath: contexto.tenantPath,
        cliente: {
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          ubicacion: {
            direccion: destino.direccion,
            referencia: destino.referencia,
            lat: destino.lat,
            lng: destino.lng,
          },
        },
        items,
        totales: {
          subtotal: Number(pedido.totales?.subtotal || 0),
          total: Number(pedido.totales?.total || 0),
        },
        notas: undefined,
        metadata: {
          contrato: 'MisionDelivery.v1',
          origen: 'marisquerias',
          tipoPedido: pedido.tipo,
          modalidad: pedido.modalidad || 'domicilio',
          canalEntrada: pedido.origen || 'negocio',
        },
      });

      const logistica: LogisticaPedido = {
        ...buildLogisticaBase(pedido),
        referenciaMision,
        actualizadoEn: Date.now(),
      };
      await this.pedidos.actualizar(pedido.id, { logistica });

      return { success: true, referenciaMision, estado: logistica.estado };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.pedidos.actualizar(pedido.id, {
        logistica: {
          ...buildLogisticaBase(pedido),
          estado: 'fallida',
          actualizadoEn: Date.now(),
          error: message,
        },
      });
      return { success: false, estado: 'fallida', error: message };
    }
  }

  suscribirActualizaciones(
    tenantId: string,
    pedidosIds: readonly string[],
    onUpdate: (actualizacion: {
      pedidoId: string;
      estado: EstadoMision;
      referenciaMision: string;
    }) => void
  ): () => void {
    if (!this.motor.suscribirPorTenant || pedidosIds.length === 0) return () => {};
    const pedidosIdsSet = new Set(pedidosIds);

    return this.motor.suscribirPorTenant(tenantId, (misiones) => {
      Object.values(misiones).forEach((mision) => {
        if (
          mision.tipo === 'delivery' &&
          pedidosIdsSet.has(mision.pedidoId) &&
          mision.id &&
          mision.estado
        ) {
          onUpdate({
            pedidoId: mision.pedidoId,
            estado: mision.estado,
            referenciaMision: mision.id,
          });
        }
      });
    });
  }

  async aplicarActualizacion(
    pedido: Pedido,
    estadoMision: EstadoMision,
    referenciaMision?: string | null
  ): Promise<void> {
    const estado = ESTADOS_MISION_A_LOGISTICA[estadoMision];
    await this.pedidos.actualizar(pedido.id, {
      logistica: {
        ...buildLogisticaBase(pedido),
        estado,
        referenciaMision: referenciaMision ?? pedido.logistica?.referenciaMision ?? null,
        actualizadoEn: Date.now(),
        error: estado === 'fallida' ? pedido.logistica?.error || null : null,
      },
    });
  }
}
