/**
 * 🏛️ CAPA DE PERSISTENCIA
 * Punto de entrada único para todos los repositorios
 *
 * REGLA DE ORO: Ningún componente o hook de negocio debe llamar a Firebase directamente.
 * Todos deben pasar por estos repositorios.
 */

export { PedidosRepository } from './pedidos.repo';
export type { Pedido, PedidoItem } from './pedidos.repo';

export * from './mesas.repo';

export { MenuRepository } from './menu.repo';
export type { Categoria, Producto, VariantGroup, VariantOption, VariantRule } from './menu.repo';

export { TicketTemplatesRepository } from './tickets.repo';
export type {
  TicketTemplate,
  TicketTemplateAcciones,
  TicketTemplateElemento,
  TicketTemplatesPorRol,
} from './tickets.repo';

export { DraftsLocalRepo, inicializarSchemaDrafts } from './drafts.repo';
export type {
  DraftItem,
  OrderDraft,
  DraftEstado,
  DraftOrigen,
  ComandoIdempotente,
} from './drafts.repo';

export { RepartoRepository } from './reparto.repo';
export type {
  EstadoMision,
  ItemMision,
  Mision,
  MisionDelivery,
  MisionReabastecimiento,
  PrioridadMision,
  Repartidor,
  TipoMision,
  Ubicacion,
} from './reparto.repo';

export { DevicesRepository } from './devices.repo';
export type { TicketConfig, HubConfig } from './devices.repo';

export { TenantRepository } from './tenant.repo';
export type { Caracteristicas, Features } from './tenant.repo';

export { RepartoAjustesRepository } from './reparto-ajustes.repo';
export type { AjustesReparto } from './reparto-ajustes.repo';
