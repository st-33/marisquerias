# Protocolo 01 — Orquestador (DeepSeek)

Solo lo edita el orquestador. Documenta el ciclo operativo y los criterios de delegación.

## 1. Ciclo del orquestador

```text
DETECTA necesidad (escaneo, evidencia, tarea pendiente)
→ CLASIFICA (construcción propia vs. delegable)
→ DECIDE SI DELEGA (criterios de la sección 3)
→ DEFINE objetivo, alcance, límites y evidencia esperada
→ REGISTRA la tarea en CENTRAL/estado.md
→ ESCRIBE M<n>/instruccion.md con la plantilla de tarea (ESTADO: NUEVA)
→ COMMIT + PUSH (protocolo 03)
→ CONTINÚA trabajando en lo suyo (no espera)
```

Al detectar un informe de agente:

```text
DETECTA (git pull; M<n>/estado.md en REPORTADA)
→ INSPECCIONA M<n>/informe.md y verifica su evidencia contra el código real local
→ DECIDE: ABSORBER / CORREGIR / RECHAZAR (se registra en CENTRAL/decisiones.md)
→ ACTUALIZA CENTRAL/estado.md (tarea → ABSORBIDA/RECHAZADA) y el mapa real del territorio
→ COMMIT + PUSH
```

## 2. Qué conserva siempre el orquestador

- Arquitectura resultante, clasificación de piezas y nomenclatura final.
- Movimientos, renombrados, fusiones, eliminaciones y contratos propios.
- Integración de resultados y corrección de contradicciones.
- La escritura de `CENTRAL/`, `protocolos/`, `plantillas/` y `LEEME.md`.

## 3. Criterio de delegación

Se delega cuando **la suma de explicar + coordinar + verificar es menor que el costo
propio** y la tarea cumple al menos una de:

- Repetitiva y verificable (búsquedas de consumidores, inventarios de referencias,
  detección de huérfanos, comparación entre ramas o estructuras).
- Documental con formato ya definido (registros de movimientos, extracción
  origen-destino, actualización de huellas).
- Exploratoria acotada (mapear una zona con límites claros, comprobar una hipótesis
  con evidencia exigida).
- Paralelizable sin tocar el mismo conjunto de archivos que otra tarea u otro agente.

Se **conserva en el orquestador** cuando:

- Decide arquitectura, identidad de piezas, jerarquía o contratos.
- La tarea es única, pequeña o más barata de hacer que de explicar.
- El resultado cambiaría decisiones que aún no existen.

No se crean protocolos nuevos para procesos que ocurrirán una sola vez; si un proceso
se repite, se convierte en plantilla o protocolo dentro de esta misma zona.

## 4. Publicación y recalibración

- La instrucción es pública solo vía Git: no existe otro canal.
- El orquestador puede reasignar, fusionar o cancelar tareas editando `instruccion.md`
  (ESTADO: NUEVA con nota de revisión) y registrándolo en `CENTRAL/decisiones.md`.
- Cambios estructurales del propio sistema (protocolos, plantillas, distribución)
  se documentan en `CENTRAL/decisiones.md` de la sesión activa antes de aplicarse.
