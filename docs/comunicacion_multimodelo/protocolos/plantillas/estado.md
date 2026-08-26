# Estado de agente — plantilla (v2)

> La escribe **solo el agente** en su `M<n>/estado.md`. Una tabla por tarea, agregando
> filas nuevas sin borrar las anteriores. Complemento de máquina: `M<n>/procesado.json`
> registra los sellos ya procesados (anti-duplicado).

```markdown
# Estado — M<n>

**Sesión:** `<fecha>_<slug>`

| Fecha/hora UTC | Tarea | Estado | Sello (12) | Último commit | Notas / bloqueo |
|---|---|---|---|---|---|
| `YYYY-MM-DD HH:MM` | T-M<n>-01 | RECIBIDA | `abc…` | — | Instrucción leída |
| `YYYY-MM-DD HH:MM` | T-M<n>-01 | TRABAJANDO | `abc…` | — | — |
| `YYYY-MM-DD HH:MM` | T-M<n>-01 | REPORTADA | `abc…` | `abc1234` | Informe publicado |

**ULTIMO_PROCESADO:** `<sello>` (repetir el sello de la tarea más reciente terminada)
```

**Reglas:**

- Sin evento `INSTRUCCION_NUEVA` pendiente en `EVENTOS.json` → fila
  `| … | — | DISPONIBLE | — | — | Sin trabajo nuevo |` y fin de la ejecución.
- Continuar vs. iniciar: si el último estado con el sello vigente es
  `RECIBIDA/TRABAJANDO/BLOQUEADA` → continuar la misma tarea; en cualquier otro caso
  → iniciar ejecución nueva.
- Al terminar: informe → `estado.md` en `REPORTADA` → agregar el sello a
  `procesado.json` → commit → push. La carpeta de otro agente no se toca nunca.
