# Tarea T-M1-01 — Fases 1–3 del módulo Inventario (Administrador)

| Campo | Valor |
|---|---|
| ID | `T-M1-01` |
| VERSION | `1` |
| Sesión | `2026-08-26_admin_inventario_mesas_reparto` |
| Agente | M1 |
| Publicada | `2026-08-26 06:00 UTC` |
| ESTADO | NUEVA |
| SELLO | |

## 1. Objetivo
Ejecutar las fases 1–3 del módulo **Inventario** del rol Administrador: (1) mapear
todas sus piezas y consumidores, (2) documentar con evidencia y huella, (3) reunir en
la caja las piezas exclusivas que estén dispersas fuera del módulo.

## 2. Contexto mínimo
El rol Administrador usa la estructura canónica `src/ui/roles/administrador/<modulo>/`
(visual) y `src/capacidades/<modulo>/` (lógica), como quedó en los módulos Métricas y
Menú. La rama es `rama-2`. No se toca el módulo Dispositivos ni otros roles.

## 3. Ruta inicial
`src/ui/roles/administrador/inventario/PanelInventario/index.tsx` (1105 líneas) y
`src/capacidades/inventario/useInventarioAvanzado.ts`

## 4. Alcance (fase 1 — mapeo)
- `ui/roles/administrador/inventario/*` (AdminInventoryScreen, PanelInventario).
- `capacidades/inventario/*`.
- Consumidores de `useInventarioAvanzado`, `useInventoryCatalog`, `useInventoryAreas`,
  `useInventoryV2Store` y de cualquier pieza que el módulo importe.
- Piezas visuales de inventario dispersas en `ui/bloques/`, `ui/primitivos/` u otros
  directorios (busca por nombres tipo inventario/stock/área).

## 5. Límites (fases 1–2)
- `sistema/persistencia/inventory.v2.repo.ts`, store `slices/inventoryV2` y demás
  infraestructura: **solo lectura** (compartida), documentar relación, no mover.
- Módulo Dispositivos y otros roles: **fuera de alcance** (ni los investigues).

## 6. Qué verificar (fase 1)
Para cada pieza del módulo: símbolos exportados y TODOS sus consumidores
(`grep -rn` sobre `src` y `app`, incluyendo dinámicos y barriles). Clasifica cada pieza
como EXCLUSIVA_INVENTARIO, COMPARTIDA (indica con quién) o HUERFANA_CANDIDATA.

## 7. Evidencia que debe producir (fase 2)
Informe con: (a) tabla pieza→consumidores→clasificación; (b) lista de piezas
exclusivas dispersas que merecen entrar a la caja; (c) lista de compartidas con su
relación; (d) pendientes detectados.

## 8. Puede modificar (fase 3 — reunión en la caja)
SOLO piezas clasificadas EXCLUSIVA_INVENTARIO en el mapeo, con estas reglas:
- `git mv` hacia `src/ui/roles/administrador/inventario/` (visual) o
  `src/capacidades/inventario/` (lógica).
- Actualizar los imports del/los consumidor(es) del módulo.
- **No** renombrar símbolos ni crear subcarpetas (fase 4 del orquestador).
- Dejar `MIGRACION.md` en el directorio de origen con la tabla de movimientos.
- Ejecutar `npx tsc --noEmit` antes del commit.

## 9. No puede modificar
Compartidas, infraestructura, `CENTRAL/`, otras carpetas M*, `EVENTOS.json`,
`ACTIVACIONES.json`, `MANIFIESTO.md`, `AGENTS.md`, protocolos y plantillas.

## 10. Qué debe documentar (fase 2)
Informe con la plantilla oficial + huella de cada movimiento de fase 3.

## 11. Cuándo hacer commit
Fase 2: un commit `docs(multimodelo/M1): mapeo inventario`. Fase 3: un commit por
movimiento o conjunto mínimo coherente `refactor(admin): reunir piezas de inventario`.

## 12. Qué debe reportar
Tabla de clasificación, piezas movidas (con origen→destino), validaciones ejecutadas.

## 13. Condición de terminado
Las 3 fases completas: mapeo con evidencia, informe entregado y, si existían piezas
exclusivas dispersas, movidas con imports y tsc verdes. Si NO existían piezas
dispersas, declararlo explícitamente con la evidencia de la búsqueda.

## 14. Si encuentra una contradicción
Reportarla con evidencia; no la "arregles" por tu cuenta.

## 15. Si la pieza ya fue movida
Verifica rastro (git log --follow, MIGRACION.md) y continúa desde el destino real;
ejecuta solo la parte pendiente.

## 16. Si necesita salir del límite
Detente y repórtalo en el informe; no intervengas.
