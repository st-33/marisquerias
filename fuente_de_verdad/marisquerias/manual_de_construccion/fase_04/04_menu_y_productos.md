# INSTRUCCION: MENU Y PRODUCTOS

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 04

## ORIGEN

- Terminos: PRODUCTO, VARIANTE, RECETA, CATEGORIA DE MENU.
- Formulas: producto + variante + cantidad = partida; receta + produccion = descuento_inventario.
- Codigo real: `src/capacidades/menu/useGestionMenu.ts`, `src/sistema/persistencia/menu.repo.ts`, `src/logica/dominio/normalizers.ts`, `src/ui/roles/administrador/menu/*`.

## CONTRATO DE ENTRADA

- `useGestionMenu({ db: Database; rutaNegocio: string })` es el cerebro de gestion del menu.

## PASO 01: PERSISTENCIA DEL MENU

### ESPECIFICACION

- `menu.repo.ts` declara el contrato de lectura/escritura del catalogo en la RTDB operacional bajo `{rutaNegocio}/menu`.
- Toda escritura pasa por el repositorio; la UI no escribe la RTDB directamente.

## PASO 02: ESTRUCTURA DEL PRODUCTO

### ESPECIFICACION

- Producto: `{ id, nombre, precio, categoria, variantes, receta }`.
- `ModalProducto.tsx` captura la informacion y valida campos obligatorios: nombre y precio mayores o iguales a cero.

## PASO 03: CATEGORIAS DE MENU

### ESPECIFICACION

- Categoria: `{ id, nombre }` agrupa productos por afinidad de despacho.
- `BarraCategorias.tsx` y `ModalNuevaCategoria.tsx` gestionan el alta y orden.

## PASO 04: VARIANTES

### ESPECIFICACION

- Variante: `{ clave: string; opciones: string[]; deltaPrecio?: Record<string, number> }`.
- `EditorVariantes.tsx` y `VariantsModal.tsx` administran variantes y su delta de precio.
- Variantes se almacenan como `Record<string, string>` plano en el item (una opcion seleccionada por clave).

## PASO 05: RECETAS

### ESPECIFICACION

- Receta: `{ insumos: Record<string, number> }` (insumo -> cantidad en unidad canonica).
- `EditorReceta.tsx` define la receta que habilita el descuento de inventario.
- Normalizacion de unidades via `coerceUnidad` -> `'kg' | 'g' | 'l' | 'ml' | 'pza' | 'caja'`.

## CONTRATO DE SALIDA

- Producto valido tiene nombre, precio y categoria; las variantes y recetas opcionales pero, si existen, el descuento de inventario es exacto por receta; las claves se canonicalizan con `canonicalizeKey`.
