# Informe — M4 / Tarea T-M4-01

| Campo | Valor |
|---|---|
| Agente | M4 |
| Tarea | T-M4-01 |
| Sesión | `2026-08-25_admin_menu` |
| Fecha/hora UTC | `2026-08-26 05:37` |
| Estado | REPORTADA |
| Commits | Este commit de entrega |
| Archivos creados/modificados | `M4/informe.md`, `M4/estado.md`, `M4/procesado.json` |

## 1. Resumen ejecutivo

Se auditó el conjunto de piezas sospechosas en el snapshot `c60b1ec`, antes de sincronizar los informes de los demás agentes. Las búsquedas en `src` y `app`, barriles, cargas dinámicas, registro de pantallas, ruta Expo y tests mostraron que las siete piezas no tenían consumidor de producción; las referencias restantes eran definiciones, tests o documentación. El sello de T-M4-01 coincidió con `ev-0004`.

Durante la sincronización previa a publicar, `origin/rama-2` avanzó hasta `8725b27` y se observó el commit previo `68206da` (`refactor(admin): eliminar piezas huérfanas del territorio Menú`), que ya eliminó las siete piezas y sus tests. **M4 no realizó esas eliminaciones ni modificó código**; solo documenta la evidencia obtenida y el estado actual. La decisión de eliminación ya quedó materializada fuera de esta unidad de trabajo.

## 2. Hechos confirmados

| # | Hecho | Evidencia (ruta:línea o commit) |
|---|---|---|
| 1 | El evento dirigido a M4 existe, es `INSTRUCCION_NUEVA`, corresponde a T-M4-01 y su sello no estaba en `procesado.json` al iniciar. | `EVENTOS.json:34-40`; `M4/procesado.json:2-3` en el snapshot inicial |
| 2 | La sesión está activa en fase de descubrimiento. | `MANIFIESTO.md:20-28`; `CENTRAL/estado.md:5-17` |
| 3 | El sello calculado del archivo de instrucción con la línea `SELLO` vacía es `99c58af8d7026846312430f01fd9e4b8020b248391243d2a09dacaa298e7865e`, igual al del evento. | `M4/instruccion.md:5-11`; `EVENTOS.json:34-40`; `sha256sum` ejecutado antes del análisis |
| 4 | La ruta Expo del menú administrador delega a `admin_menu` y no importa ninguna pieza sospechosa. | `app/_role/admin/menu.tsx:6-17` |
| 5 | El registro resuelve `admin_menu` hacia `PantallaMenuAdmin`; el resolvedor hace lookup estático y no usa `require` ni `import()` para componentes. | `src/composicion/registroPantallas.ts:1-43`; `src/composicion/resolvedorPantalla.tsx:24-49` |
| 6 | La pantalla activa consume piezas nuevas/localizadas (`BarraCategorias`, `TarjetaProducto`, `EditorReceta`, `EditorVariantes`) y capacidades vivas, pero no consume las siete sospechosas ni `useAdminTools`. | `src/ui/roles/administrador/menu/PantallaMenuAdmin.tsx:21-35` en `c60b1ec` |
| 7 | `src/ui/index.ts` no reexportaba ninguna pieza UI sospechosa. | `src/ui/index.ts:1-27` en `c60b1ec` |
| 8 | `useAdminTools` sí estaba expuesta por `src/capacidades/admin/index.ts:2` y transitivamente por `src/capacidades/index.ts:1`, pero no tenía consumidor nombrado en `src`/`app`. La exportación fue retirada por el commit de eliminación previo. | `src/capacidades/admin/index.ts:1-4` y `src/capacidades/index.ts:1-4` en `c60b1ec`; `68206da` |
| 9 | No se hallaron cargas dinámicas dirigidas a las sospechosas ni a los barriles. Tampoco hubo imports de espacio de nombres que pudieran ocultar el uso del símbolo. | Búsquedas focales `git grep --no-color -n -I -E '(require|import)\\([^)]*(MenuLayout|MallaProductos|ControlCantidad|EtiquetaPrecio|InsigniaEstado|TarjetaBase|useAdminTools)' -- src app` e imports namespace; sin resultados dirigidos |
| 10 | Las únicas referencias adicionales detectadas en el snapshot auditado eran tests unitarios: un test de `MallaProductos` y un test compartido de los cuatro primitivos. | `src/ui/bloques/productos/__tests__/MallaProductos.test.tsx:2-51`; `src/ui/primitivos/productos/__tests__/primitivosProductos.test.tsx:4-197` en `c60b1ec` |
| 11 | El commit previo `68206da` eliminó exactamente las siete piezas y los dos archivos de test asociados; M4 no fue autor de ese commit. | `git show --format=fuller --name-status 68206da`; autor/commit `st-33`, fecha `2026-08-25 23:23:40 -0600` |
| 12 | En el HEAD sincronizado `8725b27`, las siete rutas ya no existen. | Comprobación de existencia en `rama-2` tras `git pull --rebase`: siete resultados `ELIMINADA`; historial `8725b27` |

