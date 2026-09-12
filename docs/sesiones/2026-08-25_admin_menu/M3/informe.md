# Informe — M3 / Tarea T-M3-01

| Campo | Valor |
|---|---|
| Agente | M3 |
| Tarea | T-M3-01 |
| Sesión | `2026-08-25_admin_menu` |
| Fecha/hora UTC | `2026-08-26 05:28` |
| Estado | REPORTADA |
| Commits | Commit de entrega con mensaje `docs(multimodelo/M3): mapa de duplicación y contratos menú` |
| Archivos creados/modificados | `M3/informe.md`, `M3/estado.md`, `M3/procesado.json` |

## 1. Resumen ejecutivo

Se pidió identificar la duplicación real y los contratos del módulo Menú, con especial atención a la persistencia flat/nested/`productos_index`, variantes, visibilidad y solapamientos entre capas. El análisis fue exclusivamente de lectura sobre la rama `rama-2`; no se modificó código ni se propuso una migración funcional.

Se confirmó que el repositorio escribe productos en tres ubicaciones mediante operaciones secuenciales, lee combinando flat y nested, y usa `productos_index` principalmente para localizar la categoría. El editor actual persiste grupos, opciones, triggers, `nextGroupId` y `excludeFromSibling`, pero el motor del mesero no respeta `nextGroupId` para ordenar. También se encontraron divergencias de nombres y valores por defecto en visibilidad, especialmente `Categoria.activa` frente a `cat.activo`, y `visible.ventaCrudo` de producto frente a `herencia.ventaCrudo` de categoría.

La instrucción mencionaba rutas antiguas. Se verificó su movimiento: la capa de gestión actual está en `src/capacidades/menu/useGestionMenu.ts`, el editor actual en `src/ui/roles/administrador/menu/editores/EditorVariantes.tsx`, y `VariantsModal.tsx` permanece en `src/ui/bloques/VariantsModal.tsx`. El historial consultado registra la reorganización en `c60b1ec` y la reubicación previa del editor en `452e234`.

## 2. Hechos confirmados

### 2.1. Persistencia flat, nested e índice

`MenuRepository` mantiene tres representaciones del producto. La ruta flat es `<tenant>/menu/productos`, la ruta nested es `<tenant>/menu/categorias/<categoria>/productos` y el índice es `<tenant>/menu/productos_index`; los constructores de esas rutas están definidos en `menu.repo.ts:194-202`.

