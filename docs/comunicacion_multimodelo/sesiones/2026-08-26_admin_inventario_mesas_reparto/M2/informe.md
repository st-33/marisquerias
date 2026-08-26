# Informe — M2 / Tarea T-M2-01

| Campo | Valor |
|---|---|
| Agente | M2 |
| Tarea | T-M2-01 |
| Sesión | `2026-08-26_admin_inventario_mesas_reparto` |
| Fecha/hora UTC | `2026-08-26 06:48` |
| Estado | REPORTADA |
| Commit | `HEAD` al cierre (`docs(multimodelo/M2): mapeo mesas`) |
| Alcance | Fases 1–3: mapear, documentar y reunir piezas exclusivas de Mesas |
| Cambios funcionales | Ninguno; no se encontraron piezas exclusivas dispersas que debieran moverse |

## 1. Resumen ejecutivo

Se inspeccionó el territorio completo de Mesas en `rama-2`, incluyendo pantalla administrativa, capacidad, barriles, rutas, feature flags, store, repositorio, RTDB, flujo Mesero, métricas, notificaciones, pruebas y rastro Git. La conclusión es que las piezas exclusivas de Administrador/Mesas **ya están en sus rutas canónicas**: `src/ui/roles/administrador/mesas/` y `src/capacidades/mesas/` [1] [2].

La pieza visual dispersa más cercana, `src/ui/bloques/TablesGrid.tsx`, no es exclusiva de Administrador: forma parte del flujo Mesero mediante `PuestoMando`, acepta datos de pedidos y una salida `Para Llevar`, e importa `OrderItem` desde lógica de Mesero [3] [4]. El repositorio, el store, el puente FAB, los badges y los adaptadores de ruta también son compartidos o infraestructura. Por ello, la fase 3 se completa **sin movimientos**: mover cualquiera de esas piezas apropiaría una dependencia compartida y violaría los límites de la instrucción.

## 2. Hechos confirmados

### 2.1 Estado de la sesión y alcance

El evento `ev-0002` está dirigido a `M2`, corresponde a `T-M2-01` y tiene el sello `b1cd6c48b14d8597c7af7ee6e7fd80e4715c9016db72f4aeccd4e3918ee04573`, que no figuraba previamente en `M2/procesado.json`. La sesión está declarada ACTIVA, con las fases 1–3 delegadas y la fase 4 reservada al orquestador. La instrucción limita el trabajo a Mesas del rol Administrador, excluye Dispositivos y otros roles para efectos de movimiento, y autoriza únicamente piezas `EXCLUSIVA_MESAS` [5] [6].

### 2.2 Mapa de piezas y consumidores

