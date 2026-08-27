/**
 * Contratos puros del motor logístico distribuido.
 *
 * Este módulo no conoce Firebase, React ni la persistencia del negocio. El Pedido
 * permanece como referencia del tenant; la SolicitudLogistica y la MisionLogistica
 * son objetos propios de la coordinación logística.
 */

export const VERSION_ESQUEMA_MOTOR = 1 as const;

export type VersionEsquemaMotor = typeof VERSION_ESQUEMA_MOTOR;

export type OrigenSenal =
  | 'negocio'
  | 'publico'
  | 'llamada'
  | 'mensajeria'
  | 'redes'
  | 'sistema'
  | 'automatizacion'
  | 'servicio_domicilio';

export type CanalEntrada =
  | 'negocio'
  | 'publico'
  | 'llamada'
  | 'whatsapp'
  | 'mensajeria'
  | 'red_social'
  | 'sistema'
  | 'automatizacion';

export type TipoActor =
  | 'negocio'
  | 'publico'
  | 'central'
  | 'repartidor'
  | 'sistema'
  | 'automatizacion';

export interface Actor {
  tipo: TipoActor;
  id: string;
}

export interface IdentidadTenant {
  tenantPath: string;
  tenantId: string;
  categoriaId: string;
}

export interface CapacidadesLogisticas {
  motorLogistico: boolean;
  delivery: boolean;
  solicitudesLogisticas: boolean;
}

export interface ContextoOperativo extends IdentidadTenant {
  tenantExiste: boolean;
  habilitado: boolean;
  capacidades: CapacidadesLogisticas;
  actoresAutorizados: readonly TipoActor[];
  actorIdsAutorizados?: readonly string[];
}

export type EstadoPedido =
  | 'provisional'
  | 'corroboracion'
  | 'confirmado'
  | 'en_proceso'
  | 'cancelado';

export type EstadoSolicitudLogistica = 'solicitada' | 'cancelada';

export type EstadoMisionLogistica =
  | 'solicitada'
  | 'propuesta'
  | 'asignada'
  | 'aceptada'
  | 'recoleccion'
  | 'en_camino'
  | 'entregada'
  | 'incidencia'
  | 'cancelada';

export type ModalidadLogistica = 'domicilio' | 'recoleccion' | 'entrega';

export type PrioridadLogistica = 'baja' | 'media' | 'alta' | 'urgente';

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface UbicacionOperativa {
  direccion?: string;
  referencia?: string;
  coordenadas?: Coordenadas;
}

export type TipoReferencia = 'pedido' | 'negocio' | 'ubicacion' | 'solicitud_logistica' | 'mision';

export interface Referencia {
  tipo: TipoReferencia;
  id: string;
  tenantPath?: string;
}

export interface NecesidadEntrega {
  pedidoId: string;
  estadoPedido: 'confirmado' | 'en_proceso';
  modalidad: ModalidadLogistica;
  puntoRecoleccion: UbicacionOperativa;
  puntoEntrega: UbicacionOperativa;
  prioridad?: PrioridadLogistica;
  notas?: string;
}

export interface CancelacionPedido {
  pedidoId: string;
  motivo?: string;
}

export interface SobreSenalBase {
  id: string;
  schemaVersion: VersionEsquemaMotor;
  operationId: string;
  tenant: IdentidadTenant;
  origen: OrigenSenal;
  canal: CanalEntrada;
  actor: Actor;
  destino: 'motor_logistico';
  occurredAt: string;
  idempotencyKey: string;
  referencias: readonly Referencia[];
}

export interface SenalRequiereEntrega extends SobreSenalBase {
  tipo: 'pedido.requiere_entrega';
  payload: NecesidadEntrega;
}

export interface SenalPedidoCancelado extends SobreSenalBase {
  tipo: 'pedido.cancelado';
  payload: CancelacionPedido;
}

export type SenalEntrada = SenalRequiereEntrega | SenalPedidoCancelado;

export interface SolicitudLogistica {
  id: string;
  tenant: IdentidadTenant;
  pedidoId: string;
  estado: EstadoSolicitudLogistica;
  modalidad: ModalidadLogistica;
  puntoRecoleccion: UbicacionOperativa;
  puntoEntrega: UbicacionOperativa;
  prioridad: PrioridadLogistica;
  createdAt: string;
  canceladaAt?: string;
  referenciaPedido: Referencia;
}

export interface MisionLogistica {
  id: string;
  tenant: IdentidadTenant;
  solicitudLogisticaId: string;
  pedidoId: string;
  estado: EstadoMisionLogistica;
  modalidad: ModalidadLogistica;
  puntoRecoleccion: UbicacionOperativa;
  puntoEntrega: UbicacionOperativa;
  prioridad: PrioridadLogistica;
  createdAt: string;
  canceladaAt?: string;
}

export type TipoEventoDominio =
  | 'pedido.en_proceso'
  | 'solicitud_logistica.creada'
  | 'solicitud_logistica.cancelada'
  | 'mision.propuesta'
  | 'mision.cancelada';

export interface EventoDominio {
  id: string;
  schemaVersion: VersionEsquemaMotor;
  operationId: string;
  tenant: IdentidadTenant;
  origen: 'motor_logistico';
  destino: 'negocio' | 'central' | 'repartidor' | 'motor_logistico';
  tipo: TipoEventoDominio;
  occurredAt: string;
  idempotencyKey: string;
  referencias: readonly Referencia[];
  payload: Readonly<Record<string, unknown>>;
}

export type DestinoSenalSalida = 'negocio' | 'central' | 'repartidor';

export interface SenalSalida {
  id: string;
  schemaVersion: VersionEsquemaMotor;
  operationId: string;
  tenant: IdentidadTenant;
  origen: 'motor_logistico';
  destino: DestinoSenalSalida;
  tipo: 'mision.propuesta' | 'mision.cancelada';
  occurredAt: string;
  idempotencyKey: string;
  referencias: readonly Referencia[];
  payload: Readonly<Record<string, unknown>>;
}

export interface ResultadoProcesamiento {
  estado: 'procesada' | 'repetida';
  codigo: 'ACEPTADA' | 'EVENTO_REPETIDO' | 'IDEMPOTENCIA_REPETIDA' | 'PEDIDO_REPETIDO';
  eventId: string;
  operationId: string;
  tenantPath: string;
  solicitudLogistica?: SolicitudLogistica;
  mision?: MisionLogistica;
  eventos: readonly EventoDominio[];
  senales: readonly SenalSalida[];
}

export interface RegistroProcesamiento {
  tenantPath: string;
  eventId: string;
  idempotencyKey: string;
  fingerprint: string;
  pedidoId: string;
  resultado: ResultadoProcesamiento;
}
