# Informe — M1 / Tarea T-M1-01

| Campo | Valor |
|---|---|
| Agente | M1 |
| Tarea | T-M1-01 |
| Sesión | `2026-08-25_admin_menu` |
| Fecha/hora UTC | `2026-08-26 05:29:48 UTC` |
| Estado | REPORTADA |
| Commits | Se fijará en el commit atómico de entrega de este informe |
| Archivos creados/modificados | `M1/informe.md`, `M1/estado.md`, `M1/procesado.json` |

## 1. Resumen ejecutivo

Se inventariaron las piezas del territorio Menú/Administrador sobre la rama `rama-2`, verificando exportaciones y referencias en producción, pruebas y documentación mediante búsquedas estáticas en `src` y `app`. La mayoría de los componentes ya fue movida y renombrada por DeepSeek a `roles/administrador/menu`; M1 no repitió esos movimientos y trabajó solo en lectura.

Se clasificaron las piezas como exclusivas del módulo, compartidas con Mesero/capacidades administrativas o candidatas a huérfanas por ausencia de consumidores de producción. Se detectó una referencia funcional de prueba desactualizada a `AdminMenuScreen.tsx` después del renombrado a `PantallaMenuAdmin.tsx`, además de documentación viva que conserva nombres anteriores.

## 2. Hechos confirmados

| # | Hecho | Evidencia |
|---|---|---|
| 1 | La sesión `2026-08-25_admin_menu` está ACTIVA y T-M1-01 es un evento `INSTRUCCION_NUEVA` dirigido a M1. | `EVENTOS.json:7-13`; `CENTRAL/estado.md:5-17` |
| 2 | La pantalla actual exporta `PantallaMenuAdmin`, `PropsPantallaMenuAdmin`, `EtiquetasMenu` y `ETIQUETAS_MENU_POR_DEFECTO`. | `src/ui/roles/administrador/menu/PantallaMenuAdmin.tsx:125-157,1063` |
| 3 | La pantalla está registrada como consumidor de producción para la clave `admin_menu`. | `src/composicion/registroPantallas.ts:5,31-33` |
| 4 | La pantalla importa los bloques internos `BarraCategorias`, `TarjetaProducto`, `EditorReceta` y `EditorVariantes`. | `PantallaMenuAdmin.tsx:21-24` |
| 5 | La pantalla usa `useGestionMenu` como capacidad de gestión del módulo. | `PantallaMenuAdmin.tsx:31-35,165-175` |
| 6 | `useGestionMenu` exporta el hook y consume `MenuRepository`, `RepositorioInventario`, `useStore` y `validarProductoParaEliminar`. | `src/capacidades/menu/useGestionMenu.ts:6-18,24-26,94-97` |
| 7 | `useGestionMenu` se reexporta por los barriles de capacidades y la pantalla lo consume desde la composición superior. | `src/capacidades/menu/index.ts:1`; `src/capacidades/index.ts:7`; `PantallaMenuAdmin.tsx:31-35` |
| 8 | `BarraCategorias` es importada y renderizada por `PantallaMenuAdmin`. | `BarraCategorias.tsx:6,18`; `PantallaMenuAdmin.tsx:21,370-384` |
| 9 | `TarjetaProducto` es importada y renderizada por `PantallaMenuAdmin`. | `TarjetaProducto.tsx:7,15`; `PantallaMenuAdmin.tsx:22,421-448` |
| 10 | `EditorVariantes` usa internamente `FichaVariante` y `SeccionDesplegable`. | `EditorVariantes.tsx:20-21,225-302,460,499` |
| 11 | `EditorVariantes` y `EditorReceta` se montan desde la pantalla principal en sus flujos de edición. | `PantallaMenuAdmin.tsx:23-24,731-759` |
| 12 | `VariantsModal` y `ProductPickerOverlay` tienen consumo de producción en Mesero mediante el barril UI global. | `src/ui/index.ts:13,27`; `src/ui/pantallas/MeseroScreen.tsx:17,272-290` |
| 13 | `menuSafety` exporta `validarProductoParaEliminar` y `estaFeatureAdminHabilitada`; lo consumen capacidades de Menú, capacidades Admin y pruebas. | `src/capacidades/admin/menuSafety.ts:1-21`; `useGestionMenu.ts:11`; `useAdminFeatures.ts:7`; `menuSafety.test.ts:3`; `src/capacidades/admin/index.ts:3` |
| 14 | `useAdminTools` solo aparece exportado por el barril Admin y no tiene consumidor funcional detectado. | `src/capacidades/admin/index.ts:2`; `src/capacidades/admin/useAdminTools.ts:24` |
| 15 | `MenuLayout` exporta `MenuLayout`, pero no tiene consumidor de producción detectado. | `src/ui/bloques/menu/MenuLayout.tsx:5-17`; búsqueda `git grep` en `src` y `app` |
| 16 | `MallaProductos` solo es usada por su suite de pruebas; no tiene consumidor de producción detectado. | `src/ui/bloques/productos/MallaProductos.tsx:4,14`; `src/ui/bloques/productos/__tests__/MallaProductos.test.tsx:2,13-58` |
| 17 | Los primitivos `ControlCantidad`, `EtiquetaPrecio`, `InsigniaEstado` y `TarjetaBase` solo tienen consumidores detectados en pruebas, no en producción. | `src/ui/primitivos/productos/*.tsx`; `src/ui/primitivos/productos/__tests__/primitivosProductos.test.tsx:4-7,38-205` |
| 18 | Las seis piezas visuales exclusivas fueron movidas y renombradas hacia `roles/administrador/menu`; M1 verificó el rastro y continuó desde sus destinos actuales. | `src/ui/bloques/MIGRACION.md:6-16`; `docs/desfragmentaciones/2026-08-26_desfragmentacion_menu_admin.md:44-63` |
| 19 | `VariantsModal`, `ProductPickerOverlay`, `menu.repo.ts` y `menuSafety` permanecen compartidas o fuera de apropiación exclusiva. | `src/ui/bloques/MIGRACION.md:18-24`; `docs/desfragmentaciones/2026-08-26_desfragmentacion_menu_admin.md:28-30,59-63` |

