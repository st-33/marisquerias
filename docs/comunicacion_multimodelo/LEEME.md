# Sistema de orquestación multimodelo — LEEME

**Zona de comunicación:** `docs/comunicacion_multimodelo/`
**Fuente operativa única:** [`MANIFIESTO.md`](./MANIFIESTO.md) — rama, sesión activa,
mecánica de detección y estados. Cualquier modelo lee el MANIFIESTO primero; este
LEEME es solo el índice.

## Identidades

| Identidad | Rol | Entorno de trabajo |
|---|---|---|
| DeepSeek | Orquestador y constructor principal | Clon local; publica a `origin/rama-2` |
| M1–M5 | Agentes externos (Manus 1.6, cuentas separadas) | Repositorio remoto `origin/rama-2` |

La autoridad arquitectónica, la decisión y la integración final son exclusivas del
orquestador. Los resultados de M1–M5 son evidencia: se absorben, corrigen o rechazan.

## Estructura

```text
docs/comunicacion_multimodelo/
├── LEEME.md                ← este índice (solo orquestador)
├── MANIFIESTO.md           ← fuente operativa única (v2)
├── protocolos/             ← normas estables (solo orquestador)
│   ├── 01_orquestador.md   ← ciclo continuo y criterios de delegación
│   ├── 02_subagente.md     ← detección por eventos, límites y conflictos
│   ├── 03_git_y_commits.md ← commits, sincronización y anti-ciclos
│   └── plantillas/         ← tarea v2 (SELLO), estado v2, informe v2
└── sesiones/
    └── <fecha>_<slug>/     ← una carpeta por intervención
        ├── EVENTOS.json    ← libro de eventos (detección determinista)
        ├── CENTRAL/        ← plan, estado y decisiones (SOLO orquestador)
        ├── M1/ … M5/       ← carpeta exclusiva de cada agente
        │   ├── instruccion.md   (orquestador)
        │   ├── estado.md        (agente)
        │   ├── informe.md       (agente)
        │   └── procesado.json   (agente: sellos terminados)
        └── (sesiones históricas: marcadas HISTORICO.md, no operativas)
```

## Detección de trabajo (resumen)

1. El orquestador publica una instrucción → push a `rama-2`.
2. El workflow de GitHub Actions (evento push) actualiza `EVENTOS.json`; en local
   existe el mismo generador: `node herramientas/orquestacion/generar_eventos.mjs`.
3. El agente, al arrancar, lee `EVENTOS.json` y determina de forma inequívoca:
   nueva instrucción, tarea a continuar o sin trabajo (`DISPONIBLE`).

Un commit **no** es una instrucción. Solo un evento `INSTRUCCION_NUEVA` con el sello
no procesado lo es. Sin polling de historial; sin ciclos (protocolo 03 §5).

## Reglas mínimas

1. Cada agente escribe **solo** en su carpeta `M<n>/` y en el código que su tarea
   autorice explícitamente.
2. `CENTRAL/`, `protocolos/`, `plantillas/`, `MANIFIESTO.md`, `LEEME.md`, `EVENTOS.json`
   y carpetas de otros agentes son de solo lectura.
3. Todo movimiento funcional deja huella (`MIGRACION.md` local o registro consolidado
   en `docs/desfragmentaciones/`), nunca un comentario ornamental.
4. Si una pieza ya fue movida por otro proceso: rastro → destino → solo lo pendiente
   (protocolo 02 §5).
5. Un hallazgo externo no es verdad automática: el orquestador decide absorción,
   corrección o rechazo en `CENTRAL/decisiones.md`.
