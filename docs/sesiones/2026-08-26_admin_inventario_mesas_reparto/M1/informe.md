# Informe — M1 / Tarea T-M1-01

| Campo | Valor |
|---|---|
| Agente | M1 |
| Tarea | T-M1-01 |
| Versión | `1` |
| Sesión | `2026-08-26_admin_inventario_mesas_reparto` |
| Fecha/hora UTC | `2026-08-26 06:41:15 UTC` |
| Estado | REPORTADA |
| Commit de entrega | Pendiente al momento de redactar; se fijará en el commit de documentación |
| Archivos creados/modificados | `M1/informe.md`, `M1/estado.md`, `M1/procesado.json` |

## 1. Resumen ejecutivo

Se ejecutó el mapeo estático del módulo **Inventario del rol Administrador** sobre `rama-2`, cubriendo la pantalla contenedora, el panel visual, la capacidad de negocio, los selectores del store, el repositorio V2, los contratos, barriles y consumidores detectables en `src` y `app`. Se respetó la exclusión de Dispositivos y no se investigaron sus piezas internas.

El territorio visual y lógico propio ya se encuentra en la ubicación canónica `src/ui/roles/administrador/inventario/` y `src/capacidades/inventario/`. No se detectaron piezas visuales o lógicas exclusivas de Inventario dispersas fuera de esas carpetas que puedan reunirse con seguridad en fase 3. La “caja” del módulo ya está formada; por tanto, M1 no ejecutó movimientos funcionales.

La infraestructura de persistencia, store V2 y contratos es **compartida** con Menú, Cocina, Métricas, Mostrador y Mesero. No debe moverse ni apropiarse. Se detectaron dependencias semánticas sobre `catalog`, `areas`, `sections`, `stock`, `hubId`, descuentos y rutas `inventory_v2`.

## 2. Hechos confirmados

