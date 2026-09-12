# Tarea T-M1-01 — Inventario de consumidores y referencias del territorio Menú

| Campo | Valor |
|---|---|
| ID | `T-M1-01` |
| VERSION | `1` |
| Sesión | `2026-08-25_admin_menu` |
| Agente | M1 |
| Publicada | `2026-08-26 05:00 UTC` |
| ESTADO | NUEVA |
| SELLO | |

## 1. Objetivo
Producir una tabla **pieza → consumidores** del territorio Menú/Administrador, clasificando
cada pieza como EXCLUSIVA_MENU, COMPARTIDA o HUERFANA_CANDIDATA, con evidencia (archivo:línea).

## 2. Contexto mínimo
Se está desfragmentando el módulo Menú del rol Administrador. Antes de mover piezas hay que
saber quién consume qué. La rama es `rama-2`; ignora la rama `main` y las sesiones históricas.

## 3. Ruta inicial
`src/ui/roles/administrador/menu/AdminMenuScreen.tsx`

## 4. Alcance (piezas a inventariar)
- `src/ui/roles/administrador/menu/AdminMenuScreen.tsx`
- `src/capacidades/menu/useMenuManagement.ts` y `src/capacidades/menu/index.ts`
- `src/ui/bloques/menu/*` (CategorySidebar, CollapsibleSection, MenuLayout, ProductCard, VariantChip)
- `src/ui/bloques/RecipeEditor.tsx`, `src/ui/bloques/VariantEditor.tsx`
- `src/ui/bloques/VariantsModal.tsx`, `src/ui/bloques/ProductPickerOverlay.tsx`
- `src/ui/bloques/productos/MallaProductos.tsx`
- `src/ui/primitivos/productos/*` (ControlCantidad, EtiquetaPrecio, InsigniaEstado, TarjetaBase)
- `src/capacidades/admin/menuSafety.ts`, `src/capacidades/admin/useAdminTools.ts`

## 5. Límites
Solo lectura. No muevas, renombres ni edites código. No toques `sistema/persistencia`
(es infraestructura compartida, se documenta su relación pero no se inventaría).

## 6. Qué verificar
Para cada pieza: sus símbolos exportados, y **todos** los archivos que la importan
(usa `grep -rn` sobre `src` y `app`, y `git grep`). Distingue consumo real de comentario.

## 7. Evidencia que debe producir
Tabla markdown: `| pieza | símbolos | consumidores (archivo:línea) | clasificación |`.
Al final, dos listas: (a) piezas EXCLUSIVAS del módulo Menú/Admin, (b) piezas COMPARTIDAS
con otros roles/módulos (indica con cuál), (c) piezas sin ningún consumidor detectado.

## 8. Puede modificar
Ninguno. Solo tu carpeta `M1/`.

## 9. No puede modificar
Código, `CENTRAL/`, otras carpetas M*, `EVENTOS.json`, `ACTIVACIONES.json`, `MANIFIESTO.md`.

## 10. Qué debe documentar
El informe con la tabla y las listas de clasificación.

## 11. Cuándo hacer commit
Un commit al entregar el informe: `docs(multimodelo/M1): inventario de consumidores menú`.

## 12. Qué debe reportar
La tabla completa y las tres listas de clasificación con evidencia.

## 13. Condición de terminado
Cada pieza del alcance tiene clasificación con al menos una evidencia de consumo o la
afirmación explícita "sin consumidores" respaldada por la búsqueda.

## 14. Si encuentra una contradicción
Reportarla con evidencia; no asumas.

## 15. Si la pieza ya fue movida
Verifica rastro (git log --follow, MIGRACION.md) y continúa desde el destino real.

## 16. Si necesita salir del límite
Detente y repórtalo en el informe.
