# Bitácora oficial — Modelo 1

## Identidad y responsabilidad

**Soy el investigador y comunicador del Equipo Mesero.** Mi responsabilidad es conocer, mapear, investigar y comunicar el estado real del rol Mesero en Web y Android. Trabajo junto al Modelo 3, que diseña y construye. Mi función en esta sesión es proporcionar evidencia verificable, separar hechos de hipótesis, registrar dependencias, coordinar con el Equipo Menú/Administrador y establecer las condiciones de validación. No se modifica código del producto desde este registro mientras no exista un plan constructor comunicado y validado.

## Sesión

| Campo | Valor |
|---|---|
| Proyecto | `marisquerias` |
| Equipo | Equipo 1 — Rol Mesero / Terminal Operativa |
| Modelo | Modelo 1 — Investigador y Comunicador |
| Sesión | `2026-08-16_menu_mesero_overhaul` |
| Rama única observada | `main` |
| Estado inicial de Git | Limpio; `HEAD` coincide con `origin/main` en `0176df7` |
| Marca temporal de esta auditoría | `2026-08-17 05:40:09 UTC` |
| Material recibido | `pasted_content.txt`, `pasted_content_2.txt` y capturas visuales adjuntas |
| Regla aplicada | El código real determina el estado actual; el material proporcionado determina el objetivo y los problemas a comprobar |

## Alcance confirmado por el protocolo

El trabajo no se reduce a corregir un bug aislado. El flujo que debe conservarse es **Administrador → Menú → Estado del menú → Mesero → Operación**. Web y Android comparten la función y la fuente de verdad, pero requieren adaptaciones de interfaz y de interacción. El Modelo 1 debe observar, investigar, mapear, detectar, verificar, comunicar y documentar; el Modelo 3 debe diseñar y construir. Los cambios estructurales que afecten al consumidor del Mesero deben comunicarse entre equipos antes de implementarse.

Los problemas de entrada del Equipo Mesero son: latencia y re-renderizado del selector de productos y variantes; bloqueo o permanencia incorrecta del FAB al cambiar de ruta; consumo de grupos de variantes, exclusiones y visibilidad emitidos por el Administrador; y el error de background de inventario `Stock insuficiente para itemId=camaron-1. Disponible: 0`. El protocolo exige comprobar el impacto en Web y Android, no asumir que una plataforma representa a la otra, y no eliminar código sin evidencia de uso o sustitución.

## Mapa operativo confirmado