| # | Hecho | Evidencia |
|---|---|---|
| 1 | La sesión `2026-08-26_admin_inventario_mesas_reparto` está ACTIVA y las fases 1–3 están delegadas; la fase 4 está reservada al orquestador. | `CENTRAL/estado.md:5-7,29-36`; `MANIFIESTO.md:20-28` |
| 2 | T-M1-01 es una instrucción nueva para M1 con sello `e7762ebfae22...` y alcance Inventario: mapear, documentar y reunir exclusivas. | `EVENTOS.json:5-14`; `M1/instruccion.md:13-16,27-33` |
| 3 | El arranque, la detección por `EVENTOS.json`, la regla anti-duplicado y los límites de escritura se respetaron. | `AGENTS.md:6-19,24-39`; `MANIFIESTO.md:30-58`; `M1/procesado.json:1-4` |
| 4 | `AdminInventoryScreen` es la pantalla contenedora del módulo y monta `PanelInventario`. | `src/ui/roles/administrador/inventario/AdminInventoryScreen.tsx:1-20` |
| 5 | El registro global publica `AdminInventoryScreen` como la pantalla de producción para `admin_inventory`. | `src/composicion/registroPantallas.ts:7,37-39` |
| 6 | La ruta de aplicación `/_role/admin/inventory` resuelve la clave `admin_inventory`; el menú de administración expone la entrada Inventario. | `app/_layout.tsx:32`; `app/_role/admin/index.tsx:30-35`; `app/_role/admin/inventory.tsx:9-10` |
| 7 | `PanelInventario` contiene en línea el flujo visual de áreas, contenedores, secciones, ítems, stock y modales de creación/ajuste. | `src/ui/roles/administrador/inventario/PanelInventario/index.tsx:32-63,87-213,286-780` |
| 8 | `PanelInventario` consume `useInventarioAvanzado`, `usePuenteAccionesFlotantes` y tipos de contratos de Inventario. | `PanelInventario/index.tsx:17-24,45-58,215-230` |
| 9 | `useInventarioAvanzado` ya está en `src/capacidades/inventario/`, exporta la capacidad propia y expone catálogo, secciones, áreas, carga, stock y acciones CRUD/ajuste. | `src/capacidades/inventario/index.ts:1`; `useInventarioAvanzado.ts:19-30,34-63,67-141` |
| 10 | `useInventarioAvanzado` delega acciones a `useInventoryV2Store` y tipa sus entradas con `AreaInventario` e `InsumoInventario`. | `useInventarioAvanzado.ts:14-17,67-130`; `src/sistema/persistencia/contratos-inventario.ts:1-12` |
| 11 | `useInventoryCatalog` tiene consumidores en la capacidad Inventario, la pantalla Menú y Métricas; no es exclusivo de Inventario. | `src/sistema/store/index.ts:139`; `useInventarioAvanzado.ts:9-25`; `src/ui/roles/administrador/menu/PantallaMenuAdmin.tsx:31,91`; `src/capacidades/metricas/useMetricasVentas.ts:10,37` |
| 12 | `useInventoryAreas` tiene consumidores en la capacidad Inventario y la pantalla Menú; sus datos también son usados mediante el store/repositorio por POS y Cocina. | `src/sistema/store/index.ts:140`; `useInventarioAvanzado.ts:9-27`; `PantallaMenuAdmin.tsx:31,92`; `src/capacidades/pos/useMostradorPro.ts:70,228-233`; `src/capacidades/cocina/SincronizadorCocina.ts:43-44` |
| 13 | `useInventorySections` y `useInventoryV2Store` son superficie compartida del store V2; `useInventoryV2Store` es consumido también por Cocina y analítica de Métricas. | `src/sistema/store/index.ts:141,196`; `useInventarioAvanzado.ts:11-12,24-30`; `src/capacidades/cocina/SincronizadorCocina.ts:7,43-72`; `src/capacidades/metricas/analitica/usePrediccionStock.ts:9,23-29` |
| 14 | `InventoryV2Repository` y sus contratos son infraestructura compartida; se consumen desde Inventario, Menú, POS, Cocina y Mesero. | `src/sistema/persistencia/inventory.v2.repo.ts:23-115`; `src/sistema/persistencia/contratos-inventario.ts:1-12`; `src/capacidades/pos/useMostradorPro.ts:11,70`; `src/roles/logica/cocina/useCocinaLogic.ts:15,242-243`; `src/roles/logica/mesero/useMeseroLogic.ts:13,76`; `src/capacidades/menu/useGestionMenu.ts:9,26` |
| 15 | El contrato base de Inventario define tres secciones (`alimentos`, `losa_cristaleria`, `otros`), ítems con unidad/minStock y áreas con `hubId`, `sectionId`, `parentId` y `stock`. | `src/sistema/persistencia/inventory.v2.repo.ts:25-63` |
| 16 | Cocina lee `catalog` y `areas`, consolida stock y ejecuta ajustes; no consume la pantalla Admin, pero sí depende de la semántica V2 compartida. | `src/capacidades/cocina/SincronizadorCocina.ts:40-99` |
| 17 | POS usa `InventoryV2Repository`, resuelve áreas por `hubId='venta_crudo'` y descuenta stock online/offline. | `src/capacidades/pos/useMostradorPro.ts:68-85,225-246,287-314` |
| 18 | Métricas consume `useInventoryCatalog` para derivar indicadores de bajo stock; esto impide mover el selector o su store al módulo Inventario. | `src/capacidades/metricas/useMetricasVentas.ts:35-39,204-207` |
| 19 | No se detectaron piezas exclusivas dispersas con nombres tipo `inventario`, `stock`, `area`, `almacen` o `bodega` dentro de `src/ui/bloques`, `src/ui/primitivos` o `src/capacidades`, aparte de la capacidad Inventario ya ubicada y dependencias compartidas. | Búsqueda estática `find`/`git grep` en `src/ui/bloques`, `src/ui/primitivos` y `src/capacidades`; resultado guardado en `/tmp/m1_inventario_scan.txt` |
| 20 | `ActionArea.tsx` y `useActionAreaCollapse.ts` aparecen por el término “area”, pero son primitivas/acciones generales y no tienen evidencia de pertenencia exclusiva a Inventario; no se mueven. | `find` por nombre; ausencia de importación desde el módulo Inventario |

## 3. Tabla pieza → consumidores → clasificación