| Hallazgo | Evidencia (archivo:línea) | Riesgo |
|---|---|---|
| La suscripción por categoría lee simultáneamente nested y flat, filtra flat por `categoriaId` y combina ambos mapas, haciendo prevalecer nested cuando colisiona un ID. | `src/sistema/persistencia/menu.repo.ts:149-186`, especialmente `:163-165` | Dos fuentes pueden mostrar versiones distintas; una versión nested antigua puede ocultar una flat más reciente. |
| La suscripción global repite la estrategia dual: escucha flat, escucha las categorías, abre una suscripción nested por categoría y vuelve a fusionar los resultados. | `src/sistema/persistencia/menu.repo.ts:294-369`, especialmente `:303-363` | Existe lógica de merge duplicada en dos métodos; cualquier cambio de precedencia o normalización puede quedar desalineado. |
| `obtenerProductos()` vuelve a leer flat y todas las colecciones nested y devuelve una tercera implementación de merge; si el mismo ID aparece en más de una categoría nested, el último `Object.assign` gana según el orden de las claves. | `src/sistema/persistencia/menu.repo.ts:372-398`, especialmente `:376-392` | Lecturas por suscripción y lecturas puntuales no tienen una única función de resolución de conflictos. |
| `obtenerProductoPorId()` consulta primero el índice para hallar `catId`, intenta la ubicación nested y solo después cae a flat. | `src/sistema/persistencia/menu.repo.ts:400-421` | Un índice desactualizado puede dirigir la lectura a una categoría equivocada; el fallback no busca otras ubicaciones nested. |
| Crear producto escribe flat, nested e índice en tres `set` consecutivos. | `src/sistema/persistencia/menu.repo.ts:423-447`, especialmente `:434-445` | Un fallo entre operaciones deja representaciones parciales o divergentes; no hay transacción/multi-location update para la creación. |
| Actualizar producto escribe flat, mueve o crea la copia nested y luego actualiza el índice. | `src/sistema/persistencia/menu.repo.ts:449-507`, especialmente `:472-506` | Un error intermedio puede dejar el producto en la categoría anterior, en la nueva, o en ambas; el contrato de consistencia depende de varias llamadas. |
| El cambio de categoría mueve nested con `set(nextRef, merged)` y `set(prevRef, null)`, pero no protege el orden frente a una lectura concurrente. | `src/sistema/persistencia/menu.repo.ts:475-489` | Una lectura entre ambas operaciones puede observar dos copias o ninguna en nested. |
| Eliminar producto elimina flat, nested e índice, pero obtiene `catId` exclusivamente desde flat. | `src/sistema/persistencia/menu.repo.ts:509-525` | Si flat falta o está incompleto, la copia nested puede quedar huérfana porque no se conoce su categoría. |
| El índice de creación guarda `hasReceta`, pero la actualización del índice no recalcula ese campo. | Creación: `src/sistema/persistencia/menu.repo.ts:439-445`; actualización: `:501-506` | `productos_index.hasReceta` puede quedar obsoleto después de agregar o quitar una receta. |
| La reparación recorre flat y nested, prefiere nested en determinados conflictos, crea faltantes y aplica correcciones con un `update` atómico; no reconstruye ni valida `productos_index`. | `src/sistema/persistencia/menu.repo.ts:534-615`, especialmente `:547-608` | La reparación cubre solo la relación flat/nested; el índice puede seguir desincronizado. Además, la heurística de nombre puede elegir una copia con datos distintos sin resolver por versión. |

La heurística de reparación prioriza nested si tiene variantes y flat no, o si los nombres difieren, salvo que uno de los nombres comience por `Categoría` y el otro no (`menu.repo.ts:567-587`). Esto confirma una reparación heurística, no una resolución basada en timestamp, versión o autoridad explícita del origen.

### 2.2. Contrato de variantes

El contrato persistido del repositorio define `variantes.grupos`, `variantes.reglas.visible` y `variantes.reglas.disable` (`menu.repo.ts:48-53`). Cada grupo tiene `obligatorio`, `opciones`, `rol`, `tipo`, `titulo`, `nextGroupId` y `excludeFromSibling` (`menu.repo.ts:78-86`); cada opción admite `delta`, `label`, `nombre`, `titulo` y `triggers.showGroups/hideGroups` (`menu.repo.ts:88-100`).