| Tramo | Implementación observada | Evidencia | Estado |
|---|---|---|---|
| Entrada de ruta | `app/_role/mesero.tsx` delega a `useScreenResolver('mesero')` y renderiza la pantalla resuelta | `app/_role/mesero.tsx:6-17` | MAPEADO |
| Pantalla FOH | `MeseroScreen` conecta sesión, RTDB, hardware, listeners de estado, lógica de mesas, selector de productos y selector de variantes | `src/catalogo/_compartido/pantallas/MeseroScreen.tsx:28-150` | MAPEADO |
| Fuente de menú | `useProductSelector` consume `useCategorias()` y `useProductos()` desde el store central; no crea listeners propios | `src/plataforma/dominios/marisqueria/mesero/useProductSelector.ts:20-28`; `src/plataforma/core/store/index.ts:128-133` | DETECTADO |
| Filtrado de categorías | Exige `activo !== false` y `cat.herencia?.mesero !== false` | `useProductSelector.ts:56-66` | DETECTADO |
| Filtrado de productos | Exige coincidencia de categoría, `prod.activo !== false` y `prod.visible?.mesero !== false` | `useProductSelector.ts:34-53` | DETECTADO |
| Borrador de comanda | Se sincroniza por mesa en `${tenantPath}/mesas_pendientes/${mesaId}/items`, con UI optimista | `useSharedDrafts.ts:38-70` | MAPEADO |
| Selección sin variantes | `startSelection` arma un `PendingItem` inmediatamente | `useVariantSelector.ts:69-95` | MAPEADO |
| Selección con variantes | Lee `product.variantes.grupos`, mantiene selecciones por grupo y calcula delta/labels | `useVariantSelector.ts:44-55`, `100-144` | MAPEADO |
| Reglas de variantes | Evalúa visibilidad, deshabilitado, triggers y exclusiones; el orden visible filtra grupos ocultos | `rules.ts:31-137` | MAPEADO |
| Confirmación visual | `VariantsModal` calcula grupos obligatorios visibles y deshabilita `Agregar` si falta alguno | `VariantsModal.tsx:116-183`, `391-404` | DETECTADO |
| Alta al borrador | `MeseroScreen` añade el `PendingItem` a la mesa activa y cierra el selector | `MeseroScreen.tsx:188-214` | MAPEADO |
| Envío a cocina | Limpieza optimista del draft, lock transaccional de mesa, creación o ampliación de pedido, envío a cocina y rollback ante error | `procesarPedido.ts:81-179` | MAPEADO |
| Pedido vivo | Se deriva del pedido activo del store y conserva variantes, labels y `inventoryDeducted` | `useMeseroLogic.ts:213-254` | MAPEADO |
| Entrega de ítem | Marca el ítem como `entregado` sin esperar el descuento de inventario en background | `useMeseroLogic.ts:304-337` | DETECTADO; RIESGO ALTO |
| Descuento de stock | Usa receta V2, resuelve área y catálogo, ejecuta `registrarSalidaMultiple(... allowNegative: false)` y absorbe el error en log | `descontarInventario.ts:56-159` | DETECTADO |
| Total de pedido | `useMeseroLogic` suma drafts y pedido vivo; `PuestoMando` lo entrega a `ActionArea` | `useMeseroLogic.ts:261-274`; `MeseroScreen.tsx:219-249` | MAPEADO |
| Auto-ocultamiento | Existe `useTotalAutoHide`, pero no se encontró ninguna llamada al hook; `MeseroScreen` no pasa `isTotalVisible`, por lo que `PuestoMando` conserva el valor por defecto `true` | `useTotalAutoHide.ts:18-49`; `PuestoMando.tsx:145-149`, `197-198`; búsqueda global sin consumidores | DETECTADO; INCOMPLETO |
| FAB | El layout raíz lee `fabConfigs[pathname]`; el puente normaliza el pathname, registra en Zustand y limpia al desmontar | `app/_layout.tsx:82-115`; `usePuenteAccionesFlotantes.ts:23-61` | MAPEADO |
| Registro FAB real | Se encontraron llamadas del puente en PanelInventario, AdminDashboard, AdminMenu y AdminTables; no se encontró llamada en Mesero | `grep` sobre `app` y `src`; `MeseroScreen.tsx` no importa el puente | DETECTADO; HIPÓTESIS DE BLOQUEO |
| Listeners globales | El layout ejecuta `useAppListeners`; el store monta listeners de operación e inventario por `tenantPath` | `src/plataforma/core/store/index.ts:261-310` | DETECTADO |

## Registro de movimientos

### Registro 001 — Reconocimiento y localización

| Campo | Registro |
|---|---|
| HORA | `2026-08-17 05:33–05:35 UTC` |
| MODELO | Modelo 1 |
| ORIGEN | Protocolo maestro y repositorio GitHub conectado |
| ACCIÓN | Se localizó y clonó el proyecto real `st-33/marisquerias` en `/home/ubuntu/marisquerias`; se verificó la rama única disponible |
| ÁREA | Proyecto completo / Equipo Mesero |
| ARCHIVO O RUTA | `/home/ubuntu/marisquerias`; rama `main` |
| HALLAZGO | El repositorio existe, está en `main`, no tiene cambios de trabajo iniciales y `HEAD` coincide con `origin/main` |
| EVIDENCIA | `git status --short --branch` reportó `## main...origin/main`; `git log` mostró `0176df7` como `HEAD -> main, origin/main` |
| IMPACTO | Es posible auditar sobre el estado real y conservar los cambios de comunicación en la misma rama de integración |
| DECISIÓN | No modificar código funcional durante el reconocimiento |
| ACCIÓN SIGUIENTE | Completar el mapa y registrar hallazgos antes de entregar trabajo a Modelo 3 |
| ESPERANDO A | Modelo 3 para plan técnico de construcción, no para investigación general |
| ESTADO | MAPEANDO |

### Registro 002 — Fuente compartida del menú

