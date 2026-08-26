# Huella local de migración — ui/bloques

**Fecha:** 2026-08-26 UTC
**Registro consolidado:** `docs/desfragmentaciones/2026-08-26_desfragmentacion_menu_admin.md`

Durante la desfragmentación del módulo Menú (rol Administrador), se reunieron en
`src/ui/roles/administrador/menu/` piezas exclusivas de ese módulo que vivían aquí:

| Origen | Transformación | Destino |
|---|---|---|
| `ui/bloques/menu/CategorySidebar.tsx` | Movido y renombrado a `BarraCategorias` | `ui/roles/administrador/menu/bloques/BarraCategorias.tsx` |
| `ui/bloques/menu/ProductCard.tsx` | Movido y renombrado a `TarjetaProducto` | `ui/roles/administrador/menu/bloques/TarjetaProducto.tsx` |
| `ui/bloques/menu/VariantChip.tsx` | Movido y renombrado a `FichaVariante` | `ui/roles/administrador/menu/bloques/FichaVariante.tsx` |
| `ui/bloques/menu/CollapsibleSection.tsx` | Movido y renombrado a `SeccionDesplegable` | `ui/roles/administrador/menu/bloques/SeccionDesplegable.tsx` |
| `ui/bloques/RecipeEditor.tsx` | Movido y renombrado a `EditorReceta` | `ui/roles/administrador/menu/editores/EditorReceta.tsx` |
| `ui/bloques/VariantEditor.tsx` | Movido y renombrado a `EditorVariantes` | `ui/roles/administrador/menu/editores/EditorVariantes.tsx` |

**Permanecen aquí (compartidas o pendientes):**

- `ui/bloques/menu/MenuLayout.tsx` — sin consumidores detectados; candidato a
  eliminación pendiente de confirmación (tarea M4).
- `ui/bloques/VariantsModal.tsx` y `ui/bloques/ProductPickerOverlay.tsx` — **compartidas
  con el rol Mesero**; no se reorganizan en este proceso.
- El resto de `ui/bloques/` no pertenece al territorio Menú.

**Impacto en barriles:** `ui/index.ts` dejó de reexportar `RecipeEditor` y `VariantEditor`
(ahora son internos del módulo Menú).
