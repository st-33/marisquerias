# Tarea T-M2-01 — Fases 1–3 del módulo Mesas (Administrador)

| Campo | Valor |
|---|---|
| ID | `T-M2-01` |
| VERSION | `1` |
| Sesión | `2026-08-26_admin_inventario_mesas_reparto` |
| Agente | M2 |
| Publicada | `2026-08-26 06:00 UTC` |
| ESTADO | NUEVA |
| SELLO | |

## 1. Objetivo
Ejecutar las fases 1–3 del módulo **Mesas** del rol Administrador: (1) mapear piezas y
consumidores, (2) documentar con evidencia y huella, (3) reunir en la caja las piezas
exclusivas dispersas.

## 2. Contexto mínimo
Estructura canónica del rol Administrador: `src/ui/roles/administrador/<modulo>/`
(visual) y `src/capacidades/<modulo>/` (lógica). Rama `rama-2`. No tocar Dispositivos
ni otros roles.

## 3. Ruta inicial
`src/ui/roles/administrador/mesas/AdminTablesScreen.tsx` (508) y
`src/capacidades/mesas/useMesasManagement.ts` (223)

## 4. Alcance (fase 1 — mapeo)
- `ui/roles/administrador/mesas/*` y `capacidades/mesas/*`.
- Consumidores de `useMesasManagement`, `useMesas`, `TablesGrid` y de cualquier pieza
  que el módulo importe.
- Piezas visuales de mesas dispersas (por ejemplo `ui/bloques/TablesGrid.tsx` y
  similares): determina si su responsabilidad principal es el módulo Mesas.

## 5. Límites (fases 1–2)
- Store de mesas, repositorios y cualquier infraestructura: **solo lectura**.
- Módulo Dispositivos y otros roles: **fuera de alcance**.

## 6. Qué verificar (fase 1)
Para cada pieza: símbolos exportados y TODOS los consumidores (`grep -rn` en `src` y
`app`, dinámicos y barriles). Clasifica: EXCLUSIVA_MESAS, COMPARTIDA (con quién) o
HUERFANA_CANDIDATA.

## 7. Evidencia que debe producir (fase 2)
Informe con: (a) tabla pieza→consumidores→clasificación; (b) piezas exclusivas
dispersas candidatas a la caja; (c) compartidas con su relación; (d) pendientes.

## 8. Puede modificar (fase 3 — reunión en la caja)
SOLO piezas EXCLUSIVA_MESAS, con las reglas:
- `git mv` hacia `src/ui/roles/administrador/mesas/` (visual) o
  `src/capacidades/mesas/` (lógica).
- Actualizar imports de los consumidores del módulo.
- **No** renombrar símbolos ni crear subcarpetas (fase 4 del orquestador).
- `MIGRACION.md` en el origen con tabla de movimientos.
- `npx tsc --noEmit` antes del commit.

## 9. No puede modificar
Compartidas, infraestructura, `CENTRAL/`, otras carpetas M*, `EVENTOS.json`,
`ACTIVACIONES.json`, `MANIFIESTO.md`, `AGENTS.md`, protocolos y plantillas.

## 10. Qué debe documentar
Informe oficial + huella de movimientos.

## 11. Cuándo hacer commit
Fase 2: `docs(multimodelo/M2): mapeo mesas`. Fase 3: commit por movimiento o conjunto
mínimo `refactor(admin): reunir piezas de mesas`.

## 12. Qué debe reportar
Tabla de clasificación, piezas movidas (origen→destino), validaciones.

## 13. Condición de terminado
Las 3 fases completas con evidencia. Si no hay piezas dispersas, declararlo con la
evidencia de la búsqueda.

## 14. Si encuentra una contradicción
Reportarla con evidencia; no la arregles por tu cuenta.

## 15. Si la pieza ya fue movida
Rastro → destino → solo lo pendiente.

## 16. Si necesita salir del límite
Detente y repórtalo.
