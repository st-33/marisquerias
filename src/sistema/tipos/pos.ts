/** Tipos específicos del flujo POS y comanda. */

// MODELO CANÓNICO DE ÍTEMS POS (Fase v0.2)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ítem pendiente en el borrador del mesero (aún NO enviado a cocina).
 *
 * DOGMA ADI:
 * - Variantes como Record<string, string> PLANO (clave → valor único seleccionado).
 * - Fuente de verdad: SQLite local (order_draft_items_v1).
 * - Reemplaza al PendingItem de useMeseroLogic.ts.
 */
export type ItemPendiente = {
  /** UUID del ítem — generado en el punto de emisión del hook visual */
  itemId: string;

  /** UUID del borrador (FK hacia order_drafts_v1) */
  draftId: string;

  /** ID del producto en el catálogo */
  productoId: string;

  /** Nombre legible para mostrar en pantalla */
  nombre: string;

  /** Precio unitario efectivo (ya incluye delta de variante si aplica) */
  precio: number;

  /** Cantidad pedida */
  cantidad: number;

  /** Variante de tamaño: Record plano { "tamaño": "grande" } */
  tamano?: Record<string, string>;

  /** Variante de preparación: Record plano { "punto": "termino medio" } */
  preparacion?: Record<string, string>;

  /** Precio base del producto antes del delta de variante */
  precioBase?: number;

  /** Delta de precio generado por la variante seleccionada */
  deltaPrecio?: number;

  /** Tiempo estimado de preparación en minutos */
  prepMinutos?: number;
};

/**
 * Ítem de un pedido ACTIVO (ya enviado a cocina).
 *
 * DOGMA ADI:
 * - Solo lectura en la capa visual. Su estado lo actualiza el Core.
 * - Reemplaza al OrderItem de useMeseroLogic.ts.
 */
export type ItemPedido = {
  /** ID del ítem en el sistema del pedido */
  id: string;

  /** Nombre del producto */
  nombre: string;

  /** Precio unitario */
  precio: number;

  /** Cantidad enviada */
  cantidad: number;

  /**
   * Estado operativo: 'nuevo' → 'preparando' → 'listo' → 'entregado'
   */
  estado: 'nuevo' | 'preparando' | 'listo' | 'entregado';

  /**
   * Variantes (legacy puede traer string[]). El hook visual normaliza antes de mostrar.
   */
  variantes?: Record<string, string | string[]>;

  /** Etiquetas legibles para mostrar en tarjetas de ítem */
  variantLabels?: string[];

  /** Si el inventario fue descontado */
  inventoryDeducted?: boolean;

  /** ID del producto en catálogo */
  productId?: string;
};

/**
 * Sobre de idempotencia para comandos del motor POS.
 * Todo comando que salga del hook visual DEBE incluir estos campos.
 */
export type ComandoPOS = {
  /** UUID v4 único por intención de mutación */
  operationId: string;

  /** Clave determinista para dedup: `${draftId}:${deviceId}:${accion}` */
  dedupeKey: string;

  /** Timestamp de creación del comando */
  timestamp: number;
};

/**
 * Payload del evento ORDER_DRAFT_READY.
 * Se encola en la ColaComandos cuando el mesero envía la orden a cocina.
 */
export type ComandoOrdenLista = ComandoPOS & {
  tipo: 'ORDER_DRAFT_READY';

  /** ID del borrador que pasa a estado 'enviado' */
  draftId: string;

  /** ID de la mesa o 'takeaway' */
  mesaId: string;

  /** ID físico del dispositivo que emitió el comando */
  deviceId: string;

  /** Ítems que conforman la orden */
  items: ItemPendiente[];
};

// ═══════════════════════════════════════════════════════════════════════════
// MODELO CANÓNICO DE CATÁLOGO (Fase v0.3)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Categoría de menú en el catálogo.
 *
 * DOGMA ADI:
 * - Fuente de verdad para la clasificación de productos.
 */
export type Category = {
  id: string;
  nombre: string;
  orden?: number;
  activo?: boolean;
};

/**
 * Producto del menú en el catálogo.
 *
 * DOGMA ADI:
 * - Fuente de verdad para el precio base y configuración del producto.
 */
export type Product = {
  id: string;
  nombre: string;
  precio: number;
  descripcion?: string;
  categoriaId: string;
  activo?: boolean;
  imagen?: string;
  variantes?: Record<string, any>;
};
