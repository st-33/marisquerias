export type OrderStatus =
  | 'creado'
  | 'enviado_cocina'
  | 'en_preparacion'
  | 'listo_para_entregar'
  | 'entregado'
  | 'cerrado';

export type ItemStatus = 'nuevo' | 'en_preparacion' | 'listo' | 'entregado';

export type TableState = 'libre' | 'ocupada' | 'cuenta';

export type SpoolStatus =
  | 'pendiente_aprobacion'
  | 'pendiente_impresion'
  | 'impresion_enviada'
  | 'exito'
  | 'fallo';

const ORDER_ACTIVE: OrderStatus[] = ['enviado_cocina', 'en_preparacion', 'listo_para_entregar'];

const ORDER_LEGACY_MAP: Record<string, OrderStatus> = {
  abierto: 'enviado_cocina',
  enviada_cocina: 'enviado_cocina',
  preparando: 'en_preparacion',
  lista: 'listo_para_entregar',
  listo_para_entrega: 'listo_para_entregar',
};

const ITEM_LEGACY_MAP: Record<string, ItemStatus> = {
  en_cocina: 'en_preparacion',
  preparando: 'en_preparacion',
  lista: 'listo',
};

export function toOrderCanonical(s: any): OrderStatus {
  const str = (s ?? 'creado').toString();
  if (
    str === 'creado' ||
    str === 'enviado_cocina' ||
    str === 'en_preparacion' ||
    str === 'listo_para_entregar' ||
    str === 'entregado' ||
    str === 'cerrado'
  )
    return str as OrderStatus;
  return ORDER_LEGACY_MAP[str] || 'creado';
}

export function toItemCanonical(s: any): ItemStatus {
  const str = (s ?? 'nuevo').toString();
  if (str === 'nuevo' || str === 'en_preparacion' || str === 'listo' || str === 'entregado')
    return str as ItemStatus;
  return ITEM_LEGACY_MAP[str] || 'nuevo';
}

export function isItemBillable(status: ItemStatus): boolean {
  return status === 'en_preparacion' || status === 'listo' || status === 'entregado';
}

export function isOrderActive(status: OrderStatus): boolean {
  return ORDER_ACTIVE.includes(status);
}