### Tabla de veredictos

> El veredicto se refiere al snapshot auditado `c60b1ec`, en el que las piezas aún estaban presentes. Una definición propia no cuenta como consumidor; una exportación de barril tampoco cuenta como uso del símbolo.

| pieza | ¿exportada en barril? | ¿consumidor estático? | ¿dinámico? | veredicto |
|---|---|---|---|---|
| `src/ui/bloques/menu/MenuLayout.tsx` | No | No; solo definición (`:17`) | No | **HUERFANA_CONFIRMADA** |
| `src/ui/bloques/productos/MallaProductos.tsx` | No | No en producción; solo test (`__tests__/MallaProductos.test.tsx:2`) | No | **HUERFANA_CONFIRMADA** |
| `src/ui/primitivos/productos/ControlCantidad.tsx` | No | No en producción; solo test (`__tests__/primitivosProductos.test.tsx:7`) | No | **HUERFANA_CONFIRMADA** |
| `src/ui/primitivos/productos/EtiquetaPrecio.tsx` | No | No en producción; solo test (`__tests__/primitivosProductos.test.tsx:6`) | No | **HUERFANA_CONFIRMADA** |
| `src/ui/primitivos/productos/InsigniaEstado.tsx` | No | No en producción; solo test (`__tests__/primitivosProductos.test.tsx:4`) | No | **HUERFANA_CONFIRMADA** |
| `src/ui/primitivos/productos/TarjetaBase.tsx` | No | No en producción; solo test (`__tests__/primitivosProductos.test.tsx:5`) | No | **HUERFANA_CONFIRMADA** |
| `src/capacidades/admin/useAdminTools.ts` | Sí: `admin/index.ts:2`, transitivamente `capacidades/index.ts:1` | No; solo definición (`:24`) y reexportación | No | **HUERFANA_CONFIRMADA** |

### Candidatos confirmados y situación actual

| Candidato | Situación actual en `8725b27` | Movimiento observado |
|---|---|---|
| `src/ui/bloques/menu/MenuLayout.tsx` | Eliminado antes de la entrega de M4 | `D` en `68206da` |
| `src/ui/bloques/productos/MallaProductos.tsx` y su test | Eliminados antes de la entrega de M4 | `D` en `68206da` |
| `src/ui/primitivos/productos/ControlCantidad.tsx` | Eliminado antes de la entrega de M4 | `D` en `68206da` |
| `src/ui/primitivos/productos/EtiquetaPrecio.tsx` | Eliminado antes de la entrega de M4 | `D` en `68206da` |
| `src/ui/primitivos/productos/InsigniaEstado.tsx` | Eliminado antes de la entrega de M4 | `D` en `68206da` |
| `src/ui/primitivos/productos/TarjetaBase.tsx` y su test | Eliminados antes de la entrega de M4 | `D` en `68206da` |
| `src/capacidades/admin/useAdminTools.ts` | Eliminado antes de la entrega de M4 | `D` en `68206da`; retirada también su exportación de `admin/index.ts` |

## 3. Hipótesis y límites de certeza