| Hallazgo | Evidencia (archivo:línea) | Riesgo |
|---|---|---|
| El editor administra grupos y opciones dentro de `variantes.grupos`; al crear una opción solo persiste `delta` positivo y `titulo`. | `src/ui/roles/administrador/menu/editores/EditorVariantes.tsx:60-119`, especialmente `:103-115` | Los alias admitidos por el repositorio (`label` y `nombre`) no son producidos por este editor; integraciones legacy pueden conservar datos que el editor no representa. |
| El editor persiste `nextGroupId` mediante `setGroupNextStep`, y ofrece como destinos todos los grupos distintos del actual. | `src/ui/roles/administrador/menu/editores/EditorVariantes.tsx:196-203`, UI en `:366-406` | El campo parece formar parte del contrato de flujo, pero su efecto real debe existir en el consumidor. |
| El motor de orden no usa `nextGroupId`: aunque el comentario indica intención de seguirlo, `getOrderedVisibleGroups()` devuelve las claves de objeto filtradas por `hideSet`. | `src/roles/logica/mesero/rules.ts:121-136`, especialmente `:133-135` | P1: la configuración de orden que el administrador puede guardar no cambia el orden de pasos del mesero. |
| El editor persiste `excludeFromSibling` y el motor sí lo lee para generar IDs deshabilitados con formato `grupo:opción`. | Editor: `src/ui/roles/administrador/menu/editores/EditorVariantes.tsx:206-213`; motor: `src/roles/logica/mesero/rules.ts:103-118`; UI consumidora: `src/ui/bloques/VariantsModal.tsx:361-393` | El contrato depende de que el mismo ID de opción exista en ambos grupos; la etiqueta del editor sugiere excluir repetidos, pero el motor solo deshabilita en el grupo actual la misma clave de opción seleccionada en el hermano. |
| El editor persiste triggers por opción como arrays `showGroups`/`hideGroups`. | `src/ui/roles/administrador/menu/editores/EditorVariantes.tsx:133-167` | Los triggers son una segunda forma de expresar reglas, distinta de `variantes.reglas.visible/disable`; no hay en el editor una UI que edite los mapas explícitos del contrato del repositorio. |
| El motor evalúa ambos formatos: reglas explícitas en `reglas.visible/disable` y triggers de opciones, incluyendo una whitelist implícita de grupos condicionales. | Reglas explícitas: `src/roles/logica/mesero/rules.ts:27-68`; triggers y whitelist: `:70-101` | Dos semánticas pueden producir ocultamientos acumulativos y son difíciles de inspeccionar desde el editor, que solo expone triggers. |
| `VariantsModal` usa `variantes.grupos`, `variantes.reglas`, el resultado de `evaluateRules`, el resultado de `getOrderedVisibleGroups` y el cálculo de delta/labels. | `src/ui/bloques/VariantsModal.tsx:135-156` | El modal es consumidor efectivo del contrato, pero la navegación y las reglas no cubren todos los campos configurables de forma equivalente. |
| El precio se calcula desde `option.delta`, mientras el label de la UI usa `getVariantOptionLabel`; el motor de labels usa directamente `option.titulo`. | Precio/UI: `src/ui/bloques/VariantsModal.tsx:361-437`, label UI en `:409`; helper: `src/sistema/persistencia/menu.repo.ts:102-109`; motor: `src/roles/logica/mesero/rules.ts:10-24`, especialmente `:14-20` | Una opción legacy con solo `label` o `nombre` puede mostrarse con fallback en el modal, pero generar un label incompleto o `undefined` en el motor que prepara el pedido. |
| El selector del mesero consume solo `variantes.grupos` para decidir si abre el modal; al confirmar transporta selecciones, precio base, delta, labels y `prepMin`, no las reglas completas del producto. | `src/roles/logica/mesero/useVariantSelector.ts:44-55`, inicio en `:68-95`, payload en `:127-144` | El contrato que llega al pedido es parcial: las reglas se aplican en el modal, pero no se conservan como configuración de producto dentro del ítem. Esto es correcto si el pedido solo necesita el resultado, pero debe mantenerse como decisión explícita. |

El contrato de `Product` consumido por el selector también es más laxo que `Producto`: declara `variantes?: Record<string, any>` y no expone la estructura de grupos/reglas (`src/sistema/tipos/pos.ts:147-156`), mientras el repositorio declara tipos estructurados (`menu.repo.ts:40-117`). Esto reduce la protección estática precisamente en la frontera Administrador→Mesero.

### 2.3. Contrato de visibilidad y estado

El repositorio declara `Categoria.activa` (`menu.repo.ts:10-15`), `Categoria.herencia.mesero/digital/ventaCrudo` (`:30-37`), `Producto.visible.digital/mesero/ventaCrudo` (`:55-59`) y `Producto.activo` (`:60-61`). La forma de escritura y la forma de filtrado no son completamente iguales.

