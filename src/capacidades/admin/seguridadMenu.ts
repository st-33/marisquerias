export function validarProductoParaEliminar(
  id: string,
  productos: Record<string, unknown>
): string {
  const productoId = id.trim();
  if (!productoId) {
    throw new Error('Selecciona un producto válido');
  }
  if (!Object.prototype.hasOwnProperty.call(productos, productoId)) {
    throw new Error('El producto ya no existe o no está disponible');
  }

  return productoId;
}

export function estaFeatureAdminHabilitada(
  features: Record<string, boolean | undefined>,
  feature: string
): boolean {
  return features[feature] !== false;
}
