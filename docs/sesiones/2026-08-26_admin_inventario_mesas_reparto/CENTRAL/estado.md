# Estado central — sesión `2026-08-26_admin_inventario_mesas_reparto`

> Solo lo edita el orquestador. Refleja el estado verificado (no declarado) del sistema.

**Fecha/hora:** 2026-08-26 06:00 UTC
**Estado de la sesión:** ACTIVA — fases 1–3 delegadas; fase 4 (armar) reservada.
**Sistema:** v2 — detección por libro de eventos (`EVENTOS.json`); rama única `rama-2`.

## Tareas publicadas (2026-08-26)

| ID | Agente | Proceso | Fases | Estado |
|---|---|---|---|---|
| T-M1-01 | M1 | Inventario: mapear + documentar + reunir en caja | 1–3 | NUEVA |
| T-M2-01 | M2 | Mesas: mapear + documentar + reunir en caja | 1–3 | NUEVA |
| T-M3-01 | M3 | Reparto: localizar UI + mapear + documentar + reunir | 1–3 | NUEVA |
| T-M4-01 | M4 | Huérfanos y candidatos a eliminar (solo lectura) | 1–2 | NUEVA |
| T-M5-01 | M5 | Línea base tsc/jest/lint + cobertura (solo lectura) | 1–2 | NUEVA |

## Agentes

| Agente | Estado | Notas |
|---|---|---|
| M1 | NUEVA | instrucción publicada |
| M2 | NUEVA | instrucción publicada |
| M3 | NUEVA | instrucción publicada |
| M4 | NUEVA | instrucción publicada |
| M5 | NUEVA | instrucción publicada |

## Reglas de esta sesión

- M1/M2/M3 pueden mover SOLO piezas exclusivas de su módulo (fase 3) con las reglas de
  su instrucción: git mv, imports, huella, tsc.
- M4/M5 son solo lectura.
- La fase 4 (jerarquía fina, renombrados, desfragmentación) la ejecuta el orquestador
  cuando los 5 informes estén absorbidos.