| Hallazgo | Evidencia (archivo:línea) | Riesgo |
|---|---|---|
| El formulario administrativo inicializa producto con `activo: true` y los tres flags de `visible` en true; al editar también rellena ausencias con true. | `src/ui/roles/administrador/menu/PantallaMenuAdmin.tsx:73-109` | Los defaults administrativos son permisivos; consumidores con defaults estrictos pueden interpretar una ausencia de forma diferente. |
| El payload de guardado conserva `visible`, variantes, receta y configuración, pero excluye `activo` del formulario general. | `src/ui/roles/administrador/menu/PantallaMenuAdmin.tsx:89-123` | La separación evita que guardar el formulario sobrescriba el toggle activo, pero mantiene dos vías de escritura que deben seguir coordinadas. |
| El toggle de producto escribe `activo` mediante `actions.actualizarProducto`, separado del guardado del formulario. | `src/ui/roles/administrador/menu/PantallaMenuAdmin.tsx:421-439`, especialmente `:432-435` | El estado activo tiene una ruta de mutación distinta a visibilidad; pruebas deben cubrir ambas. |
| La pestaña básica solo expone `visible.mesero`; la pestaña de variantes entrega y puede modificar el objeto completo `visible`, incluidos digital y ventaCrudo. | Básico: `src/ui/roles/administrador/menu/PantallaMenuAdmin.tsx:645-659`; variantes: `:730-745`; toggles completos: `src/ui/roles/administrador/menu/editores/EditorVariantes.tsx:169-171` | El mismo contrato se reparte entre dos subinterfaces; editar una pestaña puede dejar valores que la otra no muestra. |
| La pantalla envía cambios de herencia de categoría a `actualizarCategoria`; la barra crea por defecto `{ mesero: true, digital: true }` y elimina el objeto al desactivar. | Cableado: `src/ui/roles/administrador/menu/PantallaMenuAdmin.tsx:370-384`; alta/baja: `src/ui/roles/administrador/menu/bloques/BarraCategorias.tsx:110-145` | El alta de herencia no incluye `ventaCrudo`; su ausencia recibe interpretaciones diferentes en consumidores. |
| Los toggles finos de herencia consideran mesero y digital visibles cuando son distintos de false, pero ventaCrudo solo visible cuando es exactamente true. | `src/ui/roles/administrador/menu/bloques/BarraCategorias.tsx:147-194`, especialmente `:155`, `:170`, `:186-188` | La semántica de ausencia no es uniforme entre canales dentro de la misma UI. |
| El flujo de creación de categoría escribe `activa: true`, pero el selector del mesero filtra con `cat.activo !== false`; el tipo `Categoria` del repositorio también declara `activa`, no `activo`. | Escritura: `src/capacidades/menu/useGestionMenu.ts:108-128`, especialmente `:119-127`; tipo: `src/sistema/persistencia/menu.repo.ts:10-15`; lectura: `src/roles/logica/mesero/useProductSelector.ts:55-65`, especialmente `:59-62` | P1: `activa` no participa en el filtro que usa `activo`; una desactivación basada en un único nombre no sería efectiva. En el árbol actual no existe otro uso de `cat.activo` fuera de ese selector. |
| Mesero filtra producto por categoría, `activo !== false` y `visible.mesero !== false`; filtra categoría por `activo !== false` y `herencia.mesero !== false`. | `src/roles/logica/mesero/useProductSelector.ts:34-66`, especialmente `:40-47` y `:55-65` | El contrato Mesero interpreta ausencia como activo/visible, pero esa convención no se replica en todos los canales. |
| Mostrador exige `p.visible.ventaCrudo === true` para productos, pero permite categorías cuando `c.herencia.ventaCrudo !== false`; además no filtra `activo`. | `src/capacidades/pos/useMostradorPro.ts:365-369` | P1: un producto activo ausente puede ocultarse en Mostrador, mientras un producto inactivo con visible true puede aparecer; categoría y producto usan defaults opuestos. |
| La búsqueda POS por código de barras filtra por `visible.mesero !== false`, aunque el hook pertenece al POS y el mostrador tiene un canal independiente de venta cruda. | `src/capacidades/pos/usePOS.ts:182-198`, especialmente `:185-189` | Solapamiento semántico: una operación POS depende del flag del canal Mesero y no de `ventaCrudo`; puede exponer u ocultar productos de forma inesperada. |
| La UI escribe `herencia.digital` y `visible.digital`, pero no se encontró en el árbol actual `src` un filtro consumidor de esos campos; los usos encontrados corresponden a escritura de la barra. | Escritura: `src/ui/roles/administrador/menu/bloques/BarraCategorias.tsx:164-177`; búsqueda de referencias en `src` realizada el `2026-08-26` sin consumidores `visible?.digital`/`herencia?.digital` | P2: el dato puede ser reservado para otra superficie no presente en esta rama, pero dentro del árbol inspeccionado no tiene efecto observable. |

