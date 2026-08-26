# Protocolo 03 — Git, commits y sincronización · v2

## 1. Rama única

Toda la operación ocurre sobre `origin/rama-2`. `main` es un espejo alineado: **nunca**
es rama de trabajo ni de lectura para los agentes. Si un clon cae en `main`, el primer
paso obligatorio es `git checkout rama-2` (AGENTS.md).

## 2. Unidad de commit

**Commit frecuente, atómico y recuperable.** Un commit = una unidad operativa:

- instrucción publicada (orquestador);
- actualización del libro de eventos (workflow u orquestador);
- tarea documental terminada (agente: informe + estado + procesado.json);
- movimiento trazable con su huella;
- unidad mínima coherente de código autorizado;
- absorción/rechazo registrado en CENTRAL.

Antes de commitear, `git status` debe mostrar **solo** archivos de la unidad.

## 3. Mensajes de commit

- Orquestador — código: `feat|fix|refactor|test|chore(<area>): resumen`.
- Orquestador — sistema/documentos: `docs(multimodelo): resumen`.
- Agente — solo documentos propios: `docs(multimodelo/M<n>): resumen`.
- Agente — código autorizado: `feat|fix|refactor(<area>): resumen` (referenciado en su informe).
- Workflow: `docs(multimodelo): actualizar libro de eventos` (no re-dispara CI).

## 4. Ciclo de sincronización y escucha

```text
ORQUESTADOR: edita → commit → push ──► workflow GitHub Actions (evento push rama-2)
             └─ actualiza EVENTOS.json automáticamente (o en local con el generador)
AGENTE:      pull → lee EVENTOS.json → decide NUEVA/CONTINUAR/NADA (protocolo 02)
             → ejecuta → commit → pull --rebase → push
ORQUESTADOR: pull → lee EVENTOS.json (INFORME_ENTREGADO) → verifica → absorbe/rechaza
             → commit → push
```

- **Detección orientada a eventos:** el disparador es el push a `rama-2` (GitHub
  Actions), no un escaneo periódico del historial. El agente, al arrancar (manual o
  programado en su plataforma), consulta un único archivo determinista: `EVENTOS.json`.
- El agente hace `git pull --rebase` antes de publicar. Si el conflicto toca archivos
  de otros agentes o de CENTRAL: no resuelve por su cuenta; marca `BLOQUEADA` y reporta.

## 5. Anti-ciclos y anti-duplicados

- Los commits de informe/estado/código **no** generan `INSTRUCCION_NUEVA`: el libro
  solo se alimenta de instrucciones NUEVA, informes y decisiones.
- El commit del workflow usa GITHUB_TOKEN: GitHub **no** vuelve a disparar el workflow
  con ese commit → sin bucles de CI. En local, el generador es idempotente: sin eventos
  nuevos no escribe nada.
- Un mismo sello se procesa una sola vez (procesado.json). Revisar una instrucción =
  `VERSION+1` → sello nuevo → evento nuevo, sin ambigüedad con la versión anterior.

## 6. Concurrencia

- La separación de carpetas `M<n>/` elimina colisiones documentales por diseño.
- En código, dos agentes no reciben tareas sobre el mismo conjunto de archivos.
- Si dos procesos llegan a la misma pieza: prevalece el rastro (protocolo 02 §5).
  El segundo verifica, localiza el destino y ejecuta solo lo pendiente.
- La verdad operativa para los agentes es `origin/rama-2`; la de verificación del
  orquestador es su clon local tras `git pull`.
