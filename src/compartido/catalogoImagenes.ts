/**
 * 🖼️ CATÁLOGO CANÓNICO DE IMÁGENES NATIVAS (Recursos locales estáticos)
 * Provee resolución O(1) de imágenes locales empaquetadas en el APK.
 * 100% Offline, cero latencia de red y empaquetado directo por Metro.
 */

export const MAPA_IMAGENES_PRODUCTOS: Record<string, any> = {
  // Bebidas
  xx_lager: require('../../assets/images/bebida/xx_lager.png'),
  'dos equis': require('../../assets/images/bebida/xx_lager.png'),
  'xx': require('../../assets/images/bebida/xx_lager.png'),
  // Platillos y postres se agregan conforme el negocio incorpore sus fotos
};

/**
 * Resuelve el asset de imagen correspondiente a un producto.
 * Busca primero por clave exacta y luego por coincidencia parcial en el nombre.
 */
export function obtenerImagenProducto(
  imagenId?: string | null,
  nombreProducto?: string | null
): any | null {
  if (imagenId) {
    const clave = imagenId.toLowerCase().trim();
    if (MAPA_IMAGENES_PRODUCTOS[clave]) {
      return MAPA_IMAGENES_PRODUCTOS[clave];
    }
  }

  if (nombreProducto) {
    const normalizado = nombreProducto.toLowerCase().trim();
    for (const [clave, asset] of Object.entries(MAPA_IMAGENES_PRODUCTOS)) {
      if (normalizado.includes(clave)) {
        return asset;
      }
    }
  }

  return null;
}

// Alias de retrocompatibilidad
export const MAPA_STICKERS = MAPA_IMAGENES_PRODUCTOS;
export const obtenerStickerProducto = obtenerImagenProducto;