| Pieza | Símbolos/función relevante | Consumidores verificados | Clasificación | Decisión de caja |
|---|---|---|---|---|
| `src/ui/roles/administrador/mesas/AdminTablesScreen.tsx` | `AdminTablesScreen`; pantalla de plano, resumen, cantidad y edición de layout | `src/composicion/registroPantallas.ts:6,34-36`; el adaptador `app/_role/admin/tables.tsx:9-17` resuelve `admin_tables` | **EXCLUSIVA_MESAS** | Ya está en `ui/roles/administrador/mesas/`; no mover. |
| `src/capacidades/mesas/useMesasManagement.ts` | `useMesasManagement`, `Mesa`, `EstadoMesa`, `MesaConLayout`; suscripción y acciones administrativas | Solo la pantalla administrativa en `AdminTablesScreen.tsx:22,59`; exportado por `src/capacidades/mesas/index.ts:1` y por `src/capacidades/index.ts:8` | **EXCLUSIVA_MESAS** | Ya está en `capacidades/mesas/`; no mover. |
| `src/capacidades/mesas/index.ts` | Barril de la capacidad Mesas | `src/capacidades/index.ts:8` | **EXCLUSIVA_MESAS** | Ya está junto a la capacidad; no mover. |
| `app/_role/admin/tables.tsx` | Adaptador Expo Router de la ruta administrativa | Resuelve la clave `admin_tables`; la navegación se origina también en `app/_role/admin/index.tsx:38-44` | Adaptador de **NAVEGACIÓN**, no pieza UI del módulo | Permanece en `app/`; moverlo a `src/ui/roles/administrador/mesas/` rompería la separación de rutas. |
| `src/ui/bloques/TablesGrid.tsx` | `TablesGrid`, `Table`, `TableState`; grid de selección de mesa y `Para Llevar` | `src/ui/bloques/PuestoMando.tsx:7,187-200`; exportado por `src/ui/index.ts:24-25` | **COMPARTIDA** con Mesero | No mover. Su contrato incluye `liveItems`, `pendingCount`, `onSelectTakeaway` y estados adaptados al flujo Mesero [3] [4]. |
| `src/ui/bloques/PuestoMando.tsx` | Composición de mesas, pedidos, lista y acciones del puesto | Consume `TablesGrid` y lo conecta con selección, drafts, envío, impresión y cobro | **COMPARTIDA_MESERO** | Fuera de la caja de Admin/Mesas. |
| `src/compartido/componentes/ui/TableBadge.tsx` | `TableBadge`, `TableIndicator`; badges de pedidos/estado | Consumido por `TablesGrid`; el propio encabezado declara uso para Mesera, Admin y Reportes | **COMPARTIDA** | No mover. |
| `src/sistema/persistencia/mesas.repo.ts` | `MesasRepository`, `Mesa`, `EstadoMesa`, `MesaLayoutInput` | Capacidad Admin; `gestionarImpresion`, `gestionarMesas`, `procesarPedido` y `useMeseroLogic` de Mesero | **INFRAESTRUCTURA_COMPARTIDA** | Solo lectura. No mover. |
| `src/sistema/store/index.ts` / `src/sistema/store/slices/operacion.ts` | `useMesas`, listener centralizado y acciones de mesa | Métricas (`useMetricasVentas`), notificaciones, Mesero y toda la operación | **STORE_COMPARTIDO** | Solo lectura. No mover. |
| `src/roles/logica/mesero/gestionarMesas.ts` | `useGestionarMesas`; normaliza estados y selecciona/ocupa/libera mesas | `src/roles/logica/mesero/useMeseroLogic.ts:86-96` | **LÓGICA_MESERO** | No pertenece a Admin/Mesas; no mover. |
| `src/capacidades/admin/operacion/usePuenteAccionesFlotantes.ts` | Registro/limpieza de acciones rápidas por ruta | Inventario, Menú, Mesas y Métricas | **CAPACIDAD_ADMIN_COMPARTIDA** | No mover. |
| `src/composicion/registroPantallas.ts` | Registro `admin_tables → AdminTablesScreen` | Fábrica global de pantallas | **COMPOSICIÓN_COMPARTIDA** | Solo documentar; no mover. |
| `src/capacidades/admin/useAdminFeatures.ts` y `app/_layout.tsx` | Flag `admin_tables` y guardia de `/_role/admin/tables` | Configuración del tenant y navegación global | **GATING_COMPARTIDO** | Solo lectura; no mover. |

El escaneo exacto de símbolos no encontró otro consumidor de `useMesasManagement` fuera de `AdminTablesScreen`. En cambio, sí confirmó varios consumidores de `MesasRepository`, `useMesas`, `TablesGrid` y `usePuenteAccionesFlotantes`; esto separa claramente la capacidad administrativa exclusiva de las dependencias transversales.

### 2.3 Piezas exclusivas dispersas y candidatos a la caja

No se encontraron piezas `EXCLUSIVA_MESAS` dispersas fuera de la caja canónica. La lista actual de la zona exclusiva es:

| Zona canónica | Piezas encontradas | Resultado |
|---|---|---|
| `src/ui/roles/administrador/mesas/` | `AdminTablesScreen.tsx` | Ya reunida. |
| `src/capacidades/mesas/` | `index.ts`, `useMesasManagement.ts` | Ya reunida. |
| `src/ui/bloques/` | `TablesGrid.tsx` | No candidata: compartida con Mesero. |
| `src/compartido/componentes/ui/` | `TableBadge.tsx` | No candidata: compartida con Mesero, Admin y Reportes. |
| `src/sistema/` | store, repositorio, rutas y ciclo de vida | No candidatas: infraestructura compartida. |
| `app/_role/admin/` | `tables.tsx`, índice administrativo | Adaptadores de navegación; no se trasladan a la capa UI. |

La ausencia de movimientos no es falta de trabajo: es el resultado verificable de aplicar la clasificación por consumidores. Crear una “caja” adicional o duplicar `TablesGrid` produciría dos contratos visuales para la misma selección de mesas y aumentaría el riesgo de divergencia entre Admin y Mesero.

### 2.4 Rastro de movimientos anteriores

La pantalla ya fue reubicada históricamente. `git log --follow` muestra el traslado inicial de `AdminTablesScreen` en `58c7a59` y el traslado posterior desde `src/ui/pantallas/AdminTablesScreen.tsx` a `src/ui/roles/administrador/mesas/AdminTablesScreen.tsx` en `71d6a21`. El hook fue trasladado desde `src/capacidades/admin/useMesasManagement.ts` a `src/capacidades/mesas/useMesasManagement.ts` en el mismo `71d6a21`.