### 2.4. Solapamientos funcionales

| Solapamiento | Evidencia (archivo:línea) | Riesgo |
|---|---|---|
| El repositorio implementa tres veces la resolución de productos flat+nested: suscripción por categoría, suscripción global y lectura puntual de todos los productos. | `src/sistema/persistencia/menu.repo.ts:154-186`, `:297-369`, `:375-398` | Deriva de precedencia, normalización y eliminación de claves stale entre rutas de acceso. |
| La pantalla administrativa construye defaults/payload de producto y el hook de gestión vuelve a construir defaults/validaciones antes de llamar al repositorio. | Pantalla: `src/ui/roles/administrador/menu/PantallaMenuAdmin.tsx:73-123`; hook: `src/capacidades/menu/useGestionMenu.ts:256-355` | El contrato se moldea en dos capas; por ejemplo, la pantalla fija los tres flags de visibilidad y el hook de creación usa defaults propios para `variantes`, `visible`, receta y cocina (`useGestionMenu.ts:291-304`). |
| La navegación de variantes se configura en EditorVariantes mediante `nextGroupId`, pero el motor de reglas devuelve orden de inserción; dos piezas declaran y consumen una misma capacidad con semánticas distintas. | Escritura: `src/ui/roles/administrador/menu/editores/EditorVariantes.tsx:196-203`; consumo: `src/roles/logica/mesero/rules.ts:125-135` | El administrador puede creer que cambió el flujo cuando el mesero no lo aplica. |
| Existen tres pipelines de catálogo: Mesero consume el store centralizado, mientras POS y Mostrador se suscriben directamente al repositorio. | Store Mesero: `src/roles/logica/mesero/useProductSelector.ts:22-28`; listeners POS/Mostrador: `src/capacidades/pos/usePOS.ts:107-117` y `src/capacidades/pos/useMostradorPro.ts:87-128` | Los filtros no están centralizados y ya divergen en `activo`, `visible.mesero` y `visible.ventaCrudo`. |
| `useGestionMenu` expone `refresh()` que llama `obtenerCategorias()` y `obtenerProductos()` pero descarta ambos retornos; la pantalla renderiza desde el store, no desde esos resultados. | `src/capacidades/menu/useGestionMenu.ts:358-365`; estado usado en pantalla: `src/ui/roles/administrador/menu/PantallaMenuAdmin.tsx:165-175` | La operación aparenta refrescar, pero no actualiza el estado que consume la UI; es una duplicación de lectura sin efecto de sincronización observable. |
| El repositorio expone `repararIntegridad()` y el hook de administración lo invoca automáticamente al montar; no se encontró otro invocador funcional, por lo que no es duplicación de ejecución, pero sí una responsabilidad de infraestructura activada desde UI. | `src/capacidades/menu/useGestionMenu.ts:28-34`; única definición: `src/sistema/persistencia/menu.repo.ts:539-615` | La reparación puede ejecutarse en cada montaje administrativo y competir con escrituras si no se define una política de concurrencia. |

## 3. Hipótesis y límites de certeza

La hipótesis principal es que nested pretende ser la representación canónica, porque los comentarios de creación lo llaman “canonical” y la reparación suele preferir nested cuando contiene variantes (`menu.repo.ts:434-437`, `:573-587`). No obstante, no existe en el alcance una declaración formal de autoridad que resuelva todos los conflictos, y el índice parece ser una vista de lookup, no una fuente completa de producto. Esta conclusión debe confirmarse con el orquestador antes de cualquier migración.

Se observó una posible incompatibilidad entre `Categoria.activa` y `cat.activo`, pero el efecto práctico de una categoría desactivada no pudo probarse contra datos RTDB en ejecución. La evidencia es estática: el escritor y el tipo usan `activa`, mientras el selector lee `activo`. Asimismo, la ausencia de consumidores digitales se afirma solo para el árbol `src` de esta rama; podría existir una superficie externa o futura que no esté conectada aquí.

