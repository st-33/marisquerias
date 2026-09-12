# Decisiones del orquestador — sesión `2026-08-25_admin_menu`

**Fecha/hora:** 2026-08-26 06:00 UTC

## Absorción de informes (T-M1-01 … T-M5-01)

| Informe | Veredicto | Acción |
|---|---|---|
| M1 — consumidores y referencias | ABSORBIDO | Confirma la desfragmentación; aporta pendiente: `menuSafety.test.ts:25-33` referencia textual a `AdminMenuScreen.tsx` (ruta inexistente tras renombre) |
| M2 — comparación histórica + RTDB | ABSORBIDO | RTDB heterogénea entre tenants (`__plantilla_base` vs `el-arrecife` vs `puerto-libres`); sin eliminaciones funcionales en la rama histórica |
| M3 — duplicación y contratos | ABSORBIDO | Deuda real registrada: merge dual en `menu.repo.ts` (149-186 y 294-369); divergencias `Categoria.activa` vs `cat.activo`, `visible.ventaCrudo` vs `herencia.ventaCrudo`; motor no respeta `nextGroupId` |
| M4 — huérfanos | ABSORBIDO | Confirmó los 7 huérfanos sin consumidores; no repitió la eliminación ya ejecutada (comportamiento correcto de "pieza ya procesada") |
| M5 — línea base | ABSORBIDO | tsc 0; 21 suites/114 tests verdes; lint: error Prettier ya corregido por orquestador; warning exhaustive-deps preexistente |

## Pendientes registrados para procesos futuros (no bloquean)

1. Corregir ruta textual en `menuSafety.test.ts` (test suelto fuera del patrón jest) — fase 4 de Menú o limpieza menor.
2. Deuda de contratos (flat/nested/índice, `nextGroupId`, `activa`/`activo`) — proceso de contratos compartidos, no de este módulo.
3. `jest.config.js` excluye tests sueltos (`menuSafety.test.ts`, `useFeatureFlag.test.ts`) — condición preexistente.

## Cierre

**Sesión `2026-08-25_admin_menu`: COMPLETADA** — módulo Menú desfragmentado por el
orquestador (estructura `PantallaMenuAdmin` + bloques/componentes/editores/logica),
informes de apoyo absorbidos. La sesión activa pasa a `2026-08-26_admin_inventario_mesas_reparto`.
