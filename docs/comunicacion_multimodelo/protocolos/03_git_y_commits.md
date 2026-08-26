# Protocolo 03 — Git, commits y sincronización

## 1. Rama única

Toda la operación ocurre sobre `origin/rama-2`. No se crean ramas de agente sin
autorización explícita del orquestador.

## 2. Unidad de commit

**Commit frecuente, atómico y recuperable.** Un commit = una unidad operativa:

- una instrucción publicada (orquestador);
- una tarea documental terminada (agente);
- un movimiento trazable con su huella;
- una unidad mínima coherente de código autorizado;
- una absorción/rechazo registrado en CENTRAL.

No se hace commit por cada edición menor; no se acumulan tareas distintas en un solo
commit. Antes de commitear, verificar con `git status` que solo se incluyen archivos
de la unidad (nada de otros agentes ni cambios ajenos).

## 3. Mensajes de commit

- Orquestador — código: `feat|fix|refactor|test|chore(<area>): resumen`.
- Orquestador — sistema/documentos: `docs(multimodelo): resumen`.
- Agente — solo documentos propios: `docs(multimodelo/M<n>): resumen`.
- Agente — código autorizado: `feat|fix|refactor(<area>): resumen` y el informe lo referencia.

## 4. Ciclo de sincronización

```text
ORQUESTADOR: edita → commit atómico → git push origin rama-2 → sigue trabajando
AGENTE:      git pull → ejecuta → commit atómico → git pull --rebase → git push
ORQUESTADOR: git pull → inspecciona → absorbe/rechaza → commit → push
```

- El agente hace `git pull --rebase` **antes** de publicar. Si el rebase toca archivos
  de otros agentes o de CENTRAL, no resuelve por su cuenta: restaura su estado, marca
  `BLOQUEADA` en `estado.md` y reporta el conflicto en su informe.
- El orquestador resuelve los conflictos entre agentes en el orden que decida y lo
  registra en `CENTRAL/decisiones.md`.

## 5. Concurrencia y colisiones

- La separación de carpetas `M<n>/` elimina colisiones documentales por diseño.
- En código, dos agentes no reciben tareas sobre el mismo conjunto de archivos.
- Si aun así dos procesos llegan a la misma pieza: prevalece el rastro. El segundo
  proceso verifica, localiza el destino nuevo y ejecuta solo lo pendiente
  (protocolo 02, sección 4). La reconstrucción de una conexión antigua no se repite
  "porque ya funcionaba antes".

## 6. Estado remoto como verdad de comunicación

La verdad operativa para los agentes es `origin/rama-2`. La verdad de verificación
para el orquestador es su clon local tras `git pull`. Ningún agente declara un trabajo
como terminado si su commit no está publicado en `origin/rama-2`.
