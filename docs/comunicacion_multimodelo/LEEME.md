# Sistema de orquestación multimodelo — LEEME

**Zona de comunicación:** `docs/comunicacion_multimodelo/`
**Rama de trabajo única:** `rama-2` (repositorio `st-33/marisquerias`)

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
├── LEEME.md                ← este índice (solo lo edita el orquestador)
├── protocolos/             ← normas estables del sistema (solo orquestador)
│   ├── 01_orquestador.md   ← ciclo del orquestador y criterios de delegación
│   ├── 02_subagente.md     ← ciclo, límites y reglas de conflicto de M1–M5
│   ├── 03_git_y_commits.md ← unidades de commit y ciclo de sincronización
│   └── plantillas/         ← formatos obligatorios de tarea, estado e informe
└── sesiones/
    └── <fecha>_<slug>/     ← una carpeta por intervención autorizada
        ├── CENTRAL/        ← plan, estado y decisiones (SOLO orquestador)
        ├── M1/             ← carpeta exclusiva del agente M1
        ├── M2/ … M5/       ← ídem
        └── (sesiones históricas se conservan intactas)
```

## Sesión activa

La sesión vigente se declara aquí. Solo hay **una** sesión activa a la vez.

**Sesión activa:** `2026-08-25_admin_menu` — **ESTADO: PENDIENTE DE AUTORIZACIÓN.**
Ningún agente debe ejecutar tareas de esa sesión mientras el orquestador no la marque
como ACTIVA en `CENTRAL/estado.md` y publique instrucciones `NUEVA`.

## Reglas mínimas (resumen)

1. Cada agente escribe **solo dentro de su carpeta** `M<n>/` de la sesión activa y en
   los archivos funcionales que su tarea autorice explícitamente.
2. `CENTRAL/`, `protocolos/`, `plantillas/` y carpetas de otros agentes son de solo lectura.
3. Toda tarea tiene `instruccion.md` (orquestador), `estado.md` (agente) e `informe.md`
   (agente) con las plantillas de `protocolos/plantillas/`.
4. Antes de trabajar: `git pull`. Después: commit atómico de la unidad terminada y push.
5. Todo movimiento funcional deja huella (archivo `MIGRACION.md` local o registro
   consolidado en `docs/desfragmentaciones/`), nunca un comentario ornamental.
6. Si una pieza ya fue movida por otro proceso: verificar el rastro, localizar el nuevo
   destino y ejecutar solo la parte pendiente (protocolo 02).
7. Un hallazgo externo no es verdad automática: el orquestador decide absorción,
   corrección o rechazo en `CENTRAL/decisiones.md`.

Los protocolos completos: `protocolos/01_orquestador.md`, `protocolos/02_subagente.md`,
`protocolos/03_git_y_commits.md`.
