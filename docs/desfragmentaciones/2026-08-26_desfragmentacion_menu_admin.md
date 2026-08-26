# Desfragmentación: módulo Menú (rol Administrador)

**Fecha/hora:** 2026-08-26 05:00 UTC (inicio; documento vivo, se actualiza en cada fase)
**Ámbito:** arquitectura Roles → Administrador → Menú.
**Territorio intervenido:** solo el módulo Menú del rol Administrador.
**Sesión de orquestación:** `2026-08-25_admin_menu` (ACTIVA).

---

## 1. Mapa real del bloque (capas)

### 1.1 Capa visual

- `src/ui/roles/administrador/menu/AdminMenuScreen.tsx` (1063 líneas): pantalla de gestión
  de menú (categorías, productos, activación, recetas, variantes).
- Bloques de menú dispersos en `src/ui/bloques/`: `menu/CategorySidebar`, `menu/ProductCard`,
  `menu/VariantChip`, `menu/CollapsibleSection`, `menu/MenuLayout` (huérfana),
  `RecipeEditor`, `VariantEditor`, `VariantsModal` (compartida con Mesero),
  `ProductPickerOverlay` (compartida con Mesero).
- Primitivos/productos: `src/ui/primitivos/productos/*` y `src/ui/bloques/productos/MallaProductos`
  (sin consumidores detectados; en verificación).

### 1.2 Capa de código / lógica

- `src/capacidades/menu/useMenuManagement.ts` (423 líneas) + `index.ts`.
- `src/capacidades/admin/menuSafety.ts` (compartida con capacidades/menu).
- `src/capacidades/admin/useAdminTools.ts` (sin consumidores; en verificación).
- Persistencia: `src/sistema/persistencia/menu.repo.ts` (616 líneas) — **compartida** con
  POS (`useMostradorPro`, `usePOS`), mostrador y mesero (`rules.ts`); no se apropia.

### 1.3 Capa RTDB

- Nodo `marisquerias/<tenant>/menu/{categorias, productos, productos_index}`.
- Esquema a inventariar (tarea M2): campos de categoría y producto, visibilidad,
  variantes, receta e índices.

### 1.4 Capa experiencia de usuario / contexto

- Flujo Admin → Menú → Mesero (el menú administrado se publica vía store central y lo
  consume el Mesero). Pendiente de confirmación de coherencia (tareas M1–M3).

---

## 2. Registro de transformaciones (fase: reunión "caja")

| # | Origen | Transformación | Destino |
|---|---|---|---|
| 1 | `ui/bloques/menu/CategorySidebar.tsx` | Movido y renombrado a `BarraCategorias` | `ui/roles/administrador/menu/bloques/BarraCategorias.tsx` |
| 2 | `ui/bloques/menu/ProductCard.tsx` | Movido y renombrado a `TarjetaProducto` | `ui/roles/administrador/menu/bloques/TarjetaProducto.tsx` |
| 3 | `ui/bloques/menu/VariantChip.tsx` | Movido y renombrado a `FichaVariante` | `ui/roles/administrador/menu/bloques/FichaVariante.tsx` |
| 4 | `ui/bloques/menu/CollapsibleSection.tsx` | Movido y renombrado a `SeccionDesplegable` | `ui/roles/administrador/menu/bloques/SeccionDesplegable.tsx` |
| 5 | `ui/bloques/RecipeEditor.tsx` | Movido y renombrado a `EditorReceta` | `ui/roles/administrador/menu/editores/EditorReceta.tsx` |
| 6 | `ui/bloques/VariantEditor.tsx` | Movido y renombrado a `EditorVariantes` | `ui/roles/administrador/menu/editores/EditorVariantes.tsx` |
| 7 | `ui/index.ts` | Ajustado: retirados `RecipeEditor` y `VariantEditor` del barril | — |
| 8 | `ui/roles/administrador/menu/AdminMenuScreen.tsx` | Renombrado a `PantallaMenuAdmin`; tipos a español (`PropsPantallaMenuAdmin`, `EtiquetasMenu`, `ETIQUETAS_MENU_POR_DEFECTO`) | `ui/roles/administrador/menu/PantallaMenuAdmin.tsx` |
| 9 | `capacidades/menu/useMenuManagement.ts` | Renombrado a `useGestionMenu` | `capacidades/menu/useGestionMenu.ts` |
| 10 | `composicion/registroPantallas.ts` | Actualizado a `PantallaMenuAdmin` (clave `admin_menu` intacta) | — |

**Piezas compartidas observadas (no reorganizadas):** `VariantsModal`, `ProductPickerOverlay`
(con Mesero), `menu.repo.ts` (persistencia), `menuSafety` (capacidades/menu).

**Candidatos a eliminar (en verificación, tarea M4):** `MenuLayout.tsx`, `MallaProductos.tsx`,
`primitivos/productos/*`, `useAdminTools.ts`.

---

## 3. Estructura resultante (en construcción)

```text
src/ui/roles/administrador/menu/
    AdminMenuScreen.tsx        ← será renombrada/desfragmentada
    bloques/                    ← reunidas desde ui/bloques/menu
        CategorySidebar.tsx
        CollapsibleSection.tsx
        ProductCard.tsx
        VariantChip.tsx
    editores/                   ← reunidas desde ui/bloques
        RecipeEditor.tsx
        VariantEditor.tsx

src/capacidades/menu/
    useMenuManagement.ts        ← será renombrada a español
    index.ts
```

## 4. Relaciones reconstruidas

- `AdminMenuScreen` importa desde `./bloques/*` y `./editores/*` (interno del módulo).
- `VariantEditor` importa `../bloques/CollapsibleSection` y `../bloques/VariantChip`.
- `ui/index.ts` ya no exporta editores exclusivos del módulo.

## 5. Pendientes

- Absorber informes de M1–M5 (consumidores, comparación histórica, duplicación/contratos,
  huérfanos, línea base).
- Decidir eliminación de huérfanos confirmados.
- Renombrar a español y desfragmentar `AdminMenuScreen`.
- Documentar relación con piezas compartidas (Mesero).

## 6. Evidencia de verificación

- `npx tsc --noEmit` → 0 errores tras los movimientos.
