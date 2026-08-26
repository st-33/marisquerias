# Plan central — sesión `2026-08-25_admin_menu`

**Fecha/hora:** 2026-08-25 23:59 UTC
**Territorio objetivo (próxima iteración):** módulo Menú del rol Administrador.
**ESTADO DE LA SESIÓN: PENDIENTE DE AUTORIZACIÓN** — no hay tareas activas ni
instrucciones publicadas. Este plan es preparación, no ejecución.

## 1. Territorio detectado (escaneo inicial, no exhaustivo)

| Pieza | Ruta actual | Tamaño | Nota |
|---|---|---|---|
| Pantalla admin de menú | `src/ui/roles/administrador/menu/AdminMenuScreen.tsx` | 1063 líneas | Marcada P2 en auditoría visual |
| Gestión de menú (lógica) | `src/capacidades/menu/useMenuManagement.ts` | 423 líneas | — |
| Persistencia del menú | `src/sistema/persistencia/menu.repo.ts` | 616 líneas | Escritura dual flat/nested/índice (histórico) |
| Bloques de menú | `src/ui/bloques/menu/*` (CategorySidebar, CollapsibleSection, MenuLayout, ProductCard, VariantChip) | ~964 líneas | — |
| Editor de variantes | `src/ui/bloques/VariantEditor.tsx` | 841 líneas | Consumido por admin |
| Modal de variantes | `src/ui/bloques/VariantsModal.tsx` | 840 líneas | **Compartido con Mesero** |
| Selector de productos | `src/ui/bloques/ProductPickerOverlay.tsx` | 410 líneas | **Compartido con Mesero** |
| Editor de recetas | `src/ui/bloques/RecipeEditor.tsx` | 426 líneas | — |
| Primitivos/productos | `src/ui/primitivos/productos/*` y `src/ui/bloques/productos/*` | — | Con pruebas propias |
| Seguridad de menú | `src/capacidades/admin/menuSafety.ts` | — | **Compartida** con capacidades/menu |
| Herramienta admin sin consumidores | `src/capacidades/admin/useAdminTools.ts` | — | Pendiente de decisión |
| Rama histórica de referencia | `origin/manus/administracion-menu` | — | Trabajo previo de agente; comparar sin adoptar |

## 2. Hipótesis inicial (a validar en la iteración)

1. El territorio Menú/Administrador está fragmentado entre `ui/roles/administrador/menu`,
   `ui/bloques/menu`, `ui/bloques/productos`, `ui/primitivos/productos`,
   `capacidades/menu` y piezas sueltas de `capacidades/admin`.
2. `VariantsModal` y `ProductPickerOverlay` son compartidos reales con el rol Mesero:
   no deben apropiarse; su reorganización interna queda para un proceso conjunto.
3. La persistencia dual (flat/nested/índice) en `menu.repo.ts` concentra la deuda de
   coherencia del módulo.

## 3. Distribución propuesta para la iteración (mutable según evidencia)

| Agente | Proceso propuesto | Tipo |
|---|---|---|
| M1 | Inventario de consumidores y referencias del territorio Menú (quién importa qué, tabla pieza→consumidores) | Exploración verificable |
| M2 | Comparación contra `origin/manus/administracion-menu` + inventario del esquema de menú en `rtdb_actualizada.json` | Investigación documental |
| M3 | Mapa de duplicación y contratos internos (flat/nested/índice, variantes, visibilidad) + coherencia documental | Análisis con evidencia |
| M4 | Detección de huérfanos y candidatos a eliminación (uso real vs. declarado) + documentación origen-destino de piezas candidatas | Exploración verificable |
| M5 | Verificación cruzada de los hallazgos M1–M4 (contradicciones) y línea base de validación (tsc/jest/lint focal) | Verificación |

**Reserva del orquestador:** arquitectura resultante, jerarquía final, renombrados,
contratos, movimientos reales, integración y decisión sobre piezas compartidas.

## 4. Condición para activar

Autorización explícita del usuario. Entonces: `CENTRAL/estado.md` pasa a ACTIVA y se
publican instrucciones `NUEVA` por agente con la plantilla v2 (VERSION, SELLO).
Cada publicación genera su evento en `EVENTOS.json` (workflow o generador local:
`node herramientas/orquestacion/generar_eventos.mjs`). Los agentes detectan por el
libro de eventos, nunca por historial de git.

**Mecánica v2 vigente:** `MANIFIESTO.md` (fuente única), protocolos 01–03 v2,
plantillas v2, sellos anti-duplicado en `procesado.json`.
