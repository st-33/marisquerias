/**
 * Identidad derivada de una ruta_negocio válida de mínimo 2 segmentos: [...contexto_path]/{categoria}/{negocio}.
 * El cliente nunca inventa estos valores; los deriva de la ruta_negocio recibida de RTDB.
 */
export type IdentidadNegocio = {
  /** La ruta completa tal como existe en RTDB, ej: "marisquerias/el-arrecife" */
  ruta_negocio: string;
  /** El segmento final de la ruta: identifica el negocio, ej: "el-arrecife" */
  negocio_id: string;
  /** El penúltimo segmento de la ruta: categoría del negocio, ej: "marisquerias" */
  categoria_id: string;
  /** El contexto superior a categoria_id, puede ser vacío, ej: "nicho" o "" */
  contexto_path: string;
  /** Versiones camelCase canónicas */
  rutaNegocio: string;
  negocioId: string;
  categoriaId: string;
  contextoPath: string;
  nichoId: string;
  negocioBaseId: string;
  /** Identidad canónica universal (ej: "puerto_libres" a partir de "marisqueria-puerto-libres") */
  negocio_id_canonico: string;
  negocioIdCanonico: string;
};

/**
 * Extrae y aisla el negocio_id canónico eliminando prefijos redundantes
 * de categoría (ej: "marisqueria-puerto-libres" -> "puerto_libres") y normalizando
 * a snake_case en minúsculas.
 */
