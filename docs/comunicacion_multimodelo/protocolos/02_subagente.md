# Protocolo 02 — Subagente (M1–M5) · v2

Norma común para todos los agentes externos. Detección **por libro de eventos**, no por
historial de git.

## 1. Arranque y detección (mecánica exacta)

```text
1. git fetch && git checkout rama-2 && git pull
2. LEER AGENTS.md y docs/comunicacion_multimodelo/MANIFIESTO.md (fuente única)
3. LEER sesiones/<sesion_activa>/EVENTOS.json
4. BUSCAR el primer evento INSTRUCCION_NUEVA con agente = M<n> cuyo sello
   NO esté en M<n>/procesado.json
5. ¿Existe? → leer M<n>/instruccion.md y continuar en 2.
   ¿No existe? → estado.md: DISPONIBLE, sin trabajo nuevo. Fin de ejecución.
```

- **Un commit no es una instrucción.** Solo un evento `INSTRUCCION_NUEVA` lo es.
- **Destinatario:** el campo `agente` del evento (la carpeta propia). Sin ambigüedad.
- **Nueva vs. ya procesada:** sello del evento vs. `procesado.json`.
- **Nueva ejecución vs. continuar:** si `estado.md` muestra el mismo sello en
  `RECIBIDA/TRABAJANDO/BLOQUEADA` → continuar esa tarea; en cualquier otro caso →
  iniciar ejecución nueva.
- **Ciclos:** el agente nunca escribe `instruccion.md` ni eventos; sus commits de
  informe/estado no generan instrucciones nuevas.

## 2. Ejecución y entrega

```text
estado.md: RECIBIDA (hora UTC)
→ EJECUTA solo esa tarea (secciones 3–5)
→ escribe M<n>/informe.md (plantilla) y estado.md: REPORTADA
→ agrega el sello a M<n>/procesado.json
→ COMMIT atómico + PUSH (protocolo 03)
→ queda DISPONIBLE; si hay otro evento pendiente para él, puede encadenarlo
```

El sistema global no se detiene por este ciclo: otros agentes continúan con lo suyo.

## 3. Límites de escritura

- **Zona propia:** `docs/comunicacion_multimodelo/sesiones/<sesion_activa>/M<n>/`.
- **Código funcional:** solo los archivos listados en `puede_modificar` de su
  instrucción. Todo lo demás es lectura.
- **Prohibido siempre:** `CENTRAL/`, carpetas de otros agentes, `protocolos/`,
  `plantillas/`, `MANIFIESTO.md`, `LEEME.md`, `AGENTS.md`, `EVENTOS.json`.
- Fuera del límite principal: **lectura y observación**; la intervención en pieza
  externa se solicita en el informe y espera instrucción explícita.

## 4. Reglas de evidencia

- Separar **hecho** (ruta:línea o commit) de **hipótesis** (marcada).
- Si la evidencia contradice la instrucción, se reporta la contradicción: la evidencia
  no se ajusta a la instrucción.

## 5. Pieza ya movida o transformada

1. Verificar el rastro: `git log --follow`, `MIGRACION.md` locales,
   `docs/desfragmentaciones/`.
2. Localizar el destino nuevo y confirmar qué parte de la tarea ya fue ejecutada.
3. Ejecutar **solo la parte pendiente**; no repetir trabajo hecho.
4. Registrar en el informe: origen anterior, destino encontrado, qué se omitió y por qué.

## 6. Estados (vocabulario fijo)

- Tarea: `SIN_ASIGNAR → NUEVA → RECIBIDA → TRABAJANDO → REPORTADA →
  ABSORBIDA | RECHAZADA | CORREGIDA` (+ `BLOQUEADA` con motivo, `CANCELADA`).
- Agente sin tarea: `DISPONIBLE`.
- `procesado.json` conserva la lista de sellos terminados (historial anti-duplicado).

## 7. Informe y trazabilidad

- Informe con `protocolos/plantillas/informe.md`: hechos, hipótesis, movimientos
  (con hora UTC), validaciones, bloqueos y propuestas.
- Todo movimiento funcional autorizado deja huella (`MIGRACION.md` o registro
  consolidado). Sin documentos gigantes ni comentarios ornamentales.
