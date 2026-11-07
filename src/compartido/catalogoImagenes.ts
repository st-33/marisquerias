/**
 * 🖼️ CATÁLOGO CANÓNICO DE IMÁGENES NATIVAS (Recursos locales estáticos)
 * Provee resolución O(1) de imágenes locales empaquetadas en el APK.
 * 100% Offline, cero latencia de red y empaquetado directo por Metro.
 *
 * Estructura canónica de origen:
 * - Artículos de inventario:
 *   - assets/images/inventario/bebidas/
 *   - assets/images/inventario/postres/ (y compatibilidad con postre/)
 *   - assets/images/inventario/insumos/
 * - Platillos del libro de cocina:
 *   - assets/images/platillos/
 */

export type OrigenCatalogoImagen = 'inventario' | 'platillos';
export type SubcarpetaImagenInventario = 'bebidas' | 'postres' | 'insumos';

export interface EntradaCatalogoImagen {
  id: string;
  etiqueta: string;
  origen: OrigenCatalogoImagen;
  subcarpeta?: SubcarpetaImagenInventario;
  asset: any;
  aliases?: string[];
}

export const CATALOGO_IMAGENES_INVENTARIO: readonly EntradaCatalogoImagen[] = [
  {
    id: 'xx_lager',
    etiqueta: 'XX Lager',
    origen: 'inventario',
    subcarpeta: 'bebidas',
    asset: require('../../assets/images/inventario/bebidas/xx_lager.png'),
    aliases: ['cerveza_xx_lager', 'dos_equis', 'xx'],
  },
  {
    id: 'boing_guayava',
    etiqueta: 'Boing Guayaba',
    origen: 'inventario',
    subcarpeta: 'bebidas',
    asset: require('../../assets/images/inventario/bebidas/BOING_GUAYAVA.png'),
    aliases: ['boing_guayaba', 'jugo_guayaba'],
  },
  {
    id: 'boing_mango',
    etiqueta: 'Boing Mango',
    origen: 'inventario',
    subcarpeta: 'bebidas',
    asset: require('../../assets/images/inventario/bebidas/BOING_MANGO.png'),
    aliases: ['jugo_mango'],
  },
  {
    id: 'boing_tamarindo',
    etiqueta: 'Boing Tamarindo',
    origen: 'inventario',
    subcarpeta: 'bebidas',
    asset: require('../../assets/images/inventario/bebidas/BOING_TAMARINDO.png'),
    aliases: ['jugo_tamarindo'],
  },
  {
    id: 'boing_uva',
    etiqueta: 'Boing Uva',
    origen: 'inventario',
    subcarpeta: 'bebidas',
    asset: require('../../assets/images/inventario/bebidas/BOING_UVA.png'),
    aliases: ['jugo_uva'],
  },
  {
    id: 'coca_cola',
    etiqueta: 'Coca-Cola',
    origen: 'inventario',
    subcarpeta: 'bebidas',
    asset: require('../../assets/images/inventario/bebidas/COCA_COLA.png'),
    aliases: ['cocacola', 'refresco_coca_cola', 'coca'],
  },
  {
    id: 'sol',
    etiqueta: 'Cerveza Sol',
    origen: 'inventario',
    subcarpeta: 'bebidas',
    asset: require('../../assets/images/inventario/bebidas/SOL.png'),
    aliases: ['cerveza_sol'],
  },
  {
    id: 'victoria',
    etiqueta: 'Cerveza Victoria',
    origen: 'inventario',
    subcarpeta: 'bebidas',
    asset: require('../../assets/images/inventario/bebidas/VICTORIA.png'),
    aliases: ['cerveza_victoria'],
  },
] as const;

export const CATALOGO_IMAGENES_PLATILLOS: readonly EntradaCatalogoImagen[] = [] as const;

export const MAPA_IMAGENES_INVENTARIO: Record<string, any> = {};
export const MAPA_IMAGENES_PLATILLOS: Record<string, any> = {};
export const MAPA_IMAGENES_PRODUCTOS: Record<string, any> = {};

function normalizarClaveImagen(valor: string): string {
  return valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

for (const entrada of CATALOGO_IMAGENES_INVENTARIO) {
  const clave = normalizarClaveImagen(entrada.id);
  MAPA_IMAGENES_INVENTARIO[clave] = entrada.asset;
  MAPA_IMAGENES_PRODUCTOS[clave] = entrada.asset;
  for (const alias of entrada.aliases || []) {
    const claveAlias = normalizarClaveImagen(alias);
    MAPA_IMAGENES_INVENTARIO[claveAlias] = entrada.asset;
    MAPA_IMAGENES_PRODUCTOS[claveAlias] = entrada.asset;
  }
}

for (const entrada of CATALOGO_IMAGENES_PLATILLOS) {
  const clave = normalizarClaveImagen(entrada.id);
  MAPA_IMAGENES_PLATILLOS[clave] = entrada.asset;
  MAPA_IMAGENES_PRODUCTOS[clave] = entrada.asset;
  for (const alias of entrada.aliases || []) {
    const claveAlias = normalizarClaveImagen(alias);
    MAPA_IMAGENES_PLATILLOS[claveAlias] = entrada.asset;
    MAPA_IMAGENES_PRODUCTOS[claveAlias] = entrada.asset;
  }
}

/**
 * Lista las opciones de imagen disponibles para un origen específico
 * ('inventario' en Administrador -> Inventario, o 'platillos' en Cocina -> Libro de platillos).
 */
export function listarImagenesPorOrigen(
  origen: OrigenCatalogoImagen,
  subcarpeta?: SubcarpetaImagenInventario
): readonly EntradaCatalogoImagen[] {
  if (origen === 'platillos') {
    return CATALOGO_IMAGENES_PLATILLOS;
  }
  if (!subcarpeta) {
    return CATALOGO_IMAGENES_INVENTARIO;
  }
  return CATALOGO_IMAGENES_INVENTARIO.filter((item) => item.subcarpeta === subcarpeta);
}

/**
 * Resuelve el asset de imagen correspondiente a un artículo de inventario o platillo.
 * Fórmula plantilla agnóstica: busca por imagenId declarado o por slug normalizado.
 */
export function obtenerImagenProducto(
  imagenId?: string | null,
  nombreProducto?: string | null,
  origenPreferido?: OrigenCatalogoImagen
): any | null {
  const mapaPrimario =
    origenPreferido === 'inventario'
      ? MAPA_IMAGENES_INVENTARIO
      : origenPreferido === 'platillos'
        ? MAPA_IMAGENES_PLATILLOS
        : MAPA_IMAGENES_PRODUCTOS;

  if (imagenId) {
    const clave = normalizarClaveImagen(imagenId);
    if (mapaPrimario[clave]) {
      return mapaPrimario[clave];
    }
    if (MAPA_IMAGENES_PRODUCTOS[clave]) {
      return MAPA_IMAGENES_PRODUCTOS[clave];
    }
  }

  if (nombreProducto) {
    const slug = normalizarClaveImagen(nombreProducto);
    if (mapaPrimario[slug]) {
      return mapaPrimario[slug];
    }
    if (MAPA_IMAGENES_PRODUCTOS[slug]) {
      return MAPA_IMAGENES_PRODUCTOS[slug];
    }
  }

  return null;
}