## 3. Tabla pieza → consumidores

| Pieza | Símbolos exportados | Consumidores detectados (archivo:línea) | Clasificación |
|---|---|---|---|
| `src/ui/roles/administrador/menu/PantallaMenuAdmin.tsx` (origen `AdminMenuScreen.tsx`) | `PantallaMenuAdmin`, `PropsPantallaMenuAdmin`, `EtiquetasMenu`, `ETIQUETAS_MENU_POR_DEFECTO` | `src/composicion/registroPantallas.ts:5,31-32`; consumo interno de sus bloques y `useGestionMenu`: `PantallaMenuAdmin.tsx:21-35,172,370-759` | `EXCLUSIVA_MENU` |
| `src/capacidades/menu/useGestionMenu.ts` (origen `useMenuManagement.ts`) | `useGestionMenu` | `PantallaMenuAdmin.tsx:31-35,172-175`; reexportado por `src/capacidades/menu/index.ts:1` y `src/capacidades/index.ts:7` | `EXCLUSIVA_MENU` con dependencias compartidas |
| `src/ui/roles/administrador/menu/bloques/BarraCategorias.tsx` (origen `CategorySidebar.tsx`) | `BarraCategorias`, `BarraCategoriasProps` | `PantallaMenuAdmin.tsx:21,370-384` | `EXCLUSIVA_MENU` |
| `src/ui/roles/administrador/menu/bloques/TarjetaProducto.tsx` (origen `ProductCard.tsx`) | `TarjetaProducto` | `PantallaMenuAdmin.tsx:22,421-448` | `EXCLUSIVA_MENU` |
| `src/ui/roles/administrador/menu/bloques/FichaVariante.tsx` (origen `VariantChip.tsx`) | `FichaVariante` | `EditorVariantes.tsx:21,460`; consumo interno del editor del módulo | `EXCLUSIVA_MENU` |
| `src/ui/roles/administrador/menu/bloques/SeccionDesplegable.tsx` (origen `CollapsibleSection.tsx`) | `SeccionDesplegable` | `EditorVariantes.tsx:20,225-302,499`; consumo interno del editor del módulo | `EXCLUSIVA_MENU` |
| `src/ui/roles/administrador/menu/editores/EditorReceta.tsx` (origen `RecipeEditor.tsx`) | `EditorReceta`, `ItemInventario` | `PantallaMenuAdmin.tsx:23,749` | `EXCLUSIVA_MENU` |
| `src/ui/roles/administrador/menu/editores/EditorVariantes.tsx` (origen `VariantEditor.tsx`) | `EditorVariantes` | `PantallaMenuAdmin.tsx:24,731`; consume `FichaVariante` y `SeccionDesplegable` | `EXCLUSIVA_MENU` |
| `src/ui/bloques/VariantsModal.tsx` | `VariantsModal` | `src/ui/index.ts:27`; `src/ui/pantallas/MeseroScreen.tsx:17,283-290` | `COMPARTIDA` con Mesero |
| `src/ui/bloques/ProductPickerOverlay.tsx` | `ProductPickerOverlay` | `src/ui/index.ts:13`; `src/ui/pantallas/MeseroScreen.tsx:17,272-280` | `COMPARTIDA` con Mesero |
| `src/capacidades/admin/menuSafety.ts` | `validarProductoParaEliminar`, `estaFeatureAdminHabilitada` | `useGestionMenu.ts:11`; `useAdminFeatures.ts:7`; `menuSafety.test.ts:3`; `src/capacidades/admin/index.ts:3` | `COMPARTIDA` entre Menú y capacidades Admin |
| `src/ui/bloques/menu/MenuLayout.tsx` | `MenuLayout`, `MenuLayoutProps` | Ninguno detectado en producción mediante `git grep`; la propia huella lo marca como candidato | `HUERFANA_CANDIDATA` |
| `src/ui/bloques/productos/MallaProductos.tsx` | `MallaProductos`, `MallaProductosProps` | Solo `src/ui/bloques/productos/__tests__/MallaProductos.test.tsx:2,13-58`; ninguno en producción | `HUERFANA_CANDIDATA` (test-only) |
| `src/ui/primitivos/productos/ControlCantidad.tsx` | `ControlCantidad`, `ControlCantidadProps` | Solo `src/ui/primitivos/productos/__tests__/primitivosProductos.test.tsx:7,124-156` | `HUERFANA_CANDIDATA` (test-only) |
| `src/ui/primitivos/productos/EtiquetaPrecio.tsx` | `EtiquetaPrecio`, `EtiquetaPrecioProps`, `FormateadorPrecio` | Solo `primitivosProductos.test.tsx:6,106-119` | `HUERFANA_CANDIDATA` (test-only) |
| `src/ui/primitivos/productos/InsigniaEstado.tsx` | `InsigniaEstado`, `InsigniaEstadoProps`, `VarianteInsigniaEstado` | Solo `primitivosProductos.test.tsx:4,176-179` | `HUERFANA_CANDIDATA` (test-only) |
| `src/ui/primitivos/productos/TarjetaBase.tsx` | `TarjetaBase`, `TarjetaBaseProps` | Solo `primitivosProductos.test.tsx:5,38-92` | `HUERFANA_CANDIDATA` (test-only) |
| `src/capacidades/admin/useAdminTools.ts` | `useAdminTools` | Solo reexportado por `src/capacidades/admin/index.ts:2`; sin consumidor funcional detectado | `HUERFANA_CANDIDATA` |