El rastro confirmado es:

| Origen histórico | Destino actual | Evidencia | Estado |
|---|---|---|---|
| `src/catalogo/_compartido/pantallas/AdminTablesScreen.tsx` | `src/plataforma/dominios/marisqueria/administracion/mesas/AdminTablesScreen.tsx` | `58c7a59` (`R097`) | Movimiento histórico. |
| `src/ui/pantallas/AdminTablesScreen.tsx` | `src/ui/roles/administrador/mesas/AdminTablesScreen.tsx` | `71d6a21` (`R098`) | Destino canónico actual. |
| `src/capacidades/admin/useMesasManagement.ts` | `src/capacidades/mesas/useMesasManagement.ts` | `71d6a21` (`R100`) | Destino canónico actual. |
| `src/sistema/persistencia/mesas.repo.ts` | Sin traslado en esta tarea | `6d76fe0` (`R097` desde persistencia histórica) | Infraestructura ya separada; no tocar. |

No existe una huella nueva de fase 3 porque no hubo movimiento en esta ejecución. La huella histórica es suficiente para demostrar que no se repite una reubicación ya hecha.

## 3. Contrato de datos y RTDB observado

### 3.1 Forma real del nodo `mesas`

El repositorio usa la ruta `${tenantPath}/mesas` [2]. La exportación RTDB muestra más de una forma histórica/activa:

| Tenant | Forma observada | Ejemplo | Evidencia |
|---|---|---|---|
| `el-arrecife` | Arreglo 1-indexado con `null` en índice 0 | Índices 1–3 con `estado: "libre"` y `updatedAt` | `rtdb_actualizada.json:540-554` |
| `marisqueria-la-perla-del-pueblo` | Objeto keyed | Clave `"5"` con `estado: "libre"` y `updatedAt` | `rtdb_actualizada.json:1314-1319` |
| `marisqueria-puerto-libres` | Arreglo 1-indexado con `null` en índice 0 | Índices 1–7 con `estado: "libre"` y `updatedAt` | `rtdb_actualizada.json:3769-3799` |
| `marisqueria-puerto-libres` | Configuración separada de cantidad | `ajustes/mesas/cantidad: 7` | `rtdb_actualizada.json:1348-1350` |

El bootstrap de tenant confirma que la forma por defecto para alimentos preparados es un arreglo con índice 0 no utilizado y tres mesas libres; si existe un formato legacy en `mesas/estado`, lo copia a `mesas` [7]. El store centralizado tolera ambos formatos al recorrer `Object.entries(data)`, descarta entradas nulas o inválidas y publica el resultado bajo `state.mesas` [8].

### 3.2 Campos de una mesa

| Campo | Tipo/ejemplo observado | Evidencia de persistencia |
|---|---|---|
| Clave/ID | `"1"`, `"2"`, `"5"` | Los registros RTDB usan claves numéricas o índices de arreglo [9]. |
| `estado` | `"libre"`; el tipo también contempla `ocupada`, `reservada`, `solicitar_cuenta` | `EstadoMesa` en `mesas.repo.ts:13`; escrituras en `:86-151`. |
| `pedidoActivoId` | string o `null` | Tipo `Mesa` en `mesas.repo.ts:15-24`; `asignarPedido` escribe el vínculo en `:99-112`. |
| `updatedAt` | entero Unix en milisegundos, por ejemplo `1782525414673` | RTDB `:3771-3774`; escritura con `ensureNumberTimestamp` en `mesas.repo.ts:86-95`. |
| `posX` | número normalizado entre 0 y 1 | Tipo `Mesa` y `guardarLayout` en `mesas.repo.ts:15-23,203-220`. No aparece en las muestras RTDB revisadas. |
| `posY` | número normalizado entre 0 y 1 | Igual que `posX`; la capacidad aplica fallback si falta [2]. |
| `shape` | `"square"` o `"round"` | Tipo y escritura de layout en `mesas.repo.ts:26-31,203-220`. No aparece en las muestras RTDB revisadas. |
| `_sendOrderLock` | objeto interno de bloqueo con `owner` y `timestamp` | Transacción en `mesas.repo.ts:162-193`; lo usa el procesamiento de pedidos, no la pantalla Admin. |

### 3.3 Adaptaciones y acciones del contrato

`useMesasManagement` se suscribe directamente a `mesas`, calcula `cantidad` desde las claves existentes, transforma cada registro en una mesa con layout y produce el resumen de libres, ocupadas y solicitudes de cuenta [2]. Sus acciones administrativas son actualizar estado, liberar, asignar pedido, solicitar cuenta, aplicar cantidad, refrescar y guardar layout.