| Campo | Registro |
|---|---|
| HORA | `2026-08-17 05:35 UTC` |
| MODELO | Modelo 1 |
| ORIGEN | Inspección de código del Mesero y store central |
| ACCIÓN | Se rastreó el consumo de categorías y productos desde la pantalla hasta el store |
| ÁREA | Mesero / Menú compartido / sincronización |
| ARCHIVO O RUTA | `src/catalogo/_compartido/pantallas/MeseroScreen.tsx`; `src/plataforma/dominios/marisqueria/mesero/useProductSelector.ts`; `src/plataforma/core/store/index.ts` |
| HALLAZGO | El selector no tiene una fuente de menú independiente: consume el store central, que se alimenta mediante listeners globales por `tenantPath` |
| EVIDENCIA | `useProductSelector.ts:20-28`; `store/index.ts:265-310` |
| IMPACTO | Un cambio del Equipo Menú en payload, visibilidad o estado puede modificar directamente lo que el Mesero ve; debe existir coordinación interequipos |
| DECISIÓN | Tratar el store y sus contratos como dependencia compartida; no crear un menú paralelo para Mesero |
| ACCIÓN SIGUIENTE | Comunicar al Modelo 2 que el Mesero depende de `useCategorias`, `useProductos` y de los flags `activo`, `visible.mesero` y `herencia.mesero` |
| ESPERANDO A | Modelo 2 para confirmar el payload administrativo vigente y sus reglas de publicación |
| ESTADO | COMUNICADO |

### Registro 003 — Variantes y obligatoriedad

| Campo | Registro |
|---|---|
| HORA | `2026-08-17 05:36 UTC` |
| MODELO | Modelo 1 |
| ORIGEN | Inspección del flujo selector → modal → draft |
| ACCIÓN | Se verificó cómo el Mesero decide si un producto requiere variantes y cómo calcula precio y labels |
| ÁREA | Selector de variantes / reglas / UI Android-Web compartida |
| ARCHIVO O RUTA | `useVariantSelector.ts`; `rules.ts`; `VariantsModal.tsx`; `MeseroScreen.tsx` |
| HALLAZGO | La lógica de selección conserva grupos, opciones, delta, labels y `prepMin`; el modal valida grupos visibles `obligatorio` antes de habilitar `Agregar` y aplica reglas de visibilidad/deshabilitado |
| EVIDENCIA | `useVariantSelector.ts:48-55`, `69-95`, `100-144`; `rules.ts:31-137`; `VariantsModal.tsx:121-183`, `391-404` |
| IMPACTO | La base funcional de reglas y requeridos existe, pero la interfaz todavía conserva elementos que el protocolo de rediseño pide retirar: `Paso X de Y`, `Anterior`, subtítulos, iconos de check y botón `X` rígido |
| DECISIÓN | Modelo 1 no diseña ni modifica la UI; debe entregar al Modelo 3 el inventario de comportamiento existente para que la simplificación no rompa las reglas |
| ACCIÓN SIGUIENTE | Solicitar a Modelo 3 un plan que preserve `evaluateRules`, `getOrderedVisibleGroups`, `missingRequired` y `computeVariantDeltaAndLabels` o justifique cualquier sustitución |
| ESPERANDO A | Modelo 3 |
| ESTADO | ESPERANDO |

### Registro 004 — Error de inventario en background

| Campo | Registro |
|---|---|
| HORA | `2026-08-17 05:36–05:37 UTC` |
| MODELO | Modelo 1 |
| ORIGEN | Bug reportado en material del usuario y lectura del flujo de entrega |
| ACCIÓN | Se rastreó el punto de llamada del descuento de inventario y el manejo de errores |
| ÁREA | Mesero / inventario V2 / entrega |
| ARCHIVO O RUTA | `useMeseroLogic.ts:297-337`; `descontarInventario.ts:56-159` |
| HALLAZGO | Al marcar un ítem como entregado, `markAsDelivered` inicia `descontarStockDeItem` en una función asíncrona no esperada y después actualiza inmediatamente el estado del ítem a `entregado`. El descuento usa `allowNegative: false`; si el stock es insuficiente, el repositorio falla y el error se registra, pero no se devuelve al Mesero ni impide la entrega lógica |
| EVIDENCIA | `useMeseroLogic.ts:316-330`; `descontarInventario.ts:123-158`; error de entrada: `Stock insuficiente para itemId=camaron-1. Disponible: 0` |
| IMPACTO | Existe una divergencia entre el estado operativo del pedido y el estado del inventario: el pedido puede aparecer entregado aunque no se haya descontado stock. Además, la interfaz no recibe feedback para corregir el dato o la configuración |
| INTERPRETACIÓN | El fallo de background no nace en el alta del producto ni en el envío a cocina; se materializa durante la entrega y se oculta mediante absorción del error |
| HIPÓTESIS | El origen funcional más probable del reporte es la combinación de descuento tardío, `allowNegative: false` y ausencia de feedback transaccional; todavía debe comprobarse el contrato esperado del inventario con el Equipo Menú |
| DECISIÓN | No cambiar el flujo sin coordinar con el Modelo 2 y sin que el Modelo 3 reciba una opción de interacción; primero debe decidirse si la entrega se bloquea, se marca con estado de excepción o se permite con alerta y reintento |
| ACCIÓN SIGUIENTE | Comparar con la política administrativa de inventario y definir un contrato de error compartido |
| ESPERANDO A | Modelo 2 y Modelo 3 |
| ESTADO | BLOQUEADO |

