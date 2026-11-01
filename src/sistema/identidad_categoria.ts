/**
 * Identidad de la categoría que sirve esta aplicación.
 *
 * ÚNICO ARCHIVO QUE CAMBIA AL INSTANCIAR UNA NUEVA CATEGORÍA DESDE LA PLANTILLA BASE.
 */
export const CATEGORIA_APP = {
  slug: 'marisquerias',
  id: '01',
  nombre: 'Marisquerías',
  nombre_negocio_defecto: 'Marisquería',
} as const;

/** Indica si la identidad de categoría de un código de acceso pertenece a esta app. */
export function categoria_pertenece_a_app(slug?: string | null, id?: string | null): boolean {
  const s = (slug || '').trim().toLowerCase();
  if (s) return s === CATEGORIA_APP.slug;
  const i = (id || '').trim();
  return i === CATEGORIA_APP.id;
}