No se evaluó la concurrencia real, las reglas de Firebase ni la forma efectiva de los datos desplegados. Por tanto, los riesgos de escrituras parciales, colisiones flat/nested e índice obsoleto son consecuencias del flujo de llamadas observado, no un incidente de producción confirmado.

## 4. Movimientos realizados (solo si se autorizaron)

No se autorizaron movimientos funcionales y no se modificó código. Solo se siguió el rastro de las rutas indicadas en la instrucción para continuar la lectura en sus destinos actuales.

| Pieza | Origen | Transformación | Destino | Por qué | Hora UTC |
|---|---|---|---|---|---|
| Capa de gestión del menú | `src/capacidades/menu/useMenuManagement.ts` | Renombrado al español del módulo de capacidades | `src/capacidades/menu/useGestionMenu.ts` | La ruta antigua no existe en `rama-2`; el destino es importado por la pantalla admin | `2026-08-26 05:23` |
| Editor de variantes | `src/ui/bloques/VariantEditor.tsx` | Reubicación y renombrado del editor del módulo admin | `src/ui/roles/administrador/menu/editores/EditorVariantes.tsx` | La ruta antigua no existe; el historial muestra la reubicación previa en `452e234` y la refactorización del módulo en `c60b1ec` | `2026-08-26 05:23` |
| Modal de variantes | `src/ui/bloques/VariantsModal.tsx` | Sin movimiento | `src/ui/bloques/VariantsModal.tsx` | La ruta indicada sigue vigente | `2026-08-26 05:23` |

## 5. Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| Sincronización de rama | `rama-2` actualizada desde `origin/rama-2` mediante fetch y pull con rebase tras preservar el cambio local de estado. |
| Detección de evento | Confirmado `ev-0003`, tipo `INSTRUCCION_NUEVA`, agente `M3`, tarea `T-M3-01`, sello `198230cf32f148610bec4cb8b075ae5da73a14d68f71afae1a01bd0da8c3b6db`; el sello no estaba en `M3/procesado.json`. |
| Alcance de escritura | Solo se prepararon `M3/informe.md`, `M3/estado.md` y `M3/procesado.json`; no se modificó código, `CENTRAL`, `EVENTOS.json` ni carpetas de otros agentes. |
| Rastreo de piezas movidas | Confirmadas las rutas destino actuales mediante búsqueda del árbol y `git log --find-renames`; `VariantsModal.tsx` permanece en su ruta original. |
| Condición de terminado | Cumplida: los cuatro puntos solicitados contienen hallazgos con evidencia de archivo y línea; el apartado de solapamientos y la priorización están incluidos. |
| Verificación de código | No se ejecutaron `tsc`, tests ni lint porque la instrucción estableció alcance de solo lectura y no hubo cambios funcionales. |

## 6. Bloqueos y necesidades fuera de alcance

No hubo bloqueo para completar el mapa estático. Queda fuera de alcance confirmar con datos RTDB si existen duplicados concretos, medir la frecuencia de reparación o cambiar el contrato. Cualquier intervención en `menu.repo.ts`, los filtros de canales o el motor de reglas requiere una instrucción posterior que autorice expresamente los archivos.

## 7. Pendientes para otros procesos

| Prioridad | Pendiente | Responsable sugerido |
|---|---|---|
| P1 | Definir una única autoridad de producto entre flat, nested e índice y hacer las mutaciones multi-ruta atómicas o idempotentes; incluir reconstrucción de índice y `hasReceta`. | Orquestador + agente autorizado para persistencia |
| P1 | Resolver `activa` frente a `activo` en categorías y definir una convención única para ausencia de flags. | Orquestador + agente autorizado para contratos |
| P1 | Hacer que `nextGroupId` sea funcional o retirar su edición; especificar también si `excludeFromSibling` compara IDs o conceptos de opción. | Orquestador + agente autorizado para variantes |
| P1 | Unificar los predicados de visibilidad de Mesero, POS y Mostrador, incluyendo `activo` y los defaults de `ventaCrudo`. | Orquestador + agentes de canales |
| P2 | Decidir si `variantes.reglas.visible/disable` seguirá siendo contrato legacy, si tendrá editor, o si se sustituirá formalmente por triggers. | Orquestador |
| P2 | Alinear `titulo` con los alias `label`/`nombre` y tipar el producto consumido por Mesero con el contrato estructurado del repositorio. | Agente de contratos |
| P2 | Determinar si `visible.digital` y `herencia.digital` tienen consumidor en otra superficie; si no, declararlos reservados o retirar su escritura. | Orquestador |
| P2 | Corregir o retirar `useGestionMenu.actions.refresh()` si no debe descartar los resultados de lectura. | Agente de capacidades |