### Registro 005 — FAB por ruta

| Campo | Registro |
|---|---|
| HORA | `2026-08-17 05:37–05:38 UTC` |
| MODELO | Modelo 1 |
| ORIGEN | Reporte de consola `[FAB_BRIDGE]` / `[FAB]` y auditoría de referencias |
| ACCIÓN | Se rastreó el puente, el store y el renderizador global del FAB |
| ÁREA | Navegación Web/Android / FAB / Admin vs Mesero |
| ARCHIVO O RUTA | `usePuenteAccionesFlotantes.ts`; `app/_layout.tsx`; `src/catalogo/_compartido/bloques/FabRadial.tsx`; `src/plataforma/core/store/slices/ui.ts` |
| HALLAZGO | El puente normaliza el pathname quitando una barra final antes de guardar la configuración; el layout lee `fabConfigs[pathname]` sin esa normalización. Además, se encontraron registros del puente en pantallas Admin y PanelInventario, pero no en la pantalla Mesero |
| EVIDENCIA | `usePuenteAccionesFlotantes.ts:23-61`; `app/_layout.tsx:82-115`; búsqueda de `usePuenteAccionesFlotantes` con resultados únicamente en PanelInventario, AdminDashboard, AdminMenu y AdminTables; `FabRadial.tsx` no contiene router ni listeners de ruta |
| IMPACTO | Hay dos posibles causas que deben separarse: una discrepancia de clave por normalización del pathname y una ausencia de configuración propia del Mesero. No se debe atribuir el bloqueo al renderer radial sin comprobar la ruta efectiva en runtime |
| DECISIÓN | Clasificar como hipótesis de navegación/configuración, no como causa confirmada. El constructor debe instrumentar o probar la ruta real antes de modificar el renderer |
| ACCIÓN SIGUIENTE | Modelo 3 debe confirmar si el Mesero requiere FAB; si lo requiere, identificar su config, su ciclo de montaje y las claves exactas observadas en Web y Android |
| ESPERANDO A | Modelo 3 |
| ESTADO | VERIFICANDO |

### Registro 006 — Total automático de tres segundos

| Campo | Registro |
|---|---|
| HORA | `2026-08-17 05:38 UTC` |
| MODELO | Modelo 1 |
| ORIGEN | Requisito del protocolo y auditoría de componentes de comanda |
| ACCIÓN | Se buscó el consumidor de `useTotalAutoHide` y se revisó la conexión con `PuestoMando`/`ActionArea` |
| ÁREA | Comanda / barra de total / Android y Web |
| ARCHIVO O RUTA | `useTotalAutoHide.ts`; `PuestoMando.tsx`; `ActionArea.tsx`; `MeseroScreen.tsx` |
| HALLAZGO | El hook `useTotalAutoHide` implementa la intención de 3 segundos, pero modifica estado durante render al invocar `Date.now()` en ramas de cambio de mesa/conteo. No se encontró ningún consumidor del hook. `PuestoMando` usa `isTotalVisible = true` por defecto y `MeseroScreen` no pasa dicha prop; `ActionArea` recibe `isCollapsed=false` de forma efectiva |
| EVIDENCIA | `useTotalAutoHide.ts:23-49`; `PuestoMando.tsx:145-149`, `197-198`, `270-281`; `MeseroScreen.tsx:219-249`; `ActionArea.tsx:62-71`, `98-158`; lint reportó errores de pureza en `useTotalAutoHide.ts:31` y `35` |
| IMPACTO | El requisito de ocultar el resumen tras 3 segundos no está conectado al flujo visible y el hook existente introduce un fallo de pureza React si se conecta sin refactorizar |
| DECISIÓN | Entregar al Modelo 3 el problema como integración funcional, no como simple ajuste visual. Debe mover las transiciones a efectos/eventos y conectar explícitamente la visibilidad al componente consumidor |
| ACCIÓN SIGUIENTE | Construir una prueba de interacción para seleccionar mesa, agregar ítem, mostrar total y ocultarlo después de 3 segundos en Web y Android |
| ESPERANDO A | Modelo 3 |
| ESTADO | DETECTADO |

