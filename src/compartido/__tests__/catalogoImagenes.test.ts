import {
  obtenerImagenProducto,
  obtenerStickerProducto,
  MAPA_IMAGENES_PRODUCTOS,
} from '../catalogoImagenes';

describe('Catálogo Canónico de Imágenes Nativas (Offline)', () => {
  it('resuelve imagen por clave exacta', () => {
    const img = obtenerImagenProducto('xx_lager');
    expect(img).toBeDefined();
    expect(img).toBe(MAPA_IMAGENES_PRODUCTOS.xx_lager);
  });

  it('resuelve imagen por slug normalizado del producto cuando no hay id explícito', () => {
    const img = obtenerImagenProducto(undefined, 'XX Lager');
    expect(img).toBeDefined();
    expect(img).toBe(MAPA_IMAGENES_PRODUCTOS.xx_lager);
  });

  it('retorna null cuando no hay ninguna coincidencia', () => {
    const img = obtenerImagenProducto('item_desconocido', 'Sopa de Letras');
    expect(img).toBeNull();
  });

  it('mantiene compatibilidad con el alias obtenerStickerProducto', () => {
    const img = obtenerStickerProducto('xx_lager');
    expect(img).toBe(MAPA_IMAGENES_PRODUCTOS.xx_lager);
  });
});
