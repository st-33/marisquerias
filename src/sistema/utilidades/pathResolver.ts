/**
 * 🌐 RESOLVER DE RUTAS ES/EN
 *
 * Sistema de mapeo bidireccional entre rutas en español e inglés para Firebase RTDB.
 *
 * PROBLEMA:
 * - Firebase usa nomenclatura en inglés (`tables`, `orders`, `status`)
 * - Nuestra arquitectura usa nomenclatura en español (`mesas`, `pedidos`, `estado`)
 * - Necesitamos mapear automáticamente entre ambos mundos
 *
 * SOLUCIÓN:
 * - Diccionario bidireccional ES <-> EN
 * - Funciones para resolver paths completos
 * - Soporte para paths anidados (`mesas/estado` -> `tables/status`)
 *
 * USO:
 * ```ts
 * // En repositorios (uso interno en español)
 * const path = resolveToEN('mesas/estado');  // -> 'tables/status'
 *
 * // Al leer de Firebase (convertir a español)
 * const pathES = resolveToES('orders/active');  // -> 'pedidos/activos'
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// DICCIONARIO BIDIRECCIONAL ES/EN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mapeo de términos español -> inglés
 */
const ES_TO_EN: Record<string, string> = {
  // Entidades principales
  mesas: 'tables',
  pedidos: 'orders',
  productos: 'products',
  categorias: 'categories',
  inventario: 'inventory',
  usuarios: 'users',
  dispositivos: 'devices',
  comandas: 'tickets',
  clientes: 'customers',

  // Estados y propiedades
  estado: 'status',
  activos: 'active',
  completados: 'completed',
  cancelados: 'cancelled',
  pendientes: 'pending',
  proceso: 'in-progress',
  preparando: 'preparing',
  listo: 'ready',
  entregado: 'delivered',

  // Configuración
  configuracion: 'config',
  ajustes: 'settings',
  permisos: 'permissions',
  roles: 'roles',
  features: 'features',

  // Datos operacionales
  historial: 'history',
  movimientos: 'movements',
  transacciones: 'transactions',
  borradores: 'drafts',
  temporal: 'temp',

  // Metadata
  creado: 'created',
  modificado: 'modified',
  eliminado: 'deleted',
  activo: 'active',
  inactivo: 'inactive',

  // Módulos específicos
  cocina: 'kitchen',
  mesero: 'waiter',
  admin: 'admin',
  caja: 'cashier',
  reparto: 'delivery',

  // Propiedades comunes
  nombre: 'name',
  descripcion: 'description',
  precio: 'price',
  cantidad: 'quantity',
  total: 'total',
  subtotal: 'subtotal',
  impuestos: 'taxes',
  descuento: 'discount',

  // Vertical-specific (extensible)
  // Restaurante
  menu: 'menu',
  carta: 'menu',
  platillos: 'dishes',
  bebidas: 'drinks',
  ingredientes: 'ingredients',
  recetas: 'recipes',

  // Inventario
  stock: 'stock',
  lote: 'batch',
  caducidad: 'expiration',
  proveedor: 'supplier',
  compra: 'purchase',
  venta: 'sale',

  // Hardware
  impresora: 'printer',
  bascula: 'scale',
  lector: 'scanner',
  terminal: 'terminal',
};

/**
 * Mapeo de términos inglés -> español (generado automáticamente)
 */
const EN_TO_ES: Record<string, string> = Object.fromEntries(
  Object.entries(ES_TO_EN).map(([es, en]) => [en, es])
);

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE RESOLUCIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resuelve un path en español a inglés.
 *
 * @param pathES - Path en español (e.g., "mesas/estado/activos")
 * @returns Path en inglés (e.g., "tables/status/active")
 *
 * @example
 * resolveToEN('mesas/estado')  // -> 'tables/status'
 * resolveToEN('pedidos/activos/P123')  // -> 'orders/active/P123'
 */
export function resolveToEN(pathES: string): string {
  const segments = pathES.split('/');
  const resolved = segments.map((segment) => {
    // Si el segmento es un ID (no está en el diccionario), mantenerlo
    return ES_TO_EN[segment] || segment;
  });
  return resolved.join('/');
}

/**
 * Resuelve un path en inglés a español.
 *
 * @param pathEN - Path en inglés (e.g., "tables/status/active")
 * @returns Path en español (e.g., "mesas/estado/activos")
 *
 * @example
 * resolveToES('tables/status')  // -> 'mesas/estado'
 * resolveToES('orders/active/P123')  // -> 'pedidos/activos/P123'
 */