### Registro 007 — Línea base de validación

| Campo | Registro |
|---|---|
| HORA | `2026-08-17 05:38–05:39 UTC` |
| MODELO | Modelo 1 |
| ORIGEN | Scripts declarados en `package.json` |
| ACCIÓN | Se instalaron dependencias sin alterar el lockfile y se ejecutaron TypeScript, pruebas y lint |
| ÁREA | Build / calidad estática |
| ARCHIVO O RUTA | `package.json`; `tsconfig.json`; `package-lock.json` |
| HALLAZGO | `npm ci` no puede ejecutarse porque `package.json` y `package-lock.json` están desincronizados: faltan `@emnapi/core@1.11.3` y `@emnapi/runtime@1.11.3`, y `@emnapi/wasi-threads` tiene una versión incompatible. Con instalación no-lockfile, las pruebas pasan `18/18` suites y `113/113` tests. TypeScript falla antes de analizar el proyecto porque falta `expo-env.d.ts`, declarado en `tsconfig.json:31` y `42`. Lint falla con `111` problemas: `67` errores y `44` warnings; entre los relevantes del Mesero aparecen la pureza de `useTotalAutoHide.ts`, formato en `gestionarMesas.ts` y variable `labels` no usada en `useVariantSelector.ts` |
| EVIDENCIA | Salidas de `npm ci`, `npm test -- --runInBand`, `npm run check-types` y `npm run lint` |
| IMPACTO | La suite de pruebas existente ofrece una línea base positiva, pero no demuestra el flujo Mesero completo; el build de tipos y lint no están limpios. La ausencia de `expo-env.d.ts` impide interpretar el estado de TypeScript como validado |
| DECISIÓN | No corregir automáticamente estos problemas desde Modelo 1. Deben registrarse y asignarse: lockfile/entorno al responsable de infraestructura; pureza y conexión del total a Modelo 3; payload y contratos a Modelo 2/4 |
| ACCIÓN SIGUIENTE | Ejecutar pruebas específicas del flujo Mesero cuando existan o solicitar al constructor que agregue pruebas junto con su cambio |
| ESPERANDO A | Modelo 3, Modelo 2 y responsable de build |
| ESTADO | BLOQUEADO |

## Hallazgos prioritarios separados por certeza

| Prioridad | Tipo | Hallazgo | Certeza | Responsable siguiente |
|---|---|---|---|---|
| P0 | Hecho | El descuento de inventario se dispara en background y el ítem se marca entregado antes de conocer el resultado | Confirmado por código | Modelo 2 define contrato; Modelo 3 implementa feedback/interacción; constructor de lógica aplica solución |
| P1 | Hecho | El auto-hide de total no está conectado y el hook existente contiene llamadas impuras durante render | Confirmado por código y lint | Modelo 3 |
| P1 | Hecho | El selector sí filtra `activo`, `visible.mesero` y `herencia.mesero` desde el store central | Confirmado por código | Modelo 2 debe preservar payload |
| P1 | Hipótesis | El FAB puede fallar por discrepancia de normalización de pathname o por falta de registro en Mesero | Evidencia parcial; falta runtime | Modelo 3 debe reproducir y medir |
| P2 | Hecho | Las reglas de variantes y requeridos están implementadas, aunque la UI conserva elementos que el protocolo pide simplificar | Confirmado por código | Modelo 3 |
| P2 | Hecho | La suite actual pasa 113 tests, pero no contiene una validación end-to-end del flujo Mesero identificado | Confirmado por cobertura observada | Modelo 3 + Modelo 1 |

## Comunicación formal al Modelo 3

**MODELO 3 REPORTA / MODELO 1 SOLICITA CONTEXTO DE CONSTRUCCIÓN:** antes de tocar código, presentar un plan técnico con archivos exactos, componentes a simplificar, estilos a modernizar y estrategia de validación Web/Android. El plan debe conservar el contrato funcional de variantes y visibilidad; no debe crear un menú paralelo ni modificar una pieza compartida sin evaluar el impacto en el Administrador.