El veredicto **HUERFANA_CONFIRMADA** está acotado al árbol versionado `src`/`app` del snapshot `c60b1ec` y a las formas de consumo solicitadas. `useAdminTools` tenía una exportación pública local, de modo que no podía descartarse un consumidor externo al repositorio; no se encontró ninguno dentro del árbol consultado. Las referencias en `docs/desfragmentaciones/` y `MIGRACION.md` se trataron como documentación, no como consumo funcional.

La ausencia de consumidores no fue una autorización para borrar. El movimiento posterior quedó registrado en `68206da` antes de la entrega de M4; por eso M4 no repitió la eliminación ni alteró los archivos de otros agentes.

## 4. Movimientos realizados

| Pieza | Origen | Transformación | Destino | Por qué | Hora UTC |
|---|---|---|---|---|---|
| Todas las sospechosas | Rutas históricas de plataforma/catalogo y snapshot `c60b1ec` | M4 solo verificó rastro y consumo; no movió ni eliminó | Estado eliminado por commit externo `68206da` | Evitar repetir una transformación ya realizada | 2026-08-26 05:25–05:35 |

Trazabilidad consultada con `git log --follow --find-renames --name-status`:

- `MenuLayout` fue copiada desde `src/catalogo/_compartido/bloques/menu/MenuLayout.tsx` a `src/ui/bloques/menu/MenuLayout.tsx` (`C100`, `bb17ca9`).
- `MallaProductos` fue renombrada desde `src/plataforma/ui/componentes/catalogo/GridCatalogo.tsx` (`R077`, `09f7fec`).
- `ControlCantidad`, `EtiquetaPrecio`, `InsigniaEstado` y `TarjetaBase` fueron renombradas desde sus equivalentes en `src/plataforma/ui/primitivos/catalogo/` (`R096`, `R075`, `R081`, `R093`, `09f7fec`).
- `useAdminTools` fue copiada desde `src/plataforma/dominios/alimentos_y_bebidas/useAdminTools.ts` a `src/capacidades/admin/useAdminTools.ts` (`C097`, `bb17ca9`).
- No apareció un destino posterior con consumidores ocultos; el siguiente movimiento relevante fue la eliminación explícita en `68206da`.

## 5. Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| Verificación de sello de instrucción | PASS: SHA-256 `99c58af8d7026846312430f01fd9e4b8020b248391243d2a09dacaa298e7865e`, igual a `ev-0004` |
| Búsqueda de símbolos y rutas en `src` y `app` en `c60b1ec` | PASS: sin consumidores de producción para las siete sospechosas; referencias de test identificadas |
| Búsqueda de `require`/`import()` dirigida | PASS: sin cargas dinámicas de las siete sospechosas ni sus barriles |
| Revisión de barriles, registro y resolvedor | PASS: sin referencias UI sospechosas; `useAdminTools` solo estaba reexportada; menú activo resolvía a `PantallaMenuAdmin` |
| Tests focales en `c60b1ec` antes de sincronizar | PASS: 2 suites, 12 tests |
| `./node_modules/.bin/tsc --noEmit` en HEAD `8725b27` | PASS, salida 0 |
| `./node_modules/.bin/jest --runInBand` en HEAD `8725b27` | PASS: 19 suites, 102 tests |
| `git diff --check` | PASS |
| Alcance de cambios de M4 | PASS: solo `M4/informe.md`, `M4/estado.md` y `M4/procesado.json`; ningún archivo de código o de otros agentes |

## 6. Bloqueos y necesidades fuera de alcance

No hay bloqueo para la detección. La eliminación ya aparece en `68206da`, un commit previo a la publicación de M4. M4 no puede atribuirse ese movimiento ni modificar archivos de otros agentes. Cualquier revisión posterior de la eliminación o de contratos externos de `useAdminTools` corresponde al orquestador.

## 7. Pendientes para otros procesos

El orquestador debe incorporar este informe como confirmación independiente de la decisión ya ejecutada en `68206da`. Conviene verificar si la eliminación de los tests fue intencional y si existe algún contrato externo de `useAdminTools` antes de cerrar definitivamente el ciclo.

## 8. Propuestas

Conservar `68206da` como rastro de la eliminación ya aplicada y evitar un segundo commit de borrado. Si se requiere una comprobación adicional, repetir una búsqueda global después de cualquier incorporación de consumidores externos o aliases nuevos.
