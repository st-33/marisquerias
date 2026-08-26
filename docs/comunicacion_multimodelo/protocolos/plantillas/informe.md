# Informe de resultado — plantilla

> La escribe **solo el agente** en su `M<n>/informe.md` al terminar cada tarea.
> Densidad informativa: tablas y evidencia mínima suficiente para que el orquestador
> verifique sin rehacer el trabajo.

```markdown
# Informe — M<n> / Tarea <ID>

| Campo | Valor |
|---|---|
| Agente | M<n> |
| Tarea | T-M<n>-<NN> |
| Sesión | `<fecha>_<slug>` |
| Fecha/hora UTC | `YYYY-MM-DD HH:MM` |
| Estado | REPORTADA |
| Commits | `abc1234` (descripción) |
| Archivos creados/modificados | lista |

## 1. Resumen ejecutivo
<2–4 líneas: qué se pidió, qué se encontró, qué se entregó.>

## 2. Hechos confirmados
| # | Hecho | Evidencia (ruta:línea o commit) |
|---|---|---|

## 3. Hipótesis y límites de certeza
<Lo que parece pero no está confirmado, y qué falta para confirmarlo.>

## 4. Movimientos realizados (solo si se autorizaron)
| Pieza | Origen | Transformación | Destino | Por qué | Hora UTC |
|---|---|---|---|---|---|
> Los movimientos funcionales exigen huella local (`MIGRACION.md`) o registro
> consolidado en `docs/desfragmentaciones/`.

## 5. Validaciones ejecutadas
| Validación | Resultado |
|---|---|

## 6. Bloqueos y necesidades fuera de alcance
<Qué impidió terminar o qué requiere decisión del orquestador.>

## 7. Pendientes para otros procesos
<Lo que otro agente o el orquestador deberá atender después.>

## 8. Propuestas (opcional)
<Sugerencias concretas; no son órdenes: el orquestador decide.>
```
