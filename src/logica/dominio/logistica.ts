/**
 * Contrato mínimo de logística asociado a un pedido del negocio.
 *
 * El pedido, sus items, venta e inventario siguen viviendo en Marisquerías.
 * Este contrato solo conserva la referencia y el estado que el negocio necesita
 * conocer para coordinar una etapa logística posterior.
 */

export type ModalidadPedido =
  | 'presencial'
  | 'para_llevar'
  | 'domicilio'
  | 'recoleccion'
  | 'entrega';

export type OrigenPedido =
  | 'mesero'
  | 'llamada'
  | 'whatsapp'
  | 'red_social'
  | 'negocio'
  | 'servicio_a_domicilio'
  | 'sistema';

export type EstadoLogistico =
  | 'no_requerida'
  | 'pendiente'
  | 'solicitada'
  | 'asignada'
  | 'en_camino'
  | 'en_ubicacion'
  | 'completada'
  | 'cancelada'
  | 'fallida';

export interface UbicacionPedido {
  direccion: string;
  referencia?: string;
  lat?: number;
  lng?: number;
}

export interface ClientePedido {
  nombre: string;
  telefono?: string;
}

export interface LogisticaPedido {
  requiereEntrega: boolean;
  modalidad: Extract<ModalidadPedido, 'domicilio' | 'recoleccion' | 'entrega'>;
  origen?: OrigenPedido;
  estado: EstadoLogistico;
  referenciaMision?: string | null;
  actualizadoEn?: number;
  error?: string | null;
}

export function pedidoRequiereLogistica(pedido: {
  tipo?: string;
  modalidad?: string;
  logistica?: Partial<LogisticaPedido> | null;
}): boolean {
  return (
    pedido.logistica?.requiereEntrega === true ||
    pedido.tipo === 'delivery' ||
    pedido.modalidad === 'domicilio' ||
    pedido.modalidad === 'entrega'
  );
}

export function logisticaHabilitada(features?: Record<string, unknown> | null): boolean {
  const enabled = (value: unknown) =>
    value === true ||
    (typeof value === 'object' &&
      value !== null &&
      (value as { enabled?: unknown }).enabled === true);

  return enabled(features?.delivery) || enabled(features?.delivery_interno_adi_repart);
}

export function pedidoConfirmadoParaLogistica(pedido: {
  estatus?: string;
  cerrado?: boolean;
}): boolean {
  if (pedido.cerrado === true) return false;
  return !['activo', 'creado', 'nuevo', 'borrador'].includes(
    String(pedido.estatus || '').toLowerCase()
  );
}

export function etiquetaEstadoLogistico(estado?: EstadoLogistico | null): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente';
    case 'solicitada':
      return 'Solicitada';
    case 'asignada':
      return 'Asignada';
    case 'en_camino':
      return 'En camino';
    case 'en_ubicacion':
      return 'En ubicación';
    case 'completada':
      return 'Completada';
    case 'cancelada':
      return 'Cancelada';
    case 'fallida':
      return 'Requiere atención';
    default:
      return 'Sin solicitud';
  }
}
