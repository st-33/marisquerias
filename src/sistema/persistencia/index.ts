/**
 * 🏛️ CAPA DE PERSISTENCIA
 * Punto de entrada único para todos los repositorios
 *
 * REGLA DE ORO: Ningún componente o hook de negocio debe llamar a Firebase directamente.
 * Todos deben pasar por estos repositorios.
 */

export { PedidosRepository } from './pedidos.repo';
export type { Pedido, PedidoItem } from './pedidos.repo';

export { RegistroVentasRepository } from './registroVentas.repo';
export type {
  CanalRegistroVenta,
  EntradaRegistroVenta,
  EstadoRegistroVenta,
  OrigenRegistroVenta,
  RegistroVenta,
  ResumenItemVenta,
} from './registroVentas.repo';

export * from './mesas.repo';

export { getVariantOptionLabel, MenuRepository } from './menu.repo';
export type { Categoria, Producto, VariantGroup, VariantOption, VariantRule } from './menu.repo';

export { TicketTemplatesRepository } from './tickets.repo';
export type {
  TicketTemplate,
  TicketTemplateAcciones,
  TicketTemplateElemento,
  TicketTemplatesPorRol,
} from './tickets.repo';

export {
  RepositorioBorradores,
  BorradoresLocalRepo,
  DraftsLocalRepo,
  inicializarEsquemaBorradores,
  inicializarSchemaDrafts,
} from './borradores.repo';
export type {
  PartidaBorrador,
  BorradorComanda,
  EstadoBorrador,
  OrigenBorrador,
  DraftItem,
  OrderDraft,
  DraftEstado,
  DraftOrigen,
  ComandoIdempotente,
} from './borradores.repo';

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

export {
  RepositorioDispositivos,
  DispositivosRepository,
  DevicesRepository,
} from './dispositivos.repo';
export type {
  ConfiguracionTicket,
  ConfiguracionHub,
  TicketConfig,
  HubConfig,
} from './dispositivos.repo';

export {
  RepositorioVentasSimples,
  VentasSimplesRepo,
  SimpleSalesRepo,
} from './ventasSimples.repo';
export type { VentaMostrador, VentaSimple } from './ventasSimples.repo';

export { NegocioRepository } from './negocio.repo';
export type { Caracteristicas, Features } from './negocio.repo';

export { RepartoAjustesRepository } from './reparto-ajustes.repo';
export type { AjustesReparto } from './reparto-ajustes.repo';

export {
  InventoryV2Repository as RepositorioInventario,
  InventoryV2Repository,
} from './inventario.repo';
export type {
  InventoryAreaV2,
  InventoryItemV2,
  InventorySectionV2,
  InventorySectionId,
} from './inventario.repo';