El orden recomendado de intervención, sujeto a decisión del constructor, es: primero preservar y probar el contrato actual del selector; después resolver la integración del total automático; luego rediseñar el selector y la comanda sin perder reglas; por último investigar el FAB y el error de inventario con pruebas de estado. Esta secuencia es una propuesta de riesgo, no una orden de diseño.

Para el bug de inventario, el constructor debe decidir explícitamente entre bloquear la transición a `entregado`, marcar un estado de excepción con reintento, o permitir la entrega con feedback visible y una política de reconciliación. La elección requiere la definición del Equipo Menú sobre la autoridad del stock. No se considera válido ocultar el error en logs ni declarar resuelto el problema porque la interfaz ya no muestre una excepción.

## Comunicación al Equipo Menú / Administrador

**MODELO 1 REPORTA AL MODELO 2:** el Mesero consume el menú desde el store central alimentado por listeners globales, no desde un catálogo propio. La visibilidad efectiva depende de `producto.activo`, `producto.visible.mesero`, `categoria.activo` y `categoria.herencia.mesero`. El payload de variantes se transforma en `PendingItem` y luego en `pedido.items` conservando `variantes` y `variantLabels`.

Se necesita confirmar: la semántica administrativa de disponibilidad frente a stock insuficiente; si una variante desactivada debe bloquear la selección, ocultarse o producir una actualización en tiempo real; qué estado debe exhibir el Mesero cuando el descuento no puede ejecutarse; y si `inventoryAutoDiscount` es obligatorio para todas las operaciones o solo para negocios configurados. Hasta obtener esa definición, cualquier corrección que solo cambie el consumidor sería una suposición.

## Validación pendiente de la sesión

| Área | Estado | Evidencia actual | Falta |
|---|---|---|---|
| Reconocimiento de Web | Parcial | Rutas Expo, componentes compartidos y layout inspeccionados | Ejecutar flujo visual en Web y comprobar viewport/overflow |
| Reconocimiento de Android | Parcial | Código React Native, Modal, `Platform.OS`, haptics y safe areas inspeccionados | Ejecutar flujo táctil real o prueba equivalente en dispositivo/emulador |
| Selector de menú | MAPEADO | Filtrado y fuente central comprobados | Prueba con cambios de disponibilidad emitidos por Administrador |
| Variantes | MAPEADO | Reglas, required, delta y labels comprobados | Prueba de reglas condicionales y cambio libre de grupos |
| Inventario | BLOQUEADO | Punto de fallo y absorción del error comprobados | Contrato de estado/feedback y prueba de stock 0 |
| FAB | VERIFICANDO | Puente, store, layout y ausencia de registro Mesero comprobados | Reproducción con pathname real en ambas plataformas |
| Total 3 s | DETECTADO | Hook desconectado y lint impuro comprobados | Refactor constructor + prueba temporal |
| Build | BLOQUEADO | `npm ci`, TypeScript y lint con fallos; tests verdes | Resolver lockfile/`expo-env.d.ts` y reducir errores de lint |

## Estado de la sesión

**Estado global: BLOQUEADO PARA CONSTRUCCIÓN NO COORDINADA; MAPEADO PARA PLANIFICACIÓN.** Ya existe evidencia suficiente para que el Modelo 3 redacte su plan técnico y para que el Modelo 2 confirme los contratos del Menú. No existe evidencia suficiente para afirmar una causa única del FAB ni para elegir unilateralmente la política de inventario. La rama permanece sin cambios funcionales; la única modificación de esta sesión es este registro oficial del Modelo 1.

## Próxima acción

El siguiente movimiento del Modelo 1 es recibir el plan del Modelo 3, contrastarlo contra este mapa y registrar cualquier divergencia antes de que se modifique código. En paralelo, debe recibirse del Modelo 2 la semántica de disponibilidad/inventario y el payload administrativo de variantes. Después de la construcción, el Modelo 1 comprobará el flujo completo **Administrador desactiva → estado persiste → Mesero recibe → selector respeta → pedido opera**, en Web y Android, además de verificar que no haya regresión en sincronización, persistencia, impresión y cierre de mesa.


### Registro 008 — Exportación Web

