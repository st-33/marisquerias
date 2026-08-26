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
| 11 | `ui/bloques/menu/MenuLayout.tsx` | **Eliminado** (sin consumidores) | — |
| 12 | `ui/bloques/productos/MallaProductos.tsx` + test | **Eliminado** (sustituido; sin consumidores) | — |
| 13 | `ui/primitivos/productos/*` (TarjetaBase, ControlCantidad, EtiquetaPrecio, InsigniaEstado) + test | **Eliminado** (sin consumidores) | — |
| 14 | `capacidades/admin/useAdminTools.ts` | **Eliminado** (sin consumidores; reparación obsoleta) | — |
| 15 | `PantallaMenuAdmin` — lista de productos inline | Extraída a `ListaProductos` | `componentes/ListaProductos.tsx` |
| 16 | `PantallaMenuAdmin` — modal de categoría inline | Extraído a `ModalNuevaCategoria` | `componentes/ModalNuevaCategoria.tsx` |
| 17 | `PantallaMenuAdmin` — modal de producto inline (3 pestañas) | Extraído a `ModalProducto` | `componentes/ModalProducto.tsx` |
| 18 | `PantallaMenuAdmin` — tipos/helpers de formulario | Extraídos a lógica pura | `logica/formularioProducto.ts` |
| 19 | `PantallaMenuAdmin` — etiquetas configurables | Extraídas | `logica/etiquetas.ts` |

**Piezas compartidas observadas (no reorganizadas):** `VariantsModal`, `ProductPickerOverlay`
(con Mesero), `menu.repo.ts` (persistencia), `menuSafety` (capacidades/menu).

---

## 3. Estructura resultante

```text
src/ui/roles/administrador/menu/
    PantallaMenuAdmin.tsx            ← composición (antes AdminMenuScreen, 1063→~340 líneas)
    bloques/                         ← reunidas desde ui/bloques/menu
        BarraCategorias.tsx          (← CategorySidebar)
        TarjetaProducto.tsx          (← ProductCard)
        FichaVariante.tsx            (← VariantChip)
        SeccionDesplegable.tsx       (← CollapsibleSection)
    componentes/                     ← extraídas de la pantalla
        ListaProductos.tsx
        ModalNuevaCategoria.tsx
        ModalProducto.tsx            (pestañas Básico/Variantes/Receta)
    editores/                        ← reunidas desde ui/bloques
        EditorReceta.tsx             (← RecipeEditor)
        EditorVariantes.tsx          (← VariantEditor)
    logica/                          ← lógica pura extraída de la pantalla
        formularioProducto.ts        (FormState, mappers)
        etiquetas.ts                 (EtiquetasMenu)

src/capacidades/menu/
    useGestionMenu.ts                (← useMenuManagement)
    index.ts
```

## 4. Relaciones reconstruidas

- `PantallaMenuAdmin` compone: `bloques/*` + `componentes/*` + `editores/*` + `logica/*`.
- `EditorVariantes` usa `../bloques/SeccionDesplegable` y `../bloques/FichaVariante`.
- `ModalProducto` delega en `EditorVariantes` y `EditorReceta`.
- `ListaProductos` delega en `TarjetaProducto`.
- `ui/index.ts` ya no exporta editores exclusivos del módulo.
- Piezas compartidas con Mesero (`VariantsModal`, `ProductPickerOverlay`, `menu.repo.ts`,
  `menuSafety`) permanecen fuera del módulo; relación documentada, no apropiada.

## 5. Pendientes

- Absorber informes de M1–M5 (consumidores, comparación histórica, duplicación/contratos,
  línea base). Los huérfanos ya se eliminaron con evidencia propia (ítems 11–14).
- Documentar relación con piezas compartidas (Mesero) cuando llegue M1.

## 6. Evidencia de verificación

- `npx tsc --noEmit` → 0 errores.
- `npm test` → 19 suites, 102 pruebas verdes.
- `eslint` sobre el módulo → 0 errores (1 warning preexistente de exhaustive-deps).
