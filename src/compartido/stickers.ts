/**
 * 🏷️ CATÁLOGO CANÓNICO DE STICKERS (Recursos locales estáticos)
 * Provee resolución O(1) de imágenes locales empaquetadas en el APK.
 * 100% Offline, cero latencia de red y empaquetado directo por Metro.
 */

export const MAPA_STICKERS: Record<string, any> = {
  xx_lager: require('../../assets/stickers/bebidas/xx_lager.png'),
  'dos equis': require('../../assets/stickers/bebidas/xx_lager.png'),
  'xx': require('../../assets/stickers/bebidas/xx_lager.png'),
};

/**
 * Resuelve el asset de sticker correspondiente a un producto.
 * Busca primero por clave exacta (sticker_id) y luego por coincidencia de nombre.
 */
export function obtenerStickerProducto(
  stickerId?: string | null,
  nombreProducto?: string | null
): any | null {
  if (stickerId) {
    const clave = stickerId.toLowerCase().trim();
    if (MAPA_STICKERS[clave]) {
      return MAPA_STICKERS[clave];
    }
  }

  if (nombreProducto) {
    const normalizado = nombreProducto.toLowerCase().trim();
    for (const [clave, asset] of Object.entries(MAPA_STICKERS)) {
      if (normalizado.includes(clave)) {
        return asset;
      }
    }
  }

  return null;
}
