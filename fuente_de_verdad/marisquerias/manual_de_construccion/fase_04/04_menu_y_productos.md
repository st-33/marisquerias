# INSTRUCCION: MENU Y PRODUCTOS

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 04

## ORIGEN

- Terminos: PRODUCTO, VARIANTE, RECETA, CATEGORIA DE MENU, MENU.
- Formulas: (producto + variante + cantidad = partida) y (receta + produccion = descuento_inventario).
- Codigo real inspeccionado: `src/capacidades/menu/*`, `src/sistema/persistencia/menu.repo.ts`, `src/ui/roles/administrador/menu/*`.

## PASO 01: PERSISTENCIA DEL MENU

### ESPECIFICACION

- `src/sistema/persistencia/menu.repo.ts` declara el contrato de lectura y escritura del menu en la RTDB operacional.
- `src/capacidades/menu/useGestionMenu.ts` expone la logica de gestion del menu para el rol administrador.

## PASO 02: ESTRUCTURA DEL PRODUCTO

### ESPECIFICACION

- Un producto tiene: nombre, precio, categoria de menu, y variantes propias.
- `src/ui/roles/administrador/menu/componentes/ModalProducto.tsx` captura la informacion del producto.

## PASO 03: CATEGORIAS DE MENU

### ESPECIFICACION

- Las categorias de menu agrupan productos por afinidad de despacho (entradas, caldos, platos fuertes, bebidas).
- `BarraCategorias.tsx` y `ModalNuevaCategoria.tsx` gestionan las categorias.

## PASO 04: VARIANTES

### ESPECIFICACION

- `EditorVariantes.tsx` y `VariantsModal.tsx` administran las variantes (tamano, preparacion, presentacion) y su precio.

## PASO 05: RECETAS

### ESPECIFICACION

- `EditorReceta.tsx` define la receta del producto (insumos y cantidades) que habilita el descuento de inventario.