## 4. Hipótesis y límites de certeza

La clasificación se basa en búsqueda estática de rutas y símbolos en el código rastreado por Git dentro de `src` y `app`, incluyendo diferenciación entre producción, pruebas y documentación. No demuestra usos dinámicos construidos por cadena, consumidores fuera de esas carpetas o usos en configuraciones generadas fuera del repositorio.

`HUERFANA_CANDIDATA` no significa que la pieza pueda eliminarse de inmediato. Significa que no se detectó consumidor de producción en esta búsqueda. La decisión de eliminarla corresponde al orquestador después de la evidencia adicional de M4, revisión histórica y validación de compilación/pruebas.

`menuSafety` se clasificó como compartida por sus consumidores en `useGestionMenu` y `useAdminFeatures`; eso no implica que toda la carpeta `capacidades/admin` pertenezca al módulo Menú.

Los registros de migración confirman movimientos anteriores, pero `docs/desfragmentaciones/2026-08-26_desfragmentacion_menu_admin.md` conserva algunos nombres previos en sus secciones de mapa y estructura. Se trata de documentación desactualizada o viva pendiente de consolidación, no de evidencia de consumidores funcionales actuales.

## 5. Movimientos realizados por M1

| Pieza | Origen | Transformación | Destino | Por qué | Hora UTC |
|---|---|---|---|---|---|
| Ninguna | — | M1 no movió, renombró ni editó código | — | La instrucción T-M1-01 era exclusivamente de lectura; los movimientos observados fueron realizados previamente por DeepSeek | — |

