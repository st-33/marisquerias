# AGENTS.md — Reglas para agentes externos (M1–M5)

**Repositorio:** `st-33/marisquerias` — ecosistema modular de negocio local (Expo/React Native + Firebase RTDB).
**Rama de trabajo:** `rama-2`. No crear ramas sin autorización del orquestador.

## Antes de actuar (obligatorio)

1. `git pull` sobre `rama-2`.
2. Leer `docs/comunicacion_multimodelo/LEEME.md` (sesión activa).
3. Leer `docs/comunicacion_multimodelo/sesiones/<sesion_activa>/CENTRAL/estado.md`.
4. Buscar tu instrucción en `docs/comunicacion_multimodelo/sesiones/<sesion_activa>/M<n>/instruccion.md`.

## Reglas de escritura

- Escribe **solo** en tu carpeta `M<n>/` de la sesión activa y en los archivos de código
  explícitamente autorizados en tu `instruccion.md`.
- `CENTRAL/`, otras carpetas `M*`, `protocolos/`, `plantillas/`, `LEEME.md` y este archivo
  son de solo lectura.
- Si la sesión no está ACTIVA o no tienes instrucción `NUEVA`: no ejecutar trabajo.
- Protocolos completos: `docs/comunicacion_multimodelo/protocolos/`.

## Commits

- Un commit por unidad terminada; mensaje `docs(multimodelo/M<n>): resumen` (documentos)
  o `feat|fix|refactor(<area>): resumen` (código autorizado).
- `git pull --rebase` antes de publicar. Si el conflicto toca archivos de otros:
  no resolver por tu cuenta; marca BLOQUEADA en tu `estado.md` y reporta.

## Estándares del proyecto

- Nomenclatura propia en español; conservar en inglés solo APIs, librerías, protocolos
  y convenciones técnicas obligatorias.
- Todo movimiento funcional deja huella (`MIGRACION.md` local o registro en
  `docs/desfragmentaciones/`).
- Verificación mínima antes de reportar: `npx tsc --noEmit`, pruebas (`npm test`) y lint
  focal cuando la tarea toque código.
