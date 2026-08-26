# Protocolo 02 — Subagente (M1–M5)

Norma común para todos los agentes externos. Cada agente la aplica dentro de su carpeta.

## 1. Ciclo del agente

```text
git pull (rama-2)
→ LEE LEEME.md (sesión activa) y CENTRAL/estado.md
→ LEE M<n>/instruccion.md
→ ESCRIBE estado.md: RECIBIDA (fecha/hora UTC)
→ EJECUTA su proceso (secciones 2–5)
→ DOCUMENTA en M<n>/informe.md (plantilla) y actualiza estado.md: REPORTADA
→ COMMIT + PUSH atómico de la unidad terminada (protocolo 03)
```

Un agente sin `instruccion.md` o con la sesión no ACTIVA **no ejecuta trabajo**
y lo registra en su `estado.md` (estado: SIN_ASIGNAR o SESION_NO_ACTIVA).

## 2. Límites de escritura

- **Zona propia:** `docs/comunicacion_multimodelo/sesiones/<sesion_activa>/M<n>/`.
- **Código funcional:** solo los archivos autorizados explícitamente en
  `instruccion.md` (campo `puede_modificar`). Todo lo demás es lectura.
- **Prohibido siempre:** `CENTRAL/`, carpetas de otros agentes, `protocolos/`,
  `plantillas/`, `LEEME.md`, y cualquier archivo fuera del alcance de la tarea.
- Fuera del límite principal de la sesión: **lectura y observación**. Si la tarea
  exige intervenir una pieza externa, el agente no lo hace: reporta la necesidad en
  su informe con la evidencia y espera instrucción explícita.

## 3. Reglas de evidencia

- Separar siempre **hecho** (con ruta y línea) de **hipótesis** (marcada como tal).
- Un hallazgo sin evidencia localizable no se reporta como hecho.
- Si la evidencia contradice la hipótesis de la tarea, se reporta la contradicción:
  no se "ajusta" la evidencia para confirmar la instrucción.

## 4. Pieza ya movida o transformada

1. Verificar el rastro: `git log --follow`, archivos `MIGRACION.md` locales y
   `docs/desfragmentaciones/`.
2. Localizar el destino nuevo y confirmar qué parte de la tarea ya fue ejecutada.
3. Ejecutar **solo la parte pendiente**; no repetir trabajo hecho.
4. Registrar en el informe: origen anterior, destino encontrado, qué se omitió y por qué.

## 5. Estados de tarea (vocabulario fijo)

`SIN_ASIGNAR` → `NUEVA` (orquestador) → `RECIBIDA` → `TRABAJANDO` → `REPORTADA` →
`ABSORBIDA` | `RECHAZADA` | `CORREGIDA` (orquestador).
Intermedios permitidos: `BLOQUEADA` (con motivo en `estado.md`) y `CANCELADA` (orquestador).

## 6. Informe y trazabilidad

- El informe usa la plantilla `protocolos/plantillas/informe.md`.
- Todo movimiento funcional autorizado deja huella: tabla de movimientos en el informe
  y/o `MIGRACION.md` en la zona afectada, con origen, destino, por qué y cuándo (UTC).
- No se generan documentos gigantes: densidad informativa, tablas, evidencia mínima
  suficiente para que el orquestador verifique sin rehacer la tarea.