| Pieza | Símbolos/contrato | Consumidores detectados | Clasificación |
|---|---|---|---|
| `src/ui/roles/administrador/inventario/AdminInventoryScreen.tsx` | `AdminInventoryScreen` | `src/composicion/registroPantallas.ts:7,37-39`; resolución indirecta desde `app/_role/admin/inventory.tsx:9-10` | `EXCLUSIVA_INVENTARIO` |
| `src/ui/roles/administrador/inventario/PanelInventario/index.tsx` | `PanelInventario`, `PanelInventarioProps` interno | `AdminInventoryScreen.tsx:6,18`; reexport de conveniencia `src/ui/index.ts:12` | `EXCLUSIVA_INVENTARIO` |
| `src/capacidades/inventario/useInventarioAvanzado.ts` | `useInventarioAvanzado`, `UseInventarioAvanzadoProps` interno | `PanelInventario/index.tsx:18,51`; reexport `src/capacidades/inventario/index.ts:1` y `src/capacidades/index.ts:9` | `EXCLUSIVA_INVENTARIO` en ubicación canónica |
| `src/capacidades/inventario/index.ts` | Barril de Inventario | `src/capacidades/index.ts:9`; import indirecto de `PanelInventario` | `EXCLUSIVA_INVENTARIO` |
| `src/sistema/store/index.ts` | `useInventoryCatalog`, `useInventoryAreas`, `useInventorySections`, `useInventoryV2Store` | Inventario, Menú, Métricas, Cocina y analítica según símbolo | `COMPARTIDA` — infraestructura; no mover |
| `src/sistema/store/slices/inventoryV2.ts` | Slice V2, estado/acciones de catálogo, áreas, secciones y stock | Store central; acceso indirecto desde Inventario, Cocina y Métricas | `COMPARTIDA` — infraestructura; no mover |
| `src/sistema/persistencia/inventory.v2.repo.ts` | `InventoryV2Repository`, schemas y tipos V2 | Inventario mediante `RepositorioInventario`, Menú, POS, Cocina y Mesero | `COMPARTIDA` — persistencia; solo lectura |
| `src/sistema/persistencia/contratos-inventario.ts` | `AreaInventario`, `InsumoInventario`, `IdSeccionInventario`, alias `RepositorioInventario` | `useInventarioAvanzado`, `PanelInventario`, Menú y repositorios consumidores | `COMPARTIDA` — contratos; no mover |
| `src/capacidades/admin/useAdminFeatures.ts` | Feature `admin_inventory` y configuración de `inventario` | Visibilidad/configuración del rol Admin y pruebas | `COMPARTIDA` — habilitación administrativa; no mover |
| `src/capacidades/admin/useAdminTools.ts` | `useAdminTools` | Reexportado por `src/capacidades/admin/index.ts:2`; sin consumidor funcional detectado en esta búsqueda | `FUERA DEL MÓDULO / CANDIDATA`, pero no pertenece a una pieza exclusiva identificada de Inventario |
| `src/capacidades/cocina/SincronizadorCocina.ts` | `SincronizadorCocina` | Cocina consume store V2 y ajusta stock | `FUERA DE ALCANCE`; solo evidencia de dependencia compartida |
| `src/capacidades/pos/useMostradorPro.ts` | `useMostradorPro` | Mostrador/POS consume repo V2, áreas, `hubId` y ajustes | `FUERA DE ALCANCE`; solo evidencia de dependencia compartida |
| `src/capacidades/metricas/useMetricasVentas.ts` | `useMetricasVentas` | Métricas consume catálogo para bajo stock | `FUERA DE ALCANCE`; solo evidencia de dependencia compartida |
| `src/capacidades/metricas/analitica/usePrediccionStock.ts` | `usePrediccionStock` | Métricas/analítica consume store V2 y predicciones | `FUERA DE ALCANCE`; solo evidencia de dependencia compartida |
| `src/ui/bloques/ActionArea.tsx`, `src/capacidades/ui/useActionAreaCollapse.ts` | Acciones/áreas generales | No aparece consumidor desde el módulo Inventario | `NO INVENTARIO`; falso positivo por nombre; no mover |

## 4. Piezas exclusivas dispersas que merecen entrar a la caja

**Resultado explícito de la búsqueda: no se encontraron piezas exclusivas dispersas fuera de la caja canónica.** Las únicas piezas visuales propias detectadas son `AdminInventoryScreen.tsx` y `PanelInventario/index.tsx`, ya ubicadas bajo `src/ui/roles/administrador/inventario/`. La única capacidad propia es `useInventarioAvanzado.ts`, ya ubicada bajo `src/capacidades/inventario/`.

