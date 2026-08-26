# Tarea T-M2-01 — Comparación histórica + inventario RTDB del menú

| Campo | Valor |
|---|---|
| ID | `T-M2-01` |
| VERSION | `1` |
| Sesión | `2026-08-25_admin_menu` |
| Agente | M2 |
| Publicada | `2026-08-26 05:00 UTC` |
| ESTADO | NUEVA |
| SELLO | |

## 1. Objetivo
Dos entregables independientes: (A) un diff de alto nivel entre el territorio Menú en
`rama-2` y la rama histórica `origin/manus/administracion-menu`; (B) el inventario del
esquema real del menú en la RTDB.

## 2. Contexto mínimo
La rama de trabajo es `rama-2`. Existe una rama remota `origin/manus/administracion-menu`
con trabajo previo de agentes sobre el mismo módulo; sirve como referencia, no como verdad.

## 3. Ruta inicial
`git fetch origin`; luego `rtdb_actualizada.json` (raíz del repo) para la RTDB.

## 4. Alcance
- Territorio Menú en `rama-2`: `src/ui/roles/administrador/menu`, `src/capacidades/menu`,
  `src/ui/bloques/menu`, `src/ui/bloques/RecipeEditor.tsx`, `VariantEditor.tsx`,
  `VariantsModal.tsx`, `ProductPickerOverlay.tsx`, `src/ui/bloques/productos`,
  `src/ui/primitivos/productos`, `src/capacidades/admin/menuSafety.ts`,
  `src/capacidades/admin/useAdminTools.ts`, `src/sistema/persistencia/menu.repo.ts`.
- RTDB: nodo `marisquerias/*/menu/` (categorias, productos, productos_index).

## 5. Límites
Solo lectura. No modifiques código ni hagas checkout destructivo. No reescribas ramas.

## 6. Qué verificar
(A) `git diff --stat origin/manus/administracion-menu..rama-2 -- <rutas del territorio>`
y qué conceptos aparecen/desaparecen. (B) campos reales de `categoria` y `producto`
en la RTDB (nombre, activo, precio, visible, variantes, receta, índices…).

## 7. Evidencia que debe producir
(A) tabla: `| archivo | estado en rama-2 | estado en manus/administracion-menu |` con notas
solo cuando difieran de forma relevante. (B) esquema de campos de menú en RTDB
(campo → ejemplo de valor tomado de `rtdb_actualizada.json`).

## 8. Puede modificar
Ninguno. Solo tu carpeta `M2/`.

## 9. No puede modificar
Código, `CENTRAL/`, otras carpetas M*, `EVENTOS.json`, `ACTIVACIONES.json`, `MANIFIESTO.md`.

## 10. Qué debe documentar
El informe con (A) y (B).

## 11. Cuándo hacer commit
Un commit al entregar: `docs(multimodelo/M2): comparación histórica y esquema RTDB menú`.

## 12. Qué debe reportar
La tabla (A) y el esquema (B), con las discrepancias más relevantes resaltadas.

## 13. Condición de terminado
(A) cubre las rutas del alcance; (B) lista los campos observados de categoría y producto
con un ejemplo real por campo.

## 14. Si encuentra una contradicción
Reportarla; no asumas.

## 15. Si la pieza ya fue movida
Rastro → destino → continúa desde el estado real.

## 16. Si necesita salir del límite
Detente y repórtalo.
