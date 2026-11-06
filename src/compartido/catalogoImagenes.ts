/**
 * 🖼️ CATÁLOGO CANÓNICO DE IMÁGENES NATIVAS (Recursos locales estáticos)
 * Provee resolución O(1) de imágenes locales empaquetadas en el APK.
 * 100% Offline, cero latencia de red y empaquetado directo por Metro.
 */

export const MAPA_IMAGENES_PRODUCTOS: Record<string, any> = {
  // Recursos locales de la categoría
  xx_lager: require('../../assets/images/bebida/xx_lager.png'),
};

/**
 * Resuelve el asset de imagen correspondiente a un producto.
 * Fórmula plantilla agnóstica: busca por imagen_id declarado o por slug normalizado.
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
    const slug = nombreProducto.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
    if (MAPA_IMAGENES_PRODUCTOS[slug]) {
      return MAPA_IMAGENES_PRODUCTOS[slug];
    }
  }

  return null;
}

