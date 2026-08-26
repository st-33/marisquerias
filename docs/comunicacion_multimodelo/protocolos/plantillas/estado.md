# Estado de agente — plantilla

> La escribe **solo el agente** en su `M<n>/estado.md`. Una tabla por tarea, agregando
> filas nuevas sin borrar las anteriores (trazabilidad). Vocabulario fijo de la
> sección 5 del protocolo 02.

```markdown
# Estado — M<n>

**Sesión:** `<fecha>_<slug>`

| Fecha/hora UTC | Tarea | Estado | Último commit | Notas / bloqueo |
|---|---|---|---|---|
| `YYYY-MM-DD HH:MM` | T-M<n>-01 | RECIBIDA | — | Instrucción leída |
| `YYYY-MM-DD HH:MM` | T-M<n>-01 | TRABAJANDO | — | — |
| `YYYY-MM-DD HH:MM` | T-M<n>-01 | REPORTADA | `abc1234` | Informe publicado |
```

**Reglas:**

- Cada transición agrega una fila; no se sobrescribe la historia.
- `BLOQUEADA` exige motivo concreto en Notas y en el informe.
- El orquestador marca `ABSORBIDA`/`RECHAZADA`/`CORREGIDA` en `CENTRAL/estado.md`,
  no aquí (aquí queda solo la última línea del agente).
