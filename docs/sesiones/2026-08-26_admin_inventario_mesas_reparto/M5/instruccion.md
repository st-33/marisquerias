# Tarea T-M5-01 — Línea base de validación y cobertura (territorio inventario/mesas/reparto)

| Campo | Valor |
|---|---|
| ID | `T-M5-01` |
| VERSION | `1` |
| Sesión | `2026-08-26_admin_inventario_mesas_reparto` |
| Agente | M5 |
| Publicada | `2026-08-26 06:00 UTC` |
| ESTADO | NUEVA |
| SELLO | |

## 1. Objetivo
Fases 1–2 (solo lectura): establecer la línea base de calidad del territorio y el
inventario de cobertura de pruebas. Si al momento de tu ejecución los informes de
M1–M3 ya están publicados, verifica además que sus movimientos no rompan tsc/jest.

## 2. Contexto mínimo
Rama `rama-2`. En el ciclo anterior tu línea base fue: tsc 0, 21 suites/114 tests verdes,
lint con error de formato y warning de exhaustive-deps. Ahora el territorio cambió:
Inventario/Mesas/Reparto.

## 3. Ruta inicial
`package.json` (scripts `check-types`, `test`, `lint`)

## 4. Alcance
`src/ui/roles/administrador/inventario/`, `src/ui/roles/administrador/mesas/`,
`src/capacidades/inventario/`, `src/capacidades/mesas/`, `src/capacidades/reparto/`

## 5. Límites
Solo lectura y ejecución de validaciones. **No edites código ni hagas fixes**; reporta.

## 6. Qué verificar
1. `npx tsc --noEmit` (errores que toquen el territorio).
2. `npx jest` (suites relevantes: inventario, mesas, reparto si existen).
3. `npx eslint <rutas del territorio>` (errores/advertencias).
4. Inventario de tests: por pieza del alcance, ¿existe un `*.test.*` que la cubra?
5. Si los informes de M1–M3 ya están publicados y movieron piezas: re-ejecuta tsc y
   jest y reporta el estado post-movimientos.

## 7. Evidencia que debe producir
Tabla de validaciones `| validación | resultado |` y tabla de cobertura
`| pieza | test asociado | cubierta (sí/no) |`.

## 8. Puede modificar
Ninguno. Solo tu carpeta `M5/`.

## 9. No puede modificar
Código, `CENTRAL/`, otras carpetas M*, `EVENTOS.json`, `ACTIVACIONES.json`,
`MANIFIESTO.md`, `AGENTS.md`, protocolos y plantillas.

## 10. Qué debe documentar
Informe oficial con las dos tablas.

## 11. Cuándo hacer commit
Un commit al entregar: `docs(multimodelo/M5): línea base inventario-mesas-reparto`.

## 12. Qué debe reportar
Resultados exactos de tsc/jest/lint y cobertura por pieza.

## 13. Condición de terminado
Las tres validaciones ejecutadas con resultado capturado y cobertura listada.

## 14. Si encuentra una contradicción
Reportarla con evidencia.

## 15. Si la pieza ya fue movida
Verifica rastro y valida desde el estado real.

## 16. Si necesita salir del límite
Detente y repórtalo.