`MesasRepository` escribe estados con `updatedAt`, asigna pedidos como `ocupada`, libera con `pedidoActivoId: null`, solicita cuenta con `solicitar_cuenta`, elimina mesas libres sobrantes y guarda posiciones/forma mediante actualización multipath [2]. También lee borradores desde `mesas_pendientes/{mesaId}/items`, una ruta que pertenece al circuito Mesero y no debe trasladarse a la caja administrativa [10].

El flujo Mesero normaliza `solicitar_cuenta` a `cuenta` y `reservada` a `ocupada` antes de alimentar `TablesGrid` [11]. Esto explica por qué `MesasRepository`, `gestionarMesas` y `TablesGrid` no pueden tratarse como piezas exclusivamente administrativas aunque el concepto de “mesa” aparezca en sus nombres.

## 4. Contradicciones, riesgos y límites

Se detectaron las siguientes diferencias de contrato, que se documentan sin corregir porque las fases 1–3 no autorizan tocar infraestructura ni lógica compartida:

| Observación | Evidencia | Riesgo/interpretación |
|---|---|---|
| El tipo `EstadoMesa` contempla `libre`, `ocupada`, `reservada` y `solicitar_cuenta`, pero `AdminTablesScreen` pinta también `pagado` mediante `(mesa.estado as any)` y muestra `(resumen as any).pagadas` | `mesas.repo.ts:13`; `AdminTablesScreen.tsx:285-289,256-260` | Posible extensión de estado no reflejada en el tipo ni en `resumen`; requiere decisión del orquestador. |
| `Mesa` no declara `total`, pero la pantalla lo lee mediante `(mesa as any).total` | `mesas.repo.ts:15-24`; `AdminTablesScreen.tsx:316-318` | El total puede venir de una ampliación dinámica del store/RTDB; no se debe tipar unilateralmente sin revisar pedidos. |
| `ajustes/mesas/cantidad` existe en Puerto Libres, mientras `useMesasManagement` calcula cantidad por claves de `mesas` | `rtdb_actualizada.json:1348-1350`; `useMesasManagement.ts:54-70` | Hay dos posibles fuentes de cantidad. El snapshot coincide en siete mesas, pero no prueba equivalencia futura. |
| RTDB mezcla arreglo 1-indexado y objeto keyed | `rtdb_actualizada.json:540-554,1314-1319,3769-3799`; `ensureTenant.ts:47-73` | El lector debe preservar compatibilidad; una migración de forma queda fuera de esta tarea. |
| `TablesGrid` usa `cuenta`, mientras el repositorio usa `solicitar_cuenta` y `gestionarMesas` adapta el estado | `TablesGrid.tsx:9-15,65-73`; `gestionarMesas.ts:49-59` | La adaptación es parte del contrato Mesero; mover o duplicar la pieza aumentaría divergencia. |

La principal contradicción operativa potencial es de nomenclatura y fuente de verdad, no una prueba suficiente de defecto. Se reporta para decisión posterior; no se modifica por cuenta propia.

## 5. Movimientos realizados

| Pieza | Origen | Transformación | Destino | Por qué | Hora UTC |
|---|---|---|---|---|---|
| Ninguna | — | No se movieron archivos | — | Las piezas exclusivas ya están en rutas canónicas; las piezas dispersas son compartidas, infraestructura o adaptadores de navegación | 2026-08-26 06:43–06:48 |

No se creó `MIGRACION.md` nuevo porque no hubo movimiento funcional en esta fase. El rastro histórico de los traslados previos está documentado en la sección 2.4 y en los commits `58c7a59` y `71d6a21`.

## 6. Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| `git fetch origin`, `git checkout rama-2`, `git pull --rebase origin rama-2` | Correcto; se trabajó sobre `rama-2`. |
| Evento dirigido a M2 y sello no procesado | Confirmado: `ev-0002`, sello `b1cd6c48b14d...`. |
| Lectura obligatoria de `AGENTS.md`, `MANIFIESTO.md`, `EVENTOS.json`, `CENTRAL/estado.md`, instrucción y estado de M2 | Completada. |
| Enumeración de rutas de Mesas | Confirmadas tres piezas exclusivas canónicas, ruta administrativa y dependencias compartidas. |
| Búsqueda estática de consumidores | Ejecutada sobre fuentes `src/` y `app/` para `useMesasManagement`, `useMesas`, `TablesGrid`, `AdminTablesScreen`, `MesasRepository` y `TableBadge`. |
| Búsqueda de imports históricos TypeScript | Sin referencias obsoletas a las rutas históricas de `AdminTablesScreen`, `useMesasManagement` o `TablesGrid`. |
| Rastro Git con `--follow` y commits de reubicación | Confirmado; la pantalla y la capacidad ya habían sido llevadas a sus rutas canónicas. |
| Parseo y lectura de RTDB | Confirmado; se inspeccionaron formas arreglo/objeto, estados, timestamps, configuración de cantidad y campos de persistencia. |
| `git diff --check` | Pendiente de ejecutar sobre la documentación final antes del commit. |
| `npx tsc --noEmit` | No ejecutado con éxito: el entorno no tiene `node_modules/.bin/tsc` y la primera invocación terminó por timeout de conexión. No hubo modificación de código funcional. |

