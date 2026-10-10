# CONTRATOS Y TIPOS: MENU Y VARIANTES

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 04_menu_y_variantes

## 1. FIRMAS CANONICAS

```typescript
useGestionMenu({ db: Database; rutaNegocio: string }): GestionMenu;

// Producto: { id, nombre, precio, categoria, variantes, receta }
// Categoria: { id, nombre }
// Variante: { clave: string; opciones: string[]; deltaPrecio?: Record<string, number> }
// Receta: { insumos: Record<string, number> }  // insumo -> cantidad en unidad canonica
```

## 2. NORMALIZACION LEXICA

```typescript
canonicalizeString(input: any): string; // lower + sin diacriticos + espacios colapsados
canonicalizeKey(input: any): string;    // -> [a-z0-9_] sin extremos
coerceUnidad(input: any): 'kg'|'g'|'l'|'ml'|'pza'|'caja';
```

## 3. INVARIANTES

- Producto valido requiere `nombre` y `precio >= 0` y `categoria`.
- Las variantes se almacenan como `Record<string, string>` plano (una opcion por clave).
- El descuento de inventario es exacto por receta si esta existe.
- Cualquier clave de producto/categoria se canonicaliza con `canonicalizeKey`.

## 4. FLUJO DE DATOS

ModalProducto -> useGestionMenu -> menu.repo (RTDB {rutaNegocio}/menu) -> SQLite menu_productos/menu_categorias (offline espejo)