| Campo | Registro |
|---|---|
| HORA | `2026-08-17 05:40–05:42 UTC` |
| MODELO | Modelo 1 |
| ORIGEN | Validación de plataforma disponible en el entorno |
| ACCIÓN | Se ejecutó `npx expo export --platform web --output-dir .expo/export-web` |
| ÁREA | Web / Expo Router / Metro |
| ARCHIVO O RUTA | `.expo/export-web` |
| HALLAZGO | La exportación Web terminó correctamente y generó los bundles de entrada y las rutas estáticas, incluida `/_role/mesero` y las rutas Admin. Metro reportó advertencia de configuración Sentry ausente, pero no impidió la exportación |
| EVIDENCIA | Salida de Expo: `Exported: .expo/export-web`; verificación de bundle: `WEB_EXPORT=OK` |
| IMPACTO | El proyecto puede compilarse para Web en el estado actual; esto no demuestra todavía que el flujo visual, el FAB, el total ni la sincronización se comporten correctamente en runtime |
| DECISIÓN | Registrar Web como `EXPORTADO`, no como `VALIDADO`; conservar pendiente la comprobación interactiva y la validación Android |
| ACCIÓN SIGUIENTE | Modelo 3 debe probar el flujo visual en Web y Android después de su intervención; Modelo 1 debe verificar el flujo completo |
| ESPERANDO A | Modelo 3 y acceso a ejecución Android/dispositivo |
| ESTADO | EXPORTADO; VALIDACIÓN FUNCIONAL PENDIENTE |

## Estado actualizado tras la exportación Web

La exportación Web es una señal positiva de compilación, pero no cambia los bloqueos funcionales. Siguen pendientes la decisión de contrato para stock insuficiente, la reproducción del FAB por pathname, la conexión correcta del auto-hide de tres segundos, la corrección de TypeScript por `expo-env.d.ts`, la sincronización del lockfile y la reducción de errores de lint. Android no se declara validado porque no se ejecutó un dispositivo o emulador en esta sesión.


## Registro de vigilancia — aprobación del plan del Modelo 3

| Campo | Registro |
|---|---|
| HORA | `2026-08-17 06:59:35 UTC` |
| MODELO | Modelo 1 |
| ORIGEN | Instrucción explícita del usuario / aprobación del plan técnico del Modelo 3 |
| ACCIÓN | Se autoriza el inicio de la intervención del Modelo 3 sobre `ProductPickerOverlay.tsx`, `VariantsModal.tsx`, `PuestoMando.tsx`, `ActionArea.tsx`, `OrderItemCard.tsx` y `MeseroScreen.tsx` únicamente para la integración necesaria del auto-hide y total |
| ÁREA | Equipo Mesero / reconstrucción visual e interacción |
| HALLAZGO | El working tree se encontraba limpio al inicio de la vigilancia; la rama `main` estaba adelantada dos commits documentales respecto a `origin/main` |
| EVIDENCIA | `git status --short --branch`: `## main...origin/main [ahead 2]` |
| IMPACTO | La construcción puede comenzar sin mezclar cambios funcionales previos; la bitácora oficial queda modificada localmente para registrar la autorización |
| DECISIÓN | Vigilar que no se modifiquen contratos del store central ni se eliminen `useProductSelector` o `useVariantSelector`; no realizar commits hasta recibir working tree final validado en Web y Android |
| ACCIÓN SIGUIENTE | Inspeccionar los cambios del working tree, comparar archivos autorizados y verificar dependencias compartidas |
| ESPERANDO A | Modelo 3: intervención y entrega del working tree validado |
| ESTADO | CONSTRUYENDO / VIGILANCIA ACTIVA |

### Criterios de rechazo durante la vigilancia

El Modelo 1 reportará como **RECHAZADO** cualquier cambio que elimine o sustituya sin justificación el consumo del store central, `useProductSelector`, `useVariantSelector`, el contrato de variantes, los flags de visibilidad o la integración funcional con `MeseroScreen`. También quedará pendiente de validación cualquier cambio en archivos compartidos que no documente su impacto en Administrador/Menú, Web y Android.

La bitácora queda actualizada localmente, pero **no se ha realizado commit** conforme a la instrucción recibida.


### Registro de vigilancia 001 — working tree sin intervención del Modelo 3