## 8. Incoherencias entre capas priorizadas

No se identificó un P0 confirmado porque el análisis fue estático y no observó una pérdida de datos desplegada. Sí se identifican los siguientes P1 y P2, ordenados por impacto potencial:

| Prioridad | Incoherencia | Evidencia resumida | Impacto |
|---|---|---|---|
| P1 | Escrituras secuenciales en tres rutas sin actualización equivalente del índice. | `menu.repo.ts:426-445`, `:472-506`, `:501-506` | Divergencia persistente entre representaciones, además de metadata `hasReceta` obsoleta. |
| P1 | Editor guarda `nextGroupId`, pero el navegador del mesero ignora el campo. | `EditorVariantes.tsx:196-203`; `rules.ts:125-135` | Flujo configurado por administración no aplicado al usuario final. |
| P1 | Categoría creada con `activa`, selector filtrando `activo`. | `useGestionMenu.ts:119-127`; `useProductSelector.ts:59-62` | Desactivación de categoría potencialmente inefectiva o contrato ambiguo. |
| P1 | Mostrador filtra producto con `visible.ventaCrudo === true`, no por `activo`, y filtra categoría con default opuesto. | `useMostradorPro.ts:365-369` | Catálogo inconsistente entre producto y categoría y posible exposición de productos inactivos. |
| P1 | Reglas explícitas y triggers son dos contratos de visibilidad de variantes, pero el editor solo representa triggers. | `menu.repo.ts:48-53`; `EditorVariantes.tsx:133-167`; `rules.ts:39-101` | Configuración persistida puede ser invisible o difícil de modificar desde la administración. |
| P2 | `titulo` es obligatorio para el motor, mientras el helper de UI acepta `label` y `nombre`. | `menu.repo.ts:88-109`; `rules.ts:14-20`; `VariantsModal.tsx:409` | Labels distintos entre modal y pedido para datos legacy. |
| P2 | `visible.digital`/`herencia.digital` se escriben sin consumidor encontrado en `src`. | `BarraCategorias.tsx:164-177`; búsqueda de referencias en `src` | Campo aparentemente inerte en la rama inspeccionada. |
| P2 | POS y Mesero comparten `visible.mesero`, mientras Mostrador usa `ventaCrudo`; no hay predicado común. | `usePOS.ts:185-189`; `useProductSelector.ts:40-62`; `useMostradorPro.ts:367-368` | La misma entidad puede estar disponible en un canal y ausente en otro por reglas no uniformes. |

## 9. Propuestas (opcionales; no son órdenes)

La primera decisión recomendada es declarar por escrito la autoridad de cada ubicación y derivar desde ella las demás vistas. Si nested es canónico, el índice debería reconstruirse de forma determinista y las operaciones de creación, actualización, movimiento y eliminación deberían usar una operación multi-ruta o una rutina idempotente común.

La segunda decisión es normalizar el contrato de flags antes de tocar las pantallas. En particular, debe elegirse `activo` o `activa` para categorías y fijarse si la ausencia significa visible o no visible por canal. Después conviene extraer predicados compartidos para Mesero, POS y Mostrador, con pruebas de tabla para `true`, `false` y `undefined`.

Por último, el administrador debería exponer solo capacidades que el consumidor aplique: implementar el recorrido de `nextGroupId` o eliminarlo, y decidir entre reglas explícitas y triggers como contrato principal. Mientras ambas formas existan, se necesita una normalización única que permita inspeccionar y editar cualquier dato persistido sin ocultarlo.
