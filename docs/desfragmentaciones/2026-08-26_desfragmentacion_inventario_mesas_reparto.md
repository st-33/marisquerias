# Desfragmentación: módulos Inventario, Mesas y Reparto (rol Administrador)

**Fecha/hora:** 2026-08-26 07:15 UTC
**Sesión de orquestación:** `2026-08-26_admin_inventario_mesas_reparto` (fases 1–3 delegadas a M1–M5; fase 4 ejecutada por DeepSeek)
**Ámbito:** solo módulos Inventario, Mesas y Reparto del rol Administrador.

## 1. Fases 1–3 (subagentes) — absorbidas

| Agente | Hallazgo clave | Acción del orquestador |
|---|---|---|
| M1 | Inventario ya en rutas canónicas; sin piezas dispersas | Ningún movimiento |
| M2 | Mesas ya en rutas canónicas; `TablesGrid` compartida con Mesero | Ningún movimiento |
| M3 | UI de Reparto inline en `app/_role/admin/repart.tsx` | M3 la reunió en `ui/roles/administrador/reparto/repart.tsx` (`d303374`) |
| M4 | Cero huérfanos en el territorio | — |
| M5 | tsc 0; 19 suites/102 tests; 1 warning useMemo | — |

## 2. Registro de transformaciones (fase 4 — construcción)

| # | Origen | Transformación | Destino |
|---|---|---|---|
| 1 | `inventario/AdminInventoryScreen.tsx` | Renombrado a `PantallaInventario` | `inventario/PantallaInventario.tsx` |
| 2 | `capacidades/inventario/useInventarioAvanzado.ts` | Renombrado a `useInventario` | `capacidades/inventario/useInventario.ts` |
| 3 | `PanelInventario/index.tsx` (1105 líneas) | Estilos separados (320 líneas) a `estilos.ts` | `PanelInventario/index.tsx` (784) + `PanelInventario/estilos.ts` |
| 4 | `mesas/AdminTablesScreen.tsx` | Renombrado a `PantallaMesas`; estilos separados | `mesas/PantallaMesas.tsx` + `mesas/estilos.ts` |
| 5 | `SummaryCard` (interno de AdminTablesScreen) | Extraído y renombrado a `TarjetaResumen` (props en español) | `mesas/componentes/TarjetaResumen.tsx` |
| 6 | `capacidades/mesas/useMesasManagement.ts` | Renombrado a `useGestionMesas` | `capacidades/mesas/useGestionMesas.ts` |
| 7 | `reparto/repart.tsx` (UI reunida por M3) | Renombrado a `PantallaReparto`; `Card` extraído a `TarjetaConfig`; estilos externos | `reparto/PantallaReparto.tsx` + `reparto/componentes/TarjetaConfig.tsx` |
| 8 | `capacidades/reparto/useAdminRepart.ts` | Renombrado a `useGestionReparto` | `capacidades/reparto/useGestionReparto.ts` |
| 9 | `REGISTRO_PANTALLAS` | Registrada la clave `admin_repart` (antes faltaba) | `composicion/registroPantallas.ts` |
| 10 | `app/_role/admin/repart.tsx` | Convertido a adaptador fino con `useResolvedorPantalla('admin_repart')` (patrón estándar) | `app/_role/admin/repart.tsx` |

## 3. Estructura resultante

```text
src/ui/roles/administrador/inventario/
    PantallaInventario.tsx · PanelInventario/ (index.tsx + estilos.ts)
src/capacidades/inventario/useInventario.ts
src/ui/roles/administrador/mesas/
    PantallaMesas.tsx · estilos.ts · componentes/TarjetaResumen.tsx
src/capacidades/mesas/useGestionMesas.ts
src/ui/roles/administrador/reparto/
    PantallaReparto.tsx · componentes/TarjetaConfig.tsx
src/capacidades/reparto/useGestionReparto.ts
```

## 4. Piezas compartidas (no apropiadas, documentadas)

`TablesGrid` (Mesero), `inventory.v2.repo.ts` + store `inventoryV2` (toda la app),
`menu.repo.ts` (persistencia), repositorios RTDB de reparto (`ajustes/reparto` +
misiones en alias `reparto`).

## 5. Pendientes

- `useMemo` warning en `PantallaMesas` (dependencia de `actions`) — preexistente.
- Dos superficies RTDB de reparto (ajustes operativos vs misiones alias `reparto`) —
  proceso de contratos, no de este módulo.

## 6. Evidencia de verificación

- `npx tsc --noEmit` → 0 errores.
- `npm test` → 19 suites, 102 pruebas verdes.
- Commits: `23e42b2` (inventario+mesas), `d81e134` (reparto).
