# AGENTS.md — Reglas para agentes externos (M1–M5)

**Repositorio:** `st-33/marisquerias` — ecosistema modular de negocio local (Expo/React Native + Firebase RTDB).
**Rama de trabajo:** `rama-2` únicamente. `main` es un espejo: **nunca** trabajes en `main`.

## Arranque (obligatorio, en este orden)

```bash
git fetch && git checkout rama-2 && git pull
```

1. Leer este archivo.
2. Leer `docs/comunicacion_multimodelo/MANIFIESTO.md` — fuente operativa única
   (rama, sesión activa, mecánica de detección, estados).
3. Leer `docs/comunicacion_multimodelo/sesiones/<sesion_activa>/EVENTOS.json`
   (el libro de eventos).
4. Leer `docs/comunicacion_multimodelo/sesiones/<sesion_activa>/CENTRAL/estado.md`.
5. Leer tu carpeta `M<n>/` (`instruccion.md`, `estado.md`, `procesado.json`).
6. Aplicar `docs/comunicacion_multimodelo/protocolos/02_subagente.md`.

> La documentación de sesiones históricas puede contener ramas y rutas antiguas:
> **no es fuente operativa** (carpetas marcadas con `HISTORICO.md`).

## Detección de trabajo (nunca por historial de git)

Un commit **no** es una instrucción. Solo un evento `INSTRUCCION_NUEVA` en
`EVENTOS.json` dirigido a tu `agente` y con `sello` no presente en tu
`procesado.json` significa trabajo nuevo. Sin evento pendiente → escribe
`DISPONIBLE` en tu `estado.md` y termina.

## Reglas de escritura

- Escribe **solo** en tu carpeta `M<n>/` de la sesión activa y en los archivos de código
  explícitamente autorizados en tu `instruccion.md`.
- `CENTRAL/`, otras carpetas `M*`, `protocolos/`, `plantillas/`, `MANIFIESTO.md`,
  `LEEME.md`, `EVENTOS.json`, `ACTIVACIONES.json` y este archivo son de solo lectura.
- `ACTIVACIONES.json` registra activaciones enviadas por el workflow; no sustituye
  `M<n>/procesado.json`, que cada agente actualiza al terminar su propia tarea.
- Si la sesión no está ACTIVA: no ejecutar trabajo; registrar `DISPONIBLE`.

## Commits

- Un commit por unidad terminada; mensaje `docs(multimodelo/M<n>): resumen` (documentos)
  o `feat|fix|refactor(<area>): resumen` (código autorizado).
- `git pull --rebase` antes de publicar. Conflicto sobre archivos de otros → no
  resolver por tu cuenta: `BLOQUEADA` en `estado.md` y reportar.

## Estándares del proyecto

- Nomenclatura propia en español; conservar en inglés solo APIs, librerías, protocolos
  y convenciones técnicas obligatorias.
- Todo movimiento funcional deja huella (`MIGRACION.md` local o registro en
  `docs/desfragmentaciones/`).
- Verificación mínima antes de reportar: `npx tsc --noEmit`, `npm test` y lint focal
  cuando la tarea toque código.
