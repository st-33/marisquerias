# Informe — M5 / Tarea T-M5-01

| Campo | Valor |
|---|---|
| Agente | M5 |
| Tarea | T-M5-01 |
| Sesión | `2026-08-25_admin_menu` |
| Fecha/hora UTC | `2026-08-26 05:35` |
| Estado | REPORTADA |
| Commits | `c60b1ec` (base validada); commit atómico de entrega: el commit que acompaña este informe |
| Archivos creados/modificados | `M5/informe.md`, `M5/estado.md`, `M5/procesado.json` |

## 1. Resumen ejecutivo

Se validó el evento `ev-0005` dirigido a M5: el sello publicado coincide con el SHA-256 de la instrucción local y el sello no estaba procesado [1] [2]. La línea base de TypeScript y Jest está verde: `tsc` terminó con código 0 y la suite completa registró 21 suites y 114 pruebas aprobadas. La corrida focal reconoció y ejecutó únicamente las suites de `MallaProductos` y primitivos de productos, con 12 pruebas aprobadas; `menuSafety.test.ts` quedó excluida por la configuración de Jest y su ejecución forzada terminó con “No tests found”.

El lint focal no está verde: reporta un error de Prettier en `TarjetaProducto.tsx:15` y una advertencia de dependencia de `useMemo` en `PantallaMenuAdmin.tsx:246` [5]. No se modificó código; se entrega el inventario de cobertura directa solicitado y se deja la tarea en `REPORTADA`.

## 2. Hechos confirmados

| # | Hecho | Evidencia |
|---|---|---|
| 1 | La sesión activa es `2026-08-25_admin_menu` y está en fase de descubrimiento. | `MANIFIESTO.md:20-28`; `CENTRAL/estado.md:5-7` [3] [4] |
| 2 | El evento válido de M5 es `ev-0005`, tarea `T-M5-01`, con sello `a954620e1d200728c89c95440c6e5ec87cd56b7cafccc51f5a00b35fd3838a24`. | `EVENTOS.json:43-50` [2] |
| 3 | El sello del evento coincide con el SHA-256 de `M5/instruccion.md`; `M5/procesado.json` no contenía sellos previos. | Verificación local de `sha256sum`; `procesado.json:2-4` [1] [6] |
| 4 | La estructura vigente usa `PantallaMenuAdmin`, `useGestionMenu`, bloques y editores bajo `src/ui/roles/administrador/menu/`; las rutas históricas indicadas en la instrucción fueron movidas/renombradas. | `docs/desfragmentaciones/2026-08-26_desfragmentacion_menu_admin.md:44-63` [7] |
| 5 | La configuración de Jest solo incluye patrones bajo `__tests__` o `pruebas`; por ello `src/capacidades/admin/menuSafety.test.ts`, que está suelta en el directorio, no entra en la corrida normal. | `jest.config.js:5-6`; ubicación de la suite [8] [9] |
| 6 | La suite `menuSafety.test.ts` contiene una comprobación textual que todavía apunta a `AdminMenuScreen.tsx`, ruta que ya no existe tras el renombre a `PantallaMenuAdmin.tsx`. | `menuSafety.test.ts:25-33`; destinos vigentes en [7] [9] |
| 7 | No se editaron archivos de código funcional. Los únicos movimientos de esta tarea son documentación operativa dentro de la carpeta M5. | `instruccion.md:30-44`; `git status` antes del informe |

## 3. Hipótesis y límites de certeza

La columna **cubierta** de la tabla siguiente significa “existe una suite directa para la pieza, la suite es reconocida por la configuración vigente y la prueba se ejecutó contra la ruta vigente”. No representa cobertura porcentual de líneas, ramas o mutaciones: esas métricas no fueron solicitadas ni se generó un informe de cobertura instrumental.

Una suite asociada pero excluida por `testMatch` se marca como **no** cubierta de forma efectiva. En particular, `menuSafety.test.ts` sí existe y prueba dos funciones de `menuSafety`, pero no fue ejecutada por Jest y además contiene una ruta histórica; por ello no se presenta como cobertura verde. Las pruebas de `useAdminFeatures` y `useMostradorPro` se consideran contexto administrativo o mocks indirectos, no cobertura directa de `useAdminTools` o `menu.repo.ts`.

## 4. Movimientos realizados

| Pieza | Origen | Transformación | Destino | Por qué | Hora UTC |
|---|---|---|---|---|---|
| — | — | No se realizaron movimientos funcionales. | — | La instrucción autorizó solo lectura y validación. | 2026-08-26 05:35 |

## 5. Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| `npx --no-install tsc --noEmit` | **PASS**, código de salida 0; salida vacía, sin errores de TypeScript. |
| `npm test -- --runInBand` | **PASS**, código 0; 21 suites aprobadas de 21 y 114 pruebas aprobadas de 114. Se observaron avisos de consola preexistentes, sin fallos de prueba. |
| `npx --no-install jest --runInBand` sobre `menuSafety.test.ts`, `MallaProductos.test.tsx` y `primitivosProductos.test.tsx` | **PASS parcial**, código 0; Jest ejecutó 2 suites y 12 pruebas, todas aprobadas. `menuSafety.test.ts` no fue reconocida por `testMatch`. |
| `npx --no-install jest --runTestsByPath --runInBand src/capacidades/admin/menuSafety.test.ts` | **NO EJECUTABLE**, código 1; Jest informó “No tests found” porque la configuración excluye esa ubicación. |
| `npx --no-install eslint` sobre las rutas fuente del territorio Menú | **FAIL**, código 1; 1 error y 1 advertencia. Error `prettier/prettier` en `TarjetaProducto.tsx:15`; advertencia `react-hooks/exhaustive-deps` en `PantallaMenuAdmin.tsx:246` [5]. |