## 6. Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| `git fetch`, checkout y sincronización con `origin/rama-2` | Correcto; base analizada: `c60b1ec` |
| Lectura de `AGENTS.md`, `MANIFIESTO.md`, `EVENTOS.json`, `CENTRAL/estado.md`, instrucción y protocolo 02 | Correcta; sesión ACTIVA y evento M1 nuevo confirmados |
| `git grep` de exportaciones, símbolos y rutas en `src` y `app` | Correcto; se distinguieron producción, pruebas y documentación |
| Verificación de rastro de piezas movidas | Correcta mediante `MIGRACION.md` y registro consolidado |
| Búsqueda de referencias antiguas | Detectó una referencia residual en `src/capacidades/admin/menuSafety.test.ts:27` a `AdminMenuScreen.tsx` |
| `npx tsc --noEmit` | No ejecutado por M1; la tarea era de lectura y no autorizaba validación de código mediante modificación |
| `npm test` | No ejecutado por M1; fuera de la necesidad inmediata del inventario |

## 7. Bloqueos y necesidades fuera de alcance

1. `src/capacidades/admin/menuSafety.test.ts:27` apunta a `../../../ui/roles/administrador/menu/AdminMenuScreen.tsx`, pero el archivo actual se llama `PantallaMenuAdmin.tsx`. Debe corregirse por el propietario/orquestador de esa pieza antes de considerar la suite plenamente coherente.
2. El registro `docs/desfragmentaciones/2026-08-26_desfragmentacion_menu_admin.md` conserva nombres y estructura anteriores en varias secciones, aunque `src/ui/bloques/MIGRACION.md` ya registra destinos españoles. Su consolidación documental queda fuera del alcance de M1.
3. La eliminación de `MenuLayout`, `MallaProductos`, los cuatro primitivos de productos y `useAdminTools` requiere la decisión y evidencia de M4; M1 no los elimina.
4. `VariantsModal`, `ProductPickerOverlay`, `menu.repo.ts` y `menuSafety` no deben apropiarse como piezas exclusivas de Menú sin resolver primero sus consumidores compartidos.

## 8. Pendientes para otros procesos

DeepSeek debe absorber este inventario contra el código actual, decidir qué clasificaciones acepta y coordinar la corrección de la referencia residual del test. M4 debe validar los candidatos a huérfanos; M2 y M3 deben complementar, respectivamente, el análisis de esquema/RTDB y duplicación/contratos. M1 queda disponible para una nueva instrucción con sello distinto.

## 9. Propuestas

Como propuesta no ejecutada, corregir la ruta residual de `menuSafety.test.ts` a `PantallaMenuAdmin.tsx`, actualizar el registro consolidado con los nombres actuales y repetir `npx tsc --noEmit`, `npm test` y el lint focalizado después de que el orquestador autorice esa intervención.