## 7. Bloqueos y necesidades fuera de alcance

No hay bloqueo para completar fases 1–3. El principal límite es deliberado: repositorio, store, ciclo de vida, reglas RTDB, flujo Mesero, `TablesGrid`, `TableBadge` y el puente FAB son dependencias compartidas o infraestructura; la instrucción prohíbe moverlas.

La construcción posterior debe decidir, con evidencia de los demás agentes, si se requiere una fase de normalización de estados (`pagado`, `solicitar_cuenta`/`cuenta`), una única fuente de cantidad de mesas y un contrato explícito para `total`, `posX`, `posY` y `shape`. Esas decisiones no se ejecutan en este informe.

## 8. Pendientes para otros procesos

El orquestador debe absorber este resultado como **“caja de Mesas ya reunida; cero movimientos nuevos”**. Debe conservar `TablesGrid`, `TableBadge`, `MesasRepository`, `useMesas` y `usePuenteAccionesFlotantes` fuera de la caja exclusiva. También debe revisar las contradicciones de contrato antes de cualquier fase de construcción o renombrado.

M4 puede contrastar si existen piezas huérfanas genéricas alrededor de Mesas, pero no debe clasificarlas como huérfanas únicamente por estar fuera de `ui/roles/administrador/mesas/`; el uso por Mesero, Métricas, Reportes o infraestructura las excluye de la caja de M2.

## 9. Propuestas

La propuesta de M2 para la fase 4 es mantener la separación actual: UI administrativa exclusiva bajo `ui/roles/administrador/mesas`, capacidad bajo `capacidades/mesas`, lógica Mesero bajo `roles/logica/mesero`, persistencia bajo `sistema/persistencia` y UI compartida bajo `ui/bloques`/`compartido`. Antes de cualquier movimiento adicional, conviene fijar un contrato común de estados y documentar los adaptadores que traduzcan `solicitar_cuenta` a `cuenta` y `reservada` a `ocupada`.

## References

[1]: https://github.com/st-33/marisquerias/blob/rama-2/src/ui/roles/administrador/mesas/AdminTablesScreen.tsx "Pantalla administrativa de Mesas"
[2]: https://github.com/st-33/marisquerias/blob/rama-2/src/capacidades/mesas/useMesasManagement.ts "Capacidad de gestión de Mesas"
[3]: https://github.com/st-33/marisquerias/blob/rama-2/src/ui/bloques/TablesGrid.tsx "Grid compartido de mesas"
[4]: https://github.com/st-33/marisquerias/blob/rama-2/src/ui/bloques/PuestoMando.tsx "Puesto de mando del flujo Mesero"
[5]: https://github.com/st-33/marisquerias/blob/rama-2/docs/comunicacion_multimodelo/sesiones/2026-08-26_admin_inventario_mesas_reparto/M2/instruccion.md "Instrucción T-M2-01"
[6]: https://github.com/st-33/marisquerias/blob/rama-2/docs/comunicacion_multimodelo/sesiones/2026-08-26_admin_inventario_mesas_reparto/CENTRAL/estado.md "Estado central de la sesión"
[7]: https://github.com/st-33/marisquerias/blob/rama-2/src/sistema/ciclo_de_vida/ensureTenant.ts "Bootstrap y compatibilidad RTDB de Mesas"
[8]: https://github.com/st-33/marisquerias/blob/rama-2/src/sistema/store/slices/operacion.ts "Slice centralizado de operación"
[9]: https://github.com/st-33/marisquerias/blob/rama-2/rtdb_actualizada.json "Exportación RTDB de referencia"
[10]: https://github.com/st-33/marisquerias/blob/rama-2/src/sistema/persistencia/mesas.repo.ts "Repositorio de Mesas"
[11]: https://github.com/st-33/marisquerias/blob/rama-2/src/roles/logica/mesero/gestionarMesas.ts "Adaptador de Mesas para Mesero"
