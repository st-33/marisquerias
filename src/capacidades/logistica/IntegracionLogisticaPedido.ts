import type { Pedido, PedidoItem } from '../../sistema/persistencia/pedidos.repo';
import {
  pedidoRequiereLogistica,
  type EstadoLogistico,
  type LogisticaPedido,
  type OrigenPedido,
} from '../../logica/dominio/logistica';
import {
  crearIdDeterminista,
  identidadTenantDesdePath,
  type CanalEntrada,
  type EstadoMisionLogistica,
  type ResultadoProcesamiento,
  type SenalEntrada,
  type SenalRequiereEntrega,
} from '../../motor';
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

export interface PuertoEntradaLogistica {
  procesar(senal: SenalEntrada): Promise<ResultadoProcesamiento>;
}

export interface MotorLogisticoLegacy {
  crearMisionDelivery(
    mision: Omit<MisionDelivery, 'id' | 'createdAt' | 'createdAtISO' | 'estado'>
  ): Promise<string>;
  suscribirPorTenant?: (
    tenantId: string,
    callback: (misiones: Record<string, Mision>) => void
  ) => () => void;
}

export type MotorLogistico = MotorLogisticoLegacy;

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

function estadoMotorAEstadoLogistico(estado: EstadoMisionLogistica): EstadoLogistico {
  switch (estado) {
    case 'entregada':
      return 'completada';
    case 'cancelada':
      return 'cancelada';
    case 'incidencia':
      return 'fallida';
    default:
      return 'solicitada';
  }
}

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

function canalDesdeOrigen(origen?: OrigenPedido): CanalEntrada {
  switch (origen) {
    case 'llamada':
      return 'llamada';
    case 'whatsapp':
      return 'whatsapp';
    case 'red_social':
      return 'red_social';
    case 'sistema':
      return 'sistema';
    default:
      return 'negocio';
  }
}

function crearSenalRequiereEntrega(
  pedido: Pedido,
  contexto: Pick<SolicitudLogisticaPedido, 'tenantId' | 'tenantPath'> & {
    prioridad?: PrioridadMision;
  }
): SenalRequiereEntrega {
  const tenant = identidadTenantDesdePath(contexto.tenantPath);
  const occurredAt = new Date().toISOString();
  const id = crearIdDeterminista('senal-pedido-requiere-entrega', contexto.tenantPath, pedido.id);
  const idempotencyKey = `pedido-requiere-entrega:${contexto.tenantPath}:${pedido.id}`;
  const canal = canalDesdeOrigen(pedido.origen);
  const modalidad =
    pedido.modalidad === 'recoleccion' || pedido.modalidad === 'entrega'
      ? pedido.modalidad
      : 'domicilio';

  if (
    !pedido.destino?.direccion ||
    typeof pedido.destino.lat !== 'number' ||
    typeof pedido.destino.lng !== 'number'
  ) {
    throw new Error('El pedido requiere dirección y coordenadas para emitir la señal logística.');
  }

  return {
    id,
    schemaVersion: 1,
    operationId: crearIdDeterminista('operacion-logistica', contexto.tenantPath, pedido.id),
    tenant,
    origen: 'negocio',
    canal,
    actor: { tipo: 'negocio', id: contexto.tenantId },
    destino: 'motor_logistico',
    occurredAt,
    idempotencyKey,
    referencias: [{ tipo: 'pedido', id: pedido.id, tenantPath: contexto.tenantPath }],
    tipo: 'pedido.requiere_entrega',
    payload: {
      pedidoId: pedido.id,
      estadoPedido: 'confirmado',
      modalidad,
      puntoRecoleccion: { referencia: 'negocio' },
      puntoEntrega: {
        direccion: pedido.destino.direccion,
        referencia: pedido.destino.referencia,
        coordenadas: { lat: pedido.destino.lat, lng: pedido.destino.lng },
      },
      prioridad: contexto.prioridad === 'urgente' ? 'urgente' : contexto.prioridad || 'media',
    },
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
    private readonly motor: MotorLogisticoLegacy = new RepartoRepository(),
    private readonly entradaMotor?: PuertoEntradaLogistica
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

    if (this.entradaMotor) {
      const resultado = await this.entradaMotor.procesar(
        crearSenalRequiereEntrega(pedido, contexto)
      );
      const referenciaMision = resultado.mision?.id;
      const estado = resultado.mision
        ? estadoMotorAEstadoLogistico(resultado.mision.estado)
        : 'fallida';
      if (!referenciaMision) {
        throw new Error('El motor logístico no devolvió una referencia de misión.');
      }

      await this.pedidos.actualizar(pedido.id, {
        logistica: {
          ...buildLogisticaBase(pedido),
          referenciaMision,
          estado,
          actualizadoEn: Date.now(),
        },
      });
      return { success: true, referenciaMision, estado };
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
    if (this.entradaMotor || !this.motor.suscribirPorTenant || pedidosIds.length === 0) {
      return () => {};
    }
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
