# Tarea T-M4-01 — Huérfanos y candidatos a eliminación (territorio inventario/mesas/reparto)

| Campo | Valor |
|---|---|
| ID | `T-M4-01` |
| VERSION | `1` |
| Sesión | `2026-08-26_admin_inventario_mesas_reparto` |
| Agente | M4 |
| Publicada | `2026-08-26 06:00 UTC` |
| ESTADO | NUEVA |
| SELLO | |

## 1. Objetivo
Fases 1–2 (solo lectura): detectar piezas sin consumidores reales en el territorio
Inventario/Mesas/Reparto y producir la lista de candidatos a eliminación con evidencia.
**No eliminas nada**: el orquestador decide la eliminación.

## 2. Contexto mínimo
Rama `rama-2`. En el ciclo anterior (sesión de menú) las piezas huérfanas las eliminó
el orquestador tras confirmación. Tu trabajo es la evidencia; la decisión es de DeepSeek.

## 3. Ruta inicial
`src/ui/roles/administrador/inventario/`, `src/ui/roles/administrador/mesas/`,
`src/capacidades/inventario/`, `src/capacidades/mesas/`, `src/capacidades/reparto/`

## 4. Alcance
Todas las piezas de esos directorios + piezas relacionadas que detectes (consumidas o
no) en `ui/bloques/`, `ui/primitivos/`, `capacidades/` que pertenezcan al territorio.

## 5. Límites
Solo lectura estricta. **Prohibido eliminar, mover o editar código.** Dispositivos y
otros roles fuera de alcance.

## 6. Qué verificar
Para cada pieza sospechosa: `grep -rn` de su nombre y ruta en `src` y `app`; exports de
barril (`ui/index.ts`, `capacidades/index.ts`); imports dinámicos (`require`, `import(`);
referencias en `composicion/registroPantallas.ts` y en tests. Veredicto por pieza:
HUERFANA_CONFIRMADA / VIVA_POR / INDETERMINADA.

## 7. Evidencia que debe producir
Tabla `| pieza | ¿en barril? | ¿consumidor estático? | ¿dinámico? | veredicto |` con los
comandos de búsqueda usados.

## 8. Puede modificar
Ninguno. Solo tu carpeta `M4/`.

## 9. No puede modificar
Código, `CENTRAL/`, otras carpetas M*, `EVENTOS.json`, `ACTIVACIONES.json`,
`MANIFIESTO.md`, `AGENTS.md`, protocolos y plantillas.

## 10. Qué debe documentar
Informe oficial con la tabla y la lista priorizada de candidatos.

## 11. Cuándo hacer commit
Un commit al entregar: `docs(multimodelo/M4): huérfanos inventario-mesas-reparto`.

## 12. Qué debe reportar
La tabla completa y el veredicto por pieza.

## 13. Condición de terminado
Todas las piezas del alcance con veredicto respaldado por búsqueda.

## 14. Si encuentra una contradicción
Reportarla con evidencia.

## 15. Si la pieza ya fue movida o eliminada
Verifica rastro (git log --follow, MIGRACION.md, docs/desfragmentaciones/) y ajusta el
veredicto al estado real; no repitas trabajo ya hecho.

## 16. Si necesita salir del límite
Detente y repórtalo.