export function resolveToES(pathEN: string): string {
  const segments = pathEN.split('/');
  const resolved = segments.map((segment) => {
    // Si el segmento es un ID (no está en el diccionario), mantenerlo
    return EN_TO_ES[segment] || segment;
  });
  return resolved.join('/');
}

/**
 * Verifica si un término está en el diccionario ES.
 *
 * @param term - Término a verificar
 * @returns true si existe en ES_TO_EN
 */
export function isSpanishTerm(term: string): boolean {
  return term in ES_TO_EN;
}

/**
 * Verifica si un término está en el diccionario EN.
 *
 * @param term - Término a verificar
 * @returns true si existe en EN_TO_ES
 */
export function isEnglishTerm(term: string): boolean {
  return term in EN_TO_ES;
}

/**
 * Detecta automáticamente el idioma del path y lo convierte.
 *
 * Si detecta términos en español, convierte a inglés.
 * Si detecta términos en inglés, convierte a español.
 * Si no detecta nada, retorna el path original.
 *
 * @param path - Path a convertir
 * @returns Path convertido
 *
 * @example
 * autoResolve('mesas/estado')  // -> 'tables/status'
 * autoResolve('tables/status')  // -> 'mesas/estado'
 */
export function autoResolve(path: string): string {
  const segments = path.split('/');
  const firstSegment = segments[0];

  if (isSpanishTerm(firstSegment)) {
    return resolveToEN(path);
  }

  if (isEnglishTerm(firstSegment)) {
    return resolveToES(path);
  }

  // No se detectó idioma, retornar original
  return path;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS PARA EXTENDER EL DICCIONARIO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Agrega un nuevo mapeo al diccionario en runtime.
 *
 * Útil para que cada vertical (talleres, barberías, etc.) pueda agregar sus propios términos.
 *
 * @param es - Término en español
 * @param en - Término en inglés
 *
 * @example
 * // Vertical de taller mecánico
 * addMapping('vehiculos', 'vehicles');
 * addMapping('reparaciones', 'repairs');
 * addMapping('refacciones', 'parts');
 */
export function addMapping(es: string, en: string): void {
  ES_TO_EN[es] = en;
  EN_TO_ES[en] = es;
}

/**
 * Agrega múltiples mapeos al diccionario.
 *
 * @param mappings - Record de mapeos ES -> EN
 *
 * @example
 * addMappings({
 *   vehiculos: 'vehicles',
 *   reparaciones: 'repairs',
 *   refacciones: 'parts'
 * });
 */
export function addMappings(mappings: Record<string, string>): void {
  Object.entries(mappings).forEach(([es, en]) => {
    addMapping(es, en);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESETS POR VERTICAL (Extensibilidad)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Presets de mapeos por vertical de negocio.
 * Cada vertical puede cargar su propio conjunto de términos.
 */
export const VERTICAL_PRESETS = {
  /**
   * Preset para talleres mecánicos
   */
  taller: {
    vehiculos: 'vehicles',
    reparaciones: 'repairs',
    refacciones: 'parts',
    diagnostico: 'diagnostic',
    mantenimiento: 'maintenance',
    servicios: 'services',
    mecanico: 'mechanic',
    orden: 'order',
    cotizacion: 'quote',
  },

  /**
   * Preset para barberías / salones
   */
  barberia: {
    citas: 'appointments',
    servicios: 'services',
    cortes: 'haircuts',
    barbero: 'barber',
    estilista: 'stylist',
    turno: 'shift',
    horario: 'schedule',
  },

  /**
   * Preset para tiendas de abarrotes
   */
  abarrotes: {
    articulos: 'items',
    codigo: 'barcode',
    lote: 'batch',
    proveedor: 'supplier',
    compra: 'purchase',
    venta: 'sale',
  },

  /**
   * Preset para restaurantes (ya incluido en el diccionario base)
   */
  restaurante: {},
};

/**
 * Carga un preset de vertical.
 *
 * @param vertical - Nombre del vertical
 *
 * @example
 * loadVerticalPreset('taller');
 */
export function loadVerticalPreset(vertical: keyof typeof VERTICAL_PRESETS): void {
  const preset = VERTICAL_PRESETS[vertical];
  if (preset) {
    addMappings(preset);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { ES_TO_EN, EN_TO_ES };