| Campo | Registro |
|---|---|
| HORA | `2026-08-17 07:00:30 UTC` |
| MODELO | Modelo 1 |
| ORIGEN | Inspección activa posterior a la aprobación |
| ACCIÓN | Se comparó el working tree con `HEAD` y se verificaron hashes de los archivos autorizados y protegidos |
| ÁREA | ProductPickerOverlay, VariantsModal, PuestoMando, ActionArea, OrderItemCard, MeseroScreen, store central y hooks del Mesero |
| HALLAZGO | No hay modificaciones del Modelo 3 todavía. El único archivo modificado frente a `HEAD` es esta bitácora, cuya actualización no ha sido committeada |
| EVIDENCIA | `git diff --name-status` reportó únicamente `M comunicacion_multimodelo/sesiones/2026-08-16_menu_mesero_overhaul/modelo_1.md`; los hashes de los archivos protegidos coinciden con la línea base |
| IMPACTO | No existe aún un working tree constructor que validar; los contratos y hooks permanecen intactos |
| DECISIÓN | Mantener estado de vigilancia activa y no ejecutar commit |
| ACCIÓN SIGUIENTE | Repetir la inspección cuando el Modelo 3 entregue cambios o indique que terminó la intervención |
| ESPERANDO A | Modelo 3 |
| ESTADO | VIGILANCIA / ESPERANDO |


## 2026-08-17 — Consolidación del diff UI/UX y parches operativos del Modelo 1

**Estado:** validado en working tree; pendiente de commit y publicación remota.

Por instrucción operativa, se aplicó sobre `main` el diff relevante entregado por el Modelo 3 desde `origin/manus/reconstruccion-operativa-inicial`, limitado al flujo Mesero y sus dependencias de UI/FAB. Quedaron validados explícitamente los cuatro archivos principales solicitados: `ProductPickerOverlay.tsx`, `VariantsModal.tsx`, `ActionArea.tsx` y `PuestoMando.tsx`. También se integraron las modificaciones necesarias de `OrderItemCard.tsx`, `OrderList.tsx`, `MeseroScreen.tsx`, `TablesGrid.tsx`, `useMeseroLogic.ts` y los componentes/controladores del FAB.

### Parche FAB Radial

Se eliminó la discrepancia de claves de ruta mediante la nueva utilidad común `src/plataforma/core/navigation/normalizePathname.ts`, usada por `app/_layout.tsx` y `usePuenteAccionesFlotantes.ts`. La utilidad convierte rutas vacías en `/` y elimina una o varias barras finales, por lo que el registro y la lectura del FAB usan exactamente la misma clave. `GlobalFabSlot` incorpora además una clave estable por ruta e `initialKey` para reiniciar el estado visual al cambiar de pantalla. Se añadió cobertura para raíz, ruta normal y múltiples barras finales.

### Parche de inventario

`descontarInventario.ts` dejó de absorber silenciosamente las excepciones en una tarea background. Ahora devuelve un resultado estructurado, clasifica `Stock insuficiente para itemId=camaron-1` como `INSUFFICIENT_STOCK`, persiste `inventoryError`, `inventoryErrorCode` e `inventoryErrorAt` mediante `PedidosRepository.actualizarItem`, y solo marca el item como `entregado` después de completar correctamente el descuento. `useMeseroLogic.ts` espera el resultado y bloquea la transición cuando falla; `MeseroScreen.tsx` muestra el motivo al Mesero mediante una alerta. Se conservaron `useProductSelector`, `useVariantSelector` y los contratos del store central.

### Auto-hide y compatibilidad

Se conectó `useTotalAutoHide` a `MeseroScreen`/`PuestoMando` para mostrar el total durante tres segundos después de seleccionar mesa o cambiar la cantidad de items. Se retiraron sincronizaciones de estado durante render/efecto que impedían el lint limpio. Se restauró `expo-env.d.ts`, se completó el helper `getVariantOptionLabel` requerido por el diff del Modelo 3 y se extendió el contrato persistido del item con metadatos de inventario.

### Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| Jest completo | **20 suites, 117 tests: todos pasan** |
| TypeScript (`npm run check-types`) | **Pasa sin errores** |
| ESLint focalizado sobre archivos modificados | **Pasa sin errores ni advertencias** |
| Exportación Web (`npx expo export --platform web`) | **Pasa; 17 rutas estáticas exportadas, incluida `/_role/mesero`** |
| `git diff --check` | **Pasa** |
| Android | No se ejecutó una compilación Android en este entorno; no se declara validación Android inexistente. |

La rama todavía no tiene el commit oficial de esta consolidación. El siguiente paso autorizado es `git add`, crear el commit solicitado y ejecutar `git push origin main` después de una última inspección del diff staged.