export function extraer_negocio_id_canonico(rutaONegocioId: string, categoriaId?: string): string {
  if (!rutaONegocioId || typeof rutaONegocioId !== 'string') return '';
  const parts = rutaONegocioId.split('/').filter(Boolean);
  let segment = parts[parts.length - 1] || '';

  let categoria = categoriaId;
  if (!categoria && parts.length >= 2) {
    categoria = parts[parts.length - 2];
  }

  if (categoria) {
    const catLower = categoria.toLowerCase();
    const catSingular = catLower.endsWith('s') ? catLower.slice(0, -1) : catLower;
    const regex = new RegExp(`^(${catLower}|${catSingular})[-_]`, 'i');
    segment = segment.replace(regex, '');
  }

  return segment
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const extraerNegocioIdCanonico = extraer_negocio_id_canonico;

/**
 * Construye una ruta_negocio canónica de al menos 2 segmentos.
 * Solo para uso en bootstrap/tests. En producción, la ruta viene de RTDB.
 */
export function crear_ruta_negocio({
  contexto_path = '',
  categoria_id,
  negocio_id,
}: {
  contexto_path?: string;
  categoria_id: string;
  negocio_id: string;
}): string {
  if (contexto_path) {
    return `${contexto_path}/${categoria_id}/${negocio_id}`;
  }
  return `${categoria_id}/${negocio_id}`;
}

export const crearRutaNegocio = crear_ruta_negocio;

/**
 * Valida que una ruta sea de al menos 2 segmentos no vacíos y no sea legacy.
 * Formato esperado: [...contexto]/{categoria}/{negocio}
 */
export function validar_ruta_negocio(valor: string): boolean {
  if (!valor || typeof valor !== 'string') return false;
  if (es_ruta_legacy(valor)) return false;
  const clean = valor.trim().replace(/^\/+|\/+$/g, '');
  if (!clean || clean === '.') return true; // Raíz canónica para Unidades Operativas dedicadas
  const parts = clean.split('/').filter(Boolean);
  return parts.length >= 2;
}

export const validarRutaNegocio = validar_ruta_negocio;

/**
 * Descompone una ruta_negocio de al menos 2 segmentos en su identidad estructurada.
 * Retorna null si el formato es inválido o es una ruta legacy.
 */
export function descomponer_ruta_negocio(ruta: string): IdentidadNegocio | null {
  if (!ruta || typeof ruta !== 'string' || es_ruta_legacy(ruta)) return null;
  const parts = ruta.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const negocio_id = parts[parts.length - 1];
  let categoria_id = parts[parts.length - 2];
  let contexto_path = parts.slice(0, parts.length - 2).join('/');

  if (categoria_id === "negocio" && parts.length >= 3) {
    categoria_id = parts[parts.length - 3];
    contexto_path = parts.slice(0, parts.length - 3).join('/');
  }
  const negocio_id_canonico = extraer_negocio_id_canonico(negocio_id, categoria_id);

  return {
    ruta_negocio: ruta,
    negocio_id,
    categoria_id,
    contexto_path,
    rutaNegocio: ruta,
    negocioId: negocio_id,
    categoriaId: categoria_id,
    contextoPath: contexto_path,
    nichoId: categoria_id,
    negocioBaseId: negocio_id,
    negocio_id_canonico,
    negocioIdCanonico: negocio_id_canonico,
  };
}

export const descomponerRutaNegocio = descomponer_ruta_negocio;

/** Detecta rutas legacy que no deben usarse en producción. */
export function es_ruta_legacy(ruta: string): boolean {
  return typeof ruta === 'string' && ruta.startsWith('restaurantero');
}

export const esRutaLegacy = es_ruta_legacy;

/**
 * Resuelve el nombre visible y legible del negocio a partir de su ID, ruta o configuración.
 * Mapea identificadores conocidos como 'mpl' a 'Marisquería Puerto Libres'.
 */
export function resolver_nombre_negocio({
  nombreConfig,
  negocioId,
  rutaNegocio,
  accessCode,
}: {
  nombreConfig?: string | null;
  negocioId?: string | null;
  rutaNegocio?: string | null;
  accessCode?: string | null;
}): string {
  if (nombreConfig && typeof nombreConfig === 'string' && nombreConfig.trim()) {
    return nombreConfig.trim();
  }

  const idFromPath = (negocioId || '').split('/').pop() || '';
  const idLower = idFromPath.toLowerCase();
  const rutaLower = (rutaNegocio || '').toLowerCase();
  const codeUpper = (accessCode || '').toUpperCase();

  // Mapeo canónico: MPL / Puerto Libres -> Marisquería Puerto Libres
  if (
    idLower === 'mpl' ||
    idLower === 'marisqueria-mpl' ||
    idLower.includes('puerto-libres') ||
    idLower.includes('puerto_libres') ||
    rutaLower.includes('/mpl') ||
    rutaLower.endsWith('/mpl') ||
    rutaLower.includes('puerto-libres') ||
    rutaLower.includes('puerto_libres') ||
    codeUpper.includes('MPL')
  ) {
    return 'Marisquería Puerto Libres';
  }

  const esMarisqueria =
    /(?:^|\/)marisquerias?(?:\/|$)/i.test(rutaNegocio || '') ||
    rutaLower.includes('marisqueria') ||
    idLower.includes('marisqueria');

  const base = idFromPath
    .replace(/^marisquerias?[-_]/i, '')
    .replace(/[-_]/g, ' ')
    .trim();

  const titleCase = base.replace(/\b\w/g, (c: string) => c.toUpperCase());
  if (!titleCase) return 'Mi Negocio';

  return esMarisqueria && !titleCase.toLowerCase().includes('marisquer')
    ? `Marisquería ${titleCase}`
    : titleCase;
}

export const resolverNombreNegocio = resolver_nombre_negocio;

/**
 * 🗄️ LOS 9 CAJONES CANÓNICOS DE DB-RTDB-UNIDAD
 *
 * 1. menu
 * 2. inventario
 * 3. mesas
 * 4. mesas_pendientes
 * 5. pedidos
 * 6. ventas
 * 7. reparto_ajustes
 * 8. tickets
 * 9. dispositivos
 */
export type CajonOperativo =
  | 'menu'
  | 'inventario'
  | 'mesas'
  | 'mesas_pendientes'
  | 'pedidos'
  | 'ventas'
  | 'reparto_ajustes'
  | 'tickets'
  | 'dispositivos';

export const CAJONES_CANONICOS: readonly CajonOperativo[] = [
  'menu',
  'inventario',
  'mesas',
  'mesas_pendientes',
  'pedidos',
  'ventas',
  'reparto_ajustes',
  'tickets',
  'dispositivos',
] as const;

export function resolver_ruta_cajon(
  rutaNegocio: string,
  cajon: CajonOperativo,
  subruta?: string,
  dormidos?: readonly CajonOperativo[] | { cajones?: readonly CajonOperativo[] } | null
): string {
  assertCajonActivo(cajon, dormidos);
  const cleanRuta = (rutaNegocio || '').trim().replace(/^\/+|\/+$/g, '');
  // Si la ruta está vacía o es '.', o se opera sobre una RTDB dedicada a nivel raíz:
  const base = !cleanRuta || cleanRuta === '.' ? cajon : `${cleanRuta}/${cajon}`;
  return subruta ? `${base}/${subruta}` : base;
}

export const resolverRutaCajon = resolver_ruta_cajon;

let proveedorCajonesDormidos:
  | (() => readonly CajonOperativo[] | { cajones?: readonly CajonOperativo[] } | null | undefined)
  | null = null;

export function registrarProveedorCajonesDormidos(
  proveedor: () =>
    | readonly CajonOperativo[]
    | { cajones?: readonly CajonOperativo[] }
    | null
    | undefined
): void {
  proveedorCajonesDormidos = proveedor;
}

/**
 * 🛡️ GUARD DE CAJONES DORMIDOS
 * Comprueba si un cajón está dormido en el EstadoEncendido del negocio.
 */
export function esCajonDormido(
  cajon: CajonOperativo,
  dormidos?: readonly CajonOperativo[] | { cajones?: readonly CajonOperativo[] } | null
): boolean {
  const fuente = dormidos !== undefined ? dormidos : proveedorCajonesDormidos?.();
  if (!fuente) return false;
  const lista = Array.isArray(fuente)
    ? fuente
    : 'cajones' in fuente && Array.isArray(fuente.cajones)
      ? fuente.cajones
      : undefined;
  return Array.isArray(lista) && lista.includes(cajon);
}

export function assertCajonActivo(
  cajon: CajonOperativo,
  dormidos?: readonly CajonOperativo[] | { cajones?: readonly CajonOperativo[] } | null,
  opciones?: { hidratacionCompleta?: boolean }
): void {
  if (opciones?.hidratacionCompleta === false) {
    return;
  }
  if (esCajonDormido(cajon, dormidos)) {
    throw new Error(
      `Acceso denegado: El cajón '${cajon}' está dormido para este negocio según el EstadoEncendido.`
    );
  }
}

export const rutaMenu = (rutaNegocio: string, sub?: string) =>
  resolver_ruta_cajon(rutaNegocio, 'menu', sub);
export const rutaInventario = (rutaNegocio: string, sub?: string) =>
  resolver_ruta_cajon(rutaNegocio, 'inventario', sub);
export const rutaMesas = (rutaNegocio: string, sub?: string) =>
  resolver_ruta_cajon(rutaNegocio, 'mesas', sub);
export const rutaMesasPendientes = (rutaNegocio: string, sub?: string) =>
  resolver_ruta_cajon(rutaNegocio, 'mesas_pendientes', sub);
export const rutaPedidos = (rutaNegocio: string, sub?: string) =>
  resolver_ruta_cajon(rutaNegocio, 'pedidos', sub);
export const rutaVentas = (rutaNegocio: string, sub?: string) =>
  resolver_ruta_cajon(rutaNegocio, 'ventas', sub);
export const rutaRepartoAjustes = (rutaNegocio: string, sub?: string) =>
  resolver_ruta_cajon(rutaNegocio, 'reparto_ajustes', sub);
export const rutaTickets = (rutaNegocio: string, sub?: string) =>
  resolver_ruta_cajon(rutaNegocio, 'tickets', sub);
export const rutaDispositivos = (rutaNegocio: string, sub?: string) =>
  resolver_ruta_cajon(rutaNegocio, 'dispositivos', sub);

export const RUTAS = {
  AUTH: {
    LOGIN: '/(auth)/access',
    RECOVERY: '/(auth)/recovery',
  },
  ROLES: {
    SELECTOR: '/_role/roles',
    MESERO: '/_role/mesero',
    COCINA: '/_role/cocina',
    ADMIN: '/_role/admin/dashboard',
    VENTA_CRUDO: '/_role/venta-crudo',
    INVENTARIO: '/_role/inventory',
    REPARTIDOR: '/_role/repart',
    ADMIN_DASHBOARD: '/_role/admin/dashboard',
  },
  PRINTER: '/printer',
  INICIO: '/index',
} as const;

export type RutaApp = (typeof RUTAS)[keyof typeof RUTAS][keyof (typeof RUTAS)[keyof typeof RUTAS]];
