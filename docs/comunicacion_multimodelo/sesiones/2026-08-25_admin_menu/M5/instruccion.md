# Tarea T-M5-01 — Línea base de validación e inventario de cobertura

| Campo | Valor |
|---|---|
| ID | `T-M5-01` |
| VERSION | `1` |
| Sesión | `2026-08-25_admin_menu` |
| Agente | M5 |
| Publicada | `2026-08-26 05:00 UTC` |
| ESTADO | NUEVA |
| SELLO | |

## 1. Objetivo
Establecer la línea base de calidad del territorio Menú y el inventario de cobertura de
pruebas (qué piezas tienen test, cuáles no).

## 2. Contexto mínimo
Antes de desfragmentar se necesita saber qué está verde hoy y qué no. La rama es `rama-2`.

## 3. Ruta inicial
`package.json` (scripts `check-types`, `test`, `lint`).

## 4. Alcance
Territorio Menú: `src/ui/roles/administrador/menu`, `src/capacidades/menu`,
`src/ui/bloques/menu`, `src/ui/bloques/RecipeEditor.tsx`, `VariantEditor.tsx`,
`VariantsModal.tsx`, `ProductPickerOverlay.tsx`, `src/ui/bloques/productos`,
`src/ui/primitivos/productos`, `src/capacidades/admin/menuSafety.ts`,
`src/capacidades/admin/useAdminTools.ts`, `src/sistema/persistencia/menu.repo.ts`.

## 5. Límites
Solo lectura y ejecución de validación. No edites código ni fixes; solo reporta.

## 6. Qué verificar
1. `npx tsc --noEmit` (anota errores que toquen el territorio).
2. `npx jest` (suites relevantes al territorio: menu, productos, menuSafety).
3. `npx eslint <rutas del territorio>` (errores/advertencias).
4. Inventario de tests: para cada pieza del alcance, ¿existe un `*.test.*` que la cubra?

## 7. Evidencia que debe producir
Tabla de validaciones `| validación | resultado |`, y tabla de cobertura
`| pieza | test asociado | cubierta (sí/no) |`.

## 8. Puede modificar
Ninguno. Solo tu carpeta `M5/`.

## 9. No puede modificar
Código, `CENTRAL/`, otras carpetas M*, `EVENTOS.json`, `ACTIVACIONES.json`, `MANIFIESTO.md`.

## 10. Qué debe documentar
El informe con las dos tablas.

## 11. Cuándo hacer commit
Un commit al entregar: `docs(multimodelo/M5): línea base menú`.

## 12. Qué debe reportar
Resultados exactos de tsc/jest/lint y la cobertura por pieza.

## 13. Condición de terminado
Las tres validaciones ejecutadas con resultado capturado y la cobertura listada por pieza.

## 14. Si encuentra una contradicción
Reportarla; no asumas.

## 15. Si la pieza ya fue movida
Rastro → destino → continúa.

## 16. Si necesita salir del límite
Detente y repórtalo.
