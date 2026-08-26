# Plan central — sesión `2026-08-26_admin_inventario_mesas_reparto`

**Fecha/hora:** 2026-08-26 06:00 UTC
**Territorio:** módulos **Inventario, Mesas y Reparto** del rol Administrador.
**Estado:** ACTIVA — fases 1–3 delegadas a M1–M5; fase 4 (armar) reservada al orquestador.

## 1. Panorama inicial (fase 0 del orquestador; los modelos refinan)

| Módulo | Visual (caja) | Lógica (caja) | Infraestructura relacionada (solo lectura) |
|---|---|---|---|
| Inventario | `ui/roles/administrador/inventario/AdminInventoryScreen.tsx` (30) + `PanelInventario/index.tsx` (1105) | `capacidades/inventario/useInventarioAvanzado.ts` (142) | `sistema/persistencia/inventory.v2.repo.ts`; store `slices/inventoryV2` |
| Mesas | `ui/roles/administrador/mesas/AdminTablesScreen.tsx` (508) | `capacidades/mesas/useMesasManagement.ts` (223) | store mesas; `sistema/persistencia/mesas.*` |
| Reparto | por localizar (ruta `app/_role/admin/repart.tsx`; ¿registro `admin_repart`?) | `capacidades/reparto/useAdminRepart.ts` (80) | RTDB `ajustes/reparto` (costos, horarios, umbrales) |

**Fuera de alcance:** módulo Dispositivos y cualquier otro rol/módulo.

## 2. Distribución (fases 1–3)

| Agente | Proceso | Fases |
|---|---|---|
| M1 | Módulo **Inventario**: mapear, documentar y reunir en la caja | 1, 2, 3 |
| M2 | Módulo **Mesas**: mapear, documentar y reunir en la caja | 1, 2, 3 |
| M3 | Módulo **Reparto**: localizar la UI, mapear, documentar y reunir en la caja | 1, 2, 3 |
| M4 | Huérfanos y candidatos a eliminación en el territorio (solo lectura) | 1, 2 |
| M5 | Línea base tsc/jest/lint + cobertura de pruebas del territorio (solo lectura) | 1, 2 |

## 3. La caja (destino de fase 3)

Estructura canónica del rol Administrador (como en métricas y menú):

```text
src/ui/roles/administrador/<modulo>/   ← piezas visuales exclusivas del módulo
src/capacidades/<modulo>/              ← lógica exclusiva del módulo
```

Reglas de reunión: mover solo piezas EXCLUSIVAS (cero consumidores fuera del módulo)
con `git mv` + imports actualizados + huella `MIGRACION.md` + `tsc` verde. **No**
renombrar símbolos ni crear subjerarquías internas (fase 4 del orquestador).

## 4. Condición de entrada a fase 4

Los 5 informes entregados y absorbidos. El orquestador construye la jerarquía fina.
