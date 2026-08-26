# MANIFIESTO OPERATIVO — sistema de orquestación multimodelo

**Versión del sistema:** 2.0 · **Actualizado:** 2026-08-26 02:09 UTC

> **FUENTE OPERATIVA ÚNICA.** Cualquier modelo recién activado lee ESTE archivo primero,
> después de `AGENTS.md`. La documentación histórica de sesiones pasadas puede contener
> ramas, rutas o estructuras antiguas y **no es fuente operativa**.

## 1. Identidades y rama

| Variable | Valor |
|---|---|
| Repositorio | `st-33/marisquerias` |
| **Rama operativa única** | **`rama-2`** |
| Rama `main` | Espejo alineado con `rama-2`; **nunca** rama de trabajo |
| Orquestador | **DeepSeek** — único autor de instrucciones, CENTRAL y decisiones |
| Subagentes | M1, M2, M3, M4, M5 (Manus 1.6, cuentas separadas) |
| Zona de comunicación | `docs/comunicacion_multimodelo/` |

## 2. Sesión activa

| Variable | Valor |
|---|---|
| Sesión activa | `2026-08-25_admin_menu` |
| Carpeta | `docs/comunicacion_multimodelo/sesiones/2026-08-25_admin_menu/` |
| Estado | PENDIENTE DE AUTORIZACIÓN (ninguna tarea activa) |

Solo existe **una** sesión activa; se declara aquí y en `CENTRAL/estado.md`.

## 3. Cómo detecta un agente trabajo nuevo (mecánica exacta)

1. `git fetch` + `git checkout rama-2` + `git pull`.
2. Leer `docs/comunicacion_multimodelo/sesiones/<sesion_activa>/EVENTOS.json`
   (el **libro de eventos**; lo mantiene el orquestador y/o el workflow de GitHub Actions).
3. Buscar el primer evento `INSTRUCCION_NUEVA` cuyo `agente` sea el propio y cuyo
   `sello` **no** figure en `M<n>/procesado.json`.
4. Si no existe tal evento → no hay trabajo nuevo; marcar `DISPONIBLE` en `estado.md`
   y terminar la ejecución. **No se escanea el historial de git ni se interpreta la
   documentación histórica.**

Un commit no es una instrucción. **Solo un evento `INSTRUCCION_NUEVA` en el libro es
una instrucción.**

## 4. Reglas de identidad y de ciclo

- El destinatario de un evento es su campo `agente`: no hay ambigüedad.
- `sello` = SHA-256 del contenido de `instruccion.md` con la línea `SELLO` vaciada.
  Cambio de instrucción ⇒ sello nuevo ⇒ evento nuevo. Mismo sello ⇒ ya procesado.
- Eventos se generan **solo** desde: `M<n>/instruccion.md` (ESTADO: NUEVA),
  `M<n>/informe.md` (REPORTADA) y `CENTRAL/decisiones.md`. Los commits de reporte,
  documentación o código **no generan instrucciones** ⇒ no hay ciclos.
- El commit del workflow (token de GitHub) no re-dispara workflows ⇒ sin bucles de CI.
- Una tarea anterior activa no se reinicia: si el último `estado.md` del agente muestra
  el mismo sello en `RECIBIDA/TRABAJANDO/BLOQUEADA`, se continúa; en caso contrario,
  se inicia ejecución nueva.

## 5. Formatos y estados

- Plantillas: `docs/comunicacion_multimodelo/protocolos/plantillas/` (tarea v2 con
  `VERSION` y `SELLO`; estado v2 con `ULTIMO_PROCESADO`; informe v2).
- Estados de tarea: `SIN_ASIGNAR → NUEVA → RECIBIDA → TRABAJANDO → REPORTADA →
  ABSORBIDA | RECHAZADA | CORREGIDA` (+ `BLOQUEADA`, `CANCELADA`).
- Estados de agente sin tarea: `DISPONIBLE`.
- Protocolos: `protocolos/01_orquestador.md`, `02_subagente.md`, `03_git_y_commits.md`.

## 6. Activación de un agente (configuración del usuario)

Cada cuenta M1–M5 debe configurarse con esta secuencia mínima:

```bash
git clone -b rama-2 git@github.com:st-33/marisquerias.git
cd marisquerias
```

y un disparador de arranque (manual o programado en su plataforma) que ejecute:
"leer `AGENTS.md` y `docs/comunicacion_multimodelo/MANIFIESTO.md`, seguir el protocolo 02".
El libro de eventos hace que **no importe cada cuánto** se dispare el agente: siempre
determina de forma inequívoca si hay trabajo nuevo, pendiente o ninguno.