## 6. Inventario de cobertura

| Pieza | Test asociado | Cubierta (sí/no) |
|---|---|---|
| `src/ui/roles/administrador/menu/PantallaMenuAdmin.tsx` | No se encontró suite directa. `menuSafety.test.ts` tiene una aserción textual, pero está excluida y apunta a una ruta histórica. | No |
| `src/ui/roles/administrador/menu/bloques/BarraCategorias.tsx` | No se encontró suite directa. | No |
| `src/ui/roles/administrador/menu/bloques/TarjetaProducto.tsx` | No se encontró suite directa. | No |
| `src/ui/roles/administrador/menu/bloques/FichaVariante.tsx` | No se encontró suite directa. | No |
| `src/ui/roles/administrador/menu/bloques/SeccionDesplegable.tsx` | No se encontró suite directa. | No |
| `src/ui/roles/administrador/menu/editores/EditorReceta.tsx` | No se encontró suite directa. | No |
| `src/ui/roles/administrador/menu/editores/EditorVariantes.tsx` | No se encontró suite directa. | No |
| `src/capacidades/menu/useGestionMenu.ts` | No se encontró suite directa. | No |
| `src/capacidades/menu/index.ts` | No se encontró suite directa; es un barril de exportación. | No |
| `src/ui/bloques/menu/MenuLayout.tsx` | No se encontró suite directa. | No |
| `src/ui/bloques/VariantsModal.tsx` | No se encontró suite directa. | No |
| `src/ui/bloques/ProductPickerOverlay.tsx` | No se encontró suite directa. | No |
| `src/ui/bloques/productos/MallaProductos.tsx` | `src/ui/bloques/productos/__tests__/MallaProductos.test.tsx`; 2 pruebas aprobadas. | Sí |
| `src/ui/primitivos/productos/TarjetaBase.tsx` | `src/ui/primitivos/productos/__tests__/primitivosProductos.test.tsx`; 2 pruebas directas aprobadas y una comprobación textual del conjunto. | Sí |
| `src/ui/primitivos/productos/EtiquetaPrecio.tsx` | `src/ui/primitivos/productos/__tests__/primitivosProductos.test.tsx`; 1 prueba directa aprobada. | Sí |
| `src/ui/primitivos/productos/ControlCantidad.tsx` | `src/ui/primitivos/productos/__tests__/primitivosProductos.test.tsx`; 2 pruebas directas aprobadas. | Sí |
| `src/ui/primitivos/productos/InsigniaEstado.tsx` | `src/ui/primitivos/productos/__tests__/primitivosProductos.test.tsx`; 1 prueba parametrizada con 4 variantes aprobadas. | Sí |
| `src/capacidades/admin/menuSafety.ts` | `src/capacidades/admin/menuSafety.test.ts`; 3 pruebas declaradas, pero la suite está fuera de `testMatch` y no se ejecutó. | No |
| `src/capacidades/admin/useAdminTools.ts` | No se encontró suite directa. | No |
| `src/sistema/persistencia/menu.repo.ts` | No se encontró suite directa; `useMostradorPro.test.ts` solo utiliza un mock de `MenuRepository`, no valida el repositorio. | No |

## 7. Bloqueos y necesidades fuera de alcance

No hubo bloqueo para ejecutar las validaciones. El error de lint y la advertencia quedan reportados sin corrección porque T-M5-01 prohíbe modificar código. La suite `menuSafety.test.ts` requiere una decisión del orquestador: moverla a una ruta incluida por `testMatch` y actualizar su referencia a `PantallaMenuAdmin.tsx`, o ajustar la configuración y el propio test en una tarea autorizada posterior.

## 8. Pendientes para otros procesos

El orquestador debe decidir si los componentes administrativos, `useGestionMenu`, las piezas compartidas (`VariantsModal`, `ProductPickerOverlay`, `menu.repo.ts`) y los candidatos a eliminar reciben suites directas antes de nuevas desfragmentaciones. También debe considerar una tarea separada para corregir el error de Prettier y revisar la dependencia de `actions` en `PantallaMenuAdmin.tsx`; M5 no aplicó esos cambios.

## 9. Propuestas

Como siguiente paso, conviene reubicar o incorporar `menuSafety.test.ts` bajo `src/**/__tests__` y actualizar la ruta histórica antes de usarla como guardia de regresión. Después, puede medirse cobertura instrumental de líneas y ramas sobre el territorio vigente, manteniendo separadas las piezas compartidas de las exclusivas del rol Administrador.

## Referencias

[1]: instruccion.md "Instrucción T-M5-01"
[2]: ../EVENTOS.json "Libro de eventos de la sesión"
[3]: ../../../../MANIFIESTO.md "Manifiesto operativo"
[4]: ../CENTRAL/estado.md "Estado central de la sesión"
[5]: ../../../../../src/ui/roles/administrador/menu/PantallaMenuAdmin.tsx "Pantalla vigente del menú"
[6]: procesado.json "Registro de sellos procesados de M5"
[7]: ../../../../../docs/desfragmentaciones/2026-08-26_desfragmentacion_menu_admin.md "Registro de desfragmentación del menú"
[8]: ../../../../../jest.config.js "Configuración de Jest"
[9]: ../../../../../src/capacidades/admin/menuSafety.test.ts "Suite de seguridad del menú"
