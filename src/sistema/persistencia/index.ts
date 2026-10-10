/**
 * 🏛️ CAPA DE PERSISTENCIA
 * Punto de entrada único para todos los repositorios
 *
 * REGLA DE ORO: Ningún componente o hook de negocio debe llamar a Firebase directamente.
 * Todos deben pasar por estos repositorios.
 */

export { RepositorioPedidos, PedidosRepository } from './pedidos.repositorio';
export type { Pedido, PedidoItem } from './pedidos.repositorio';

export { RepositorioRegistroVentas, RegistroVentasRepository } from './registroVentas.repositorio';
export type {
  CanalRegistroVenta,
  EntradaRegistroVenta,
  EstadoRegistroVenta,
  OrigenRegistroVenta,
  RegistroVenta,
  ResumenItemVenta,
} from './registroVentas.repositorio';

export * from './mesas.repositorio';

export { getVariantOptionLabel, RepositorioMenu, MenuRepository } from './menu.repositorio';
export type { Categoria, Producto, VariantGroup, VariantOption, VariantRule } from './menu.repositorio';

export { RepositorioPlantillasTicket, TicketTemplatesRepository } from './tickets.repositorio';
export type {
  TicketTemplate,
  TicketTemplateAcciones,
  TicketTemplateElemento,
  TicketTemplatesPorRol,
} from './tickets.repositorio';

export {
  RepositorioBorradores,
  BorradoresLocalRepo,
  DraftsLocalRepo,
  inicializarEsquemaBorradores,
  inicializarSchemaDrafts,
} from './borradores.repositorio';
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
} from './borradores.repositorio';

export { RepositorioReparto, RepartoRepository } from './reparto.repositorio';
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
} from './reparto.repositorio';

export {
  RepositorioDispositivos,
  DispositivosRepository,
  DevicesRepository,
} from './dispositivos.repositorio';
export type {
  ConfiguracionTicket,
  ConfiguracionHub,
  TicketConfig,
  HubConfig,
} from './dispositivos.repositorio';

export {
  RepositorioVentasSimples,
  VentasSimplesRepo,
  SimpleSalesRepo,
} from './ventasSimples.repositorio';
export type { VentaMostrador, VentaSimple } from './ventasSimples.repositorio';

export { RepositorioNegocio, NegocioRepository } from './negocio.repositorio';
export type { Caracteristicas, Features } from './negocio.repositorio';

export { RepositorioAjustesReparto, RepartoAjustesRepository } from './reparto-ajustes.repositorio';
export type { AjustesReparto } from './reparto-ajustes.repositorio';

export {
  RepositorioInventario,
  InventoryV2Repository,
} from './inventario.repositorio';
export type {
  InventoryAreaV2,
  InventoryItemV2,
  InventorySectionV2,
  InventorySectionId,
} from './inventario.repositorio';
