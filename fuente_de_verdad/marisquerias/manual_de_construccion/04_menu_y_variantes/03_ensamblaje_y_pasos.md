# ENSAMBLAJE Y PASOS: MENU Y VARIANTES
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

## PASO 01: Persistencia del menu
### ESPECIFICACION
- Se ensambla `useGestionMenu({ db, rutaNegocio })` que persiste en RTDB `{rutaNegocio}/menu` y replica a `menu_productos`/`menu_categorias` en SQLite (ver `02_contratos_y_tipos.md` §4).
- El flujo `ModalProducto -> useGestionMenu -> menu.repo -> SQLite espejo` se mantiene en ese orden.
- El espejo offline conserva el menu sin red; no se pierde catalogo ante caida de conexion.

## PASO 02: Definicion del producto
### ESPECIFICACION
- Se ensambla el producto `{ id, nombre, precio, categoria, variantes, receta }` respetando `nombre` y `categoria` obligatorios y `precio >= 0`.
- Un producto invalido (nombre vacío o precio negativo) no se persiste.
- El `id` de producto se genera o normaliza con `canonicalizeKey` antes de almacenarse.

## PASO 03: Categorias del menu
### ESPECIFICACION
- Se ensambla `Categoria { id, nombre }` cuya clave se canonicaliza con `canonicalizeKey` (a `[a-z0-9_]` sin extremos).
- Todo producto referencia una categoria existente; no se permite categoria huerfana en el catalogo.
- El reordenado o renombrado de categoria no rompe la relacion producto-categoria.

## PASO 04: Variantes del producto
### ESPECIFICACION
- Se ensambla `Variante { clave, opciones[], deltaPrecio? }` almacenada en el producto como `Record<string, string>` plano (una opcion por clave).
- Los `deltaPrecio` opcionales ajustan el precio por opcion elegida sin alterar el precio base.
- `canonicalizeString` (lower, sin diacriticos, espacios colapsados) normaliza opciones para comparacion estable.

## PASO 05: Recetas e insumos
### ESPECIFICACION
- Se ensambla `Receta { insumos: Record<string, number> }` con cada insumo en unidad canonica (`coerceUnidad`).
- El descuento de inventario es exacto por receta cuando la receta existe; sin receta no hay descuento automatico.
- `coerceUnidad` normaliza alias de unidad a `kg | g | l | ml | pza | caja` antes de persistir.