El panel concentra inline sus tarjetas, tabs, listados, formularios y modales; no importa componentes de Inventario desde `src/ui/bloques` ni `src/ui/primitivos`. La ausencia de candidatos no autoriza a mover piezas genéricas solo porque contengan “area” o “stock” en el nombre.

Por esta razón, la fase 3 de reunión en caja queda **sin movimientos**. No se ejecutó `git mv`, no se cambiaron imports y no se creó `MIGRACION.md` adicional: no hubo transformación funcional que registrar.

## 5. Piezas compartidas y relación

| Pieza compartida | Relación confirmada | Riesgo de apropiación |
|---|---|---|
| `useInventoryCatalog` | Alimenta Inventario y Menú; Métricas lo usa para calcular bajo stock. | Rompería métricas o duplicaría la fuente de catálogo. |
| `useInventoryAreas` / `areas` | Inventario y Menú lo leen; POS y Cocina usan áreas V2/repositorio para descuentos y hubs. | Rompería `hubId`, stock por área y descuentos operativos. |
| `useInventorySections` | Selector del store V2 usado por la capacidad Inventario. | Debe conservar contrato central mientras no aparezcan consumidores adicionales. |
| `useInventoryV2Store` / `inventoryV2.ts` | Store global; Inventario, Cocina y analítica lo consumen. | Moverlo al módulo convertiría infraestructura en dependencia circular. |
| `InventoryV2Repository` / `RepositorioInventario` | Persistencia V2 consumida por Inventario, Menú, POS, Cocina y Mesero. | No mover ni renombrar en fases 1–3. |
| `InventoryItemV2`, `InventoryAreaV2`, `InventorySectionId` | Contratos con campos compartidos: `sectionId`, `hubId`, `parentId`, `stock`, `minStock`, unidades. | Cambios de tipo afectan múltiples roles y persistencia RTDB. |
| `usePuenteAccionesFlotantes` | Servicio UI administrativo consumido por el panel para acciones flotantes. | Es capacidad compartida; no pertenece exclusivamente a Inventario. |

## 6. Hipótesis y límites de certeza

La clasificación se basa en búsqueda estática de símbolos, imports, exports, barriles y cadenas relevantes en `src` y `app`. Esto confirma consumidores rastreables por texto, pero no prueba usos construidos dinámicamente, código generado fuera del árbol rastreado o integraciones externas.

`EXCLUSIVA_INVENTARIO` describe la responsabilidad del panel/capacidad dentro del módulo, no la exclusividad de los datos que consume. La UI y `useInventarioAvanzado` son propias; el store, la persistencia y los contratos V2 no lo son.

`FUERA DEL MÓDULO / CANDIDATA` no significa “eliminar”. `useAdminTools` aparece sin consumidor funcional detectado, pero no se autoriza su eliminación porque la tarea M4 decide huérfanos y el alcance de M1 no incluye borrar piezas.

No se investigó internamente Dispositivos ni se analizaron otros roles como territorios de reconstrucción. Solo se registraron consumidores directos de Inventario necesarios para demostrar que la infraestructura es compartida y debe permanecer intacta.

La búsqueda por nombres encontró falsos positivos genéricos (`ActionArea`, `useActionAreaCollapse`). No se clasificaron como Inventario porque no son importados por el módulo ni exponen contratos de inventario.

## 7. Movimientos realizados

| Pieza | Origen | Transformación | Destino | Por qué | Hora UTC |
|---|---|---|---|---|---|
| Ninguna | — | No hubo piezas exclusivas dispersas; la caja ya estaba consolidada | — | T-M1-01 exige mover solo exclusivas confirmadas; no se encontró ninguna | `2026-08-26 06:41 UTC` |

