# Instrucción de tarea — plantilla

> La escribe únicamente el orquestador en `M<n>/instruccion.md`. El agente no modifica
> este archivo; sus respuestas van en `estado.md` e `informe.md`.

```markdown
# Tarea <ID> — <título corto>

| Campo | Valor |
|---|---|
| ID | `T-M<n>-<NN>` (ej. T-M2-01) |
| Sesión | `<fecha>_<slug>` |
| Agente | M<n> |
| Publicada | `YYYY-MM-DD HH:MM UTC` |
| ESTADO | NUEVA |

## 1. Objetivo
<Qué resultado concreto se espera, en una frase verificable.>

## 2. Contexto mínimo
<Lo indispensable: qué territorio se está interviniendo y por qué. Sin historia larga.>

## 3. Ruta inicial
<Dónde empezar a mirar.>

## 4. Alcance
<Qué zonas cubre la tarea.>

## 5. Límites
<Qué queda fuera; qué es solo lectura.>

## 6. Qué verificar
<Lista concreta de comprobaciones, cada una con la evidencia esperada (ruta y línea).>

## 7. Evidencia que debe producir
<Tablas, inventarios, conteos, rutas, commits comparados… formato esperado.>

## 8. Puede modificar
<Lista exacta de archivos/zona documental autorizados, o "ninguno".>

## 9. No puede modificar
<Lo protegido: CENTRAL, otras M*, contratos, piezas compartidas.>

## 10. Qué debe documentar
<Informe + huella de movimientos si aplica.>

## 11. Cuándo hacer commit
<Unidad de commit esperada.>

## 12. Qué debe reportar
<Resumen mínimo que debe contener el informe.>

## 13. Condición de terminado
<Criterio verificable de DONE.>

## 14. Si encuentra una contradicción
<Reportarla con evidencia; no ajustar la evidencia a la instrucción.>

## 15. Si la pieza ya fue movida
<Aplicar protocolo 02 sección 4: rastro → destino → solo lo pendiente.>

## 16. Si necesita salir del límite
<Detenerse y reportar la necesidad; no intervenir.>
```
