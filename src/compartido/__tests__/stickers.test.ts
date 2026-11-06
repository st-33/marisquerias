import { obtenerStickerProducto, MAPA_STICKERS } from '../stickers';

describe('Catálogo de Stickers', () => {
  it('resuelve sticker por id exacto', () => {
    const sticker = obtenerStickerProducto('xx_lager');
    expect(sticker).toBeDefined();
    expect(sticker).toBe(MAPA_STICKERS.xx_lager);
  });

  it('resuelve sticker por slug normalizado cuando no hay stickerId', () => {
    const sticker = obtenerStickerProducto(undefined, 'XX Lager');
    expect(sticker).toBeDefined();
    expect(sticker).toBe(MAPA_STICKERS.xx_lager);
  });

  it('retorna null cuando no hay coincidencia', () => {
    const sticker = obtenerStickerProducto('producto_inexistente', 'Platillo Desconocido');
    expect(sticker).toBeNull();
  });
});