## 8. Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| `git fetch`, checkout y `git pull --rebase origin rama-2` | Correcto; base analizada en la punta remota `239e70f` al iniciar |
| Lectura de `AGENTS.md`, `MANIFIESTO.md`, `EVENTOS.json`, `CENTRAL/estado.md`, instrucción, estado, `procesado.json` y protocolo 02 | Correcta; sesión ACTIVA, T-M1-01 nueva y sello no procesado confirmados |
| Inventario de archivos del módulo visual y lógico | 4 archivos principales; todos ya en las rutas canónicas |
| `git grep` de exports, símbolos, imports, barrels y consumidores en `src`/`app` | Correcto; consumidores de producción y pruebas diferenciados cuando aplicaba |
| Búsqueda por nombres `inventario`, `inventory`, `stock`, `area`, `almacen`, `bodega` | Correcta; dependencias compartidas separadas de falsos positivos y piezas fuera de alcance |
| Verificación de contratos V2 y semántica de `stock`, `areas`, `sections`, `hubId` | Correcta mediante repositorio, slice y contratos; no se modificaron |
| Verificación de rutas, registro de pantallas y feature flag | Correcta: `admin_inventory` resuelve la pantalla Admin de Inventario |
| `git mv` / modificaciones de imports | No aplicable: no existen piezas exclusivas dispersas confirmadas |
| `npx tsc --noEmit` | No ejecutado: no hubo cambios de código; se ejecutará si otra fase autoriza modificaciones |
| `npm test` / lint focal | No ejecutados: tarea de mapeo y documentación sin cambios funcionales |

## 9. Bloqueos y necesidades fuera de alcance

1. No se autoriza modificar `inventory.v2.repo.ts`, `inventoryV2.ts`, `sistema/store`, contratos, persistencia ni rutas compartidas para “meterlos en la caja”. La evidencia muestra que son compartidos.
2. `useAdminTools` carece de consumidor funcional detectado, pero su decisión pertenece al proceso de huérfanos de M4; M1 no lo elimina.
3. La fase 4 de construcción, renombrados y jerarquía fina queda reservada al orquestador después de absorber los cinco informes.
4. La ausencia de piezas dispersas significa que no hay una reunión física pendiente, no que el módulo esté funcionalmente terminado. Deben validarse contratos, RTDB, experiencia de usuario y línea base en las tareas de M2–M5.

## 10. Pendientes para otros procesos

DeepSeek debe absorber este informe y decidir si acepta la clasificación. M2 debe completar el inventario de Mesas y su relación con la infraestructura que no pertenece a Inventario. M3 debe localizar la UI de Reparto. M4 debe decidir sobre huérfanos y candidatos a eliminación. M5 debe aportar la línea base de TypeScript, Jest, lint y cobertura.

Si el orquestador autoriza una fase posterior de construcción, cualquier cambio de código sobre Inventario debe preservar los contratos de `InventoryItemV2`, `InventoryAreaV2`, `InventorySectionId`, la semántica `hubId` y las rutas RTDB V2. Cualquier movimiento funcional futuro debe dejar `MIGRACION.md` en el origen y ejecutar `npx tsc --noEmit` antes del commit.

## 11. Propuestas

Como propuesta, mantener la “caja” visual/lógica actual y no mover infraestructura. Antes de construir, conviene que el orquestador use este inventario como límite de propiedad: UI y adaptador `useInventarioAvanzado` son del módulo; store, persistencia y contratos son compartidos. La propuesta no autoriza cambios por sí misma.

## Referencias

[1]: https://github.com/st-33/marisquerias/blob/rama-2/AGENTS.md — Reglas operativas de agentes.
[2]: https://github.com/st-33/marisquerias/blob/rama-2/docs/comunicacion_multimodelo/MANIFIESTO.md — Manifiesto operativo.
[3]: https://github.com/st-33/marisquerias/blob/rama-2/docs/comunicacion_multimodelo/sesiones/2026-08-26_admin_inventario_mesas_reparto/EVENTOS.json — Libro de eventos de la sesión.
[4]: https://github.com/st-33/marisquerias/blob/rama-2/src/ui/roles/administrador/inventario/AdminInventoryScreen.tsx — Pantalla contenedora de Inventario.
[5]: https://github.com/st-33/marisquerias/blob/rama-2/src/ui/roles/administrador/inventario/PanelInventario/index.tsx — Panel visual y consumidores internos.
[6]: https://github.com/st-33/marisquerias/blob/rama-2/src/capacidades/inventario/useInventarioAvanzado.ts — Capacidad de Inventario.
[7]: https://github.com/st-33/marisquerias/blob/rama-2/src/sistema/persistencia/inventory.v2.repo.ts — Repositorio y contratos V2.
[8]: https://github.com/st-33/marisquerias/blob/rama-2/src/sistema/store/slices/inventoryV2.ts — Slice compartido de Inventario V2.
