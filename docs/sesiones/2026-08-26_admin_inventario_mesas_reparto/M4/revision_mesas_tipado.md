# Revisión técnica — Módulo Mesas

| Campo | Valor |
|---|---|
| Revisor | M4 |
| Alcance | Tipado, nomenclatura, contratos, dependencias y calidad del código |
| Rama | `rama-2` |
| Snapshot revisado | `f57b427` (`docs(multimodelo): actualizar libro de eventos`) |
| Construcción funcional principal | `23e42b2` (`refactor(admin): construir inventario y mesas`) |
| Estado | Revisión directa; sin modificaciones funcionales |
| Fecha/hora UTC | `2026-08-26 07:28` |

## 1. Dictamen ejecutivo

La construcción de Mesas está **correctamente conectada a nivel de composición**: `app/_role/admin/tables.tsx` resuelve `admin_tables`, `src/composicion/registroPantallas.ts` registra `PantallaMesas`, el barril de capacidades expone `useGestionMesas` y la pantalla consume la capacidad nueva. La migración de los nombres públicos principales quedó aplicada: `AdminTablesScreen → PantallaMesas`, `useMesasManagement → useGestionMesas` y `SummaryCard → TarjetaResumen`.

No obstante, el módulo **todavía no cumple un estándar estricto de calidad tipada y nomenclatura**. Hay escapes explícitos con `any`, campos que la UI lee pero no existen en los contratos, una limpieza Firebase probablemente incorrecta, una construcción de repositorio que puede fallar con `tenantPath` vacío, residuos de estilos de la extracción y errores de formato reportados por ESLint. El módulo compila y la suite global está verde, pero la compilación no detecta estos problemas porque varios están ocultos mediante casts.

## 2. Integración y nomenclatura que sí quedaron bien

| Área | Evidencia | Evaluación |
|---|---|---|
| Enrutamiento | `app/_role/admin/tables.tsx:7,10-17` | Adaptador fino; usa `useResolvedorPantalla('admin_tables')`. |
| Registro | `src/composicion/registroPantallas.ts:6,35-36` | `admin_tables → PantallaMesas` conectado. |
| Capacidad pública | `src/capacidades/mesas/index.ts:1`; `src/capacidades/index.ts:8` | `useGestionMesas` expuesto por barril local y raíz. |
| Pantalla | `PantallaMesas.tsx:29,307` | Nombre nuevo correcto y exportación default consistente. |
| Componente extraído | `componentes/TarjetaResumen.tsx:9,16` | Props públicas en español: `titulo`, `valor`, `icono`, `color`. |
| Props de capacidad | `useGestionMesas.ts:16-19` | `PropsGestionMesas` está en español y acota `db`/`tenantPath`. |
| Ausencia de referencias funcionales antiguas | Búsqueda en `src`/`app` | No quedan imports funcionales de `AdminTablesScreen` ni `useMesasManagement`; la única coincidencia de `SummaryCard` es una nota histórica. |

## 3. Hallazgos críticos y altos

### 3.1. `any` oculta un contrato inexistente de estados, pagos y totales

**Evidencia:** `PantallaMesas.tsx:236,266,294-295`; `mesas.repo.ts:13-24`.

La UI presenta una tarjeta **“Pagadas”** leyendo `(resumen as any).pagadas`, pero `useGestionMesas` solo devuelve `libres`, `ocupadas`, `solicitarCuenta` y `total` en `useGestionMesas.ts:167-172`. En consecuencia, el valor no está respaldado por el contrato y cae a `0`.

La UI también compara `(mesa.estado as any) === 'pagado'`, aunque `EstadoMesa` solo admite `libre | ocupada | reservada | solicitar_cuenta`. El flujo real de cobro confirma que el pedido se cierra y la mesa se libera: `useMeseroLogic.ts:369-371`; no existe una transición de la mesa a `pagado`. Esta rama es una extensión local no respaldada y, con el contrato actual, es inalcanzable.

Finalmente, `(mesa as any).total` no está declarado en `Mesa`. El repositorio define `Mesa` en `mesas.repo.ts:15-24` sin `total`, por lo que el código presenta un dato que no puede garantizar que exista. La muestra RTDB versionada contiene estados y timestamps de mesa, pero los pagos y totales pertenecen a `pedidos`, no a la entidad `mesas` (`rtdb_actualizada.json:543-568`, incluyendo `pedidos.*.pagadoAt`).

**Dictamen:** hallazgo alto. No debe “corregirse” agregando `pagado`, `pagadas` o `total` mediante otro cast o extendiendo unilateralmente el union. El orquestador debe decidir una de estas rutas: retirar la tarjeta/rama hasta tener fuente real, o definir un contrato explícito que derive pagos desde pedidos y documente el origen del total.

### 3.2. El cleanup de listeners de Firebase usa el valor equivocado

**Evidencia:** `src/sistema/persistencia/mesas.repo.ts:48-53,59-64`; declaración Firebase `@firebase/database/dist/public.d.ts:899` y `:1368`; implementación `node_modules/@firebase/database/dist/index.esm.js:12945-12999`.

`onValue(...)` devuelve una función `Unsubscribe`. El repositorio la guarda en `cb` y luego ejecuta `off(r, 'value', cb as any)`. Sin embargo, `off` espera el callback original que se pasó al listener; la propia implementación de Firebase indica que la forma recomendada es invocar la función devuelta por `onValue`. El cast oculta la incompatibilidad entre `Unsubscribe` y el callback de evento.

**Dictamen:** hallazgo alto de ciclo de vida. El repositorio debería conservar la función retornada por `onValue` y devolverla directamente como cleanup, eliminando `off` y el cast asociado, o conservar por separado el callback original y usar `off` con ese callback. Esta revisión no modificó el repositorio.

### 3.3. `tenantPath` vacío puede lanzar antes de que la pantalla pueda cargar

**Evidencia:** `PantallaMesas.tsx:29-37`; `useGestionMesas.ts:47-57`; `mesas.repo.ts:33-39`; `src/sistema/rtdb/guards.ts:3-8`.

La pantalla normaliza el selector a `''` con `useStore(...tenantPath) || ''` y llama inmediatamente a `useGestionMesas`. El hook construye `new MesasRepository(db, tenantPath)` en `useMemo` antes de su `useEffect`; el constructor ejecuta `assertValidTenantPath`, que rechaza una cadena vacía lanzando `tenantPath inválido o ausente`.

**Dictamen:** hallazgo alto de inicialización. El hook o la composición deben representar explícitamente el estado “sin tenant” y no construir el repositorio hasta tener una ruta válida. El `useEffect` que hace `if (!tenantPath) return` no evita el lanzamiento porque el constructor ya ocurrió.

## 4. Hallazgos de tipado

| Prioridad | Ubicación | Hallazgo | Recomendación |
|---|---|---|---|
| Alta | `TarjetaResumen.tsx:9-20` | `icono: any` llega a `Ionicons.name`; se pierde la unión de nombres válidos. | Tipar como `React.ComponentProps<typeof Ionicons>['name']` o el tipo equivalente exportado por `@expo/vector-icons`. Los cuatro literales actuales deben validarse con el compilador una vez retirado `any`. |
| Alta | `PantallaMesas.tsx:236,266,294-295` | Tres casts `as any` encubren `pagadas`, `pagado` y `total`. | Modelar la fuente real o eliminar las superficies no respaldadas; no ampliar tipos localmente para satisfacer la vista. |
| Media | `estilos.ts:148` | `StyleSheet.absoluteFill as any` es un escape innecesario según la declaración RN: `absoluteFill` ya es `AbsoluteFillStyle`. | Extenderlo directamente o usar una composición de estilos tipada; verificar el resultado con `tsc` y ESLint. |
| Media | `mesas.repo.ts:51-64` | Casts `cb as any` en ambos cleanups contradicen la firma de Firebase. | Usar `Unsubscribe` retornado por `onValue` directamente. |
| Media | `mesas.repo.ts:156-174` | `obtenerItemsBorrador(): Promise<any[]>` y `snapshotVal: any` degradan contratos de borradores y transacciones. | Reutilizar `DraftItem`/`MesaSnapshot` o definir tipos persistentes propios; validar datos externos como `unknown` en el límite. |
| Media | `mesas.repo.ts:48-80` | Los snapshots RTDB se convierten con `as Record<string, Mesa>`/`as Mesa` sin validación de runtime. | Introducir un esquema de lectura (por ejemplo Zod) o un parser que descarte/normalice registros inválidos antes de entregarlos al hook. |
| Baja | `PantallaMesas.tsx:103` | `actions.guardarLayout?.` trata como opcional una acción que `useGestionMesas` siempre devuelve. | Invocar la acción requerida directamente para que un contrato roto falle de forma explícita y tipada. |
| Media | `useGestionMesas.ts:122-125` | `aplicarCantidad` rechaza negativos y no finitos, pero acepta decimales; `2.5` puede producir dos mesas y dejar `cantidad = 2.5`. | Exigir `Number.isInteger(nuevaCantidad)` y decidir explícitamente si `0` está permitido. |

## 5. Contratos funcionales que necesitan decisión

### 5.1. Fuente de cantidad de mesas

`useGestionMesas.ts:54-70` calcula `cantidad` a partir de las claves de `mesas`: toma el máximo de los IDs numéricos o el número de claves. La muestra RTDB contiene una fuente explícita `ajustes/mesas/cantidad: 7` en `rtdb_actualizada.json:1348-1350`. La capacidad no lee esa configuración y `aplicarCantidad` tampoco la actualiza.

Esto puede divergir cuando faltan IDs, existen claves no numéricas o la colección está vacía. No es posible afirmar desde esta revisión cuál fuente debe ganar; sí es posible afirmar que hay **dos contratos potenciales**. Se requiere una decisión única del orquestador y una prueba de contrato para mantenerla.

### 5.2. Estados de Mesa frente a estados de pedido

La capa administrativa usa `EstadoMesa = 'libre' | 'ocupada' | 'reservada' | 'solicitar_cuenta'` (`mesas.repo.ts:13`). El flujo Mesero mantiene un contrato visual distinto (`state = 'libre' | 'ocupada' | 'cuenta'`) y traduce `solicitar_cuenta → cuenta`, `reservada → ocupada` (`gestionarMesas.ts:14-18,49-56`). El pago vive en el pedido y libera la mesa (`useMeseroLogic.ts:360-371`).

La nueva pantalla administrativa usa `solicitar_cuenta`, pero intenta pintar `pagado`. La solución correcta es un contrato explícito de traducción o la eliminación de la rama no respaldada; no un cast.

## 6. Nomenclatura: estado actual y deuda

### Correcto

Los nombres públicos nuevos están encaminados: `PantallaMesas`, `useGestionMesas`, `TarjetaResumen`, `PropsGestionMesas`, `titulo`, `valor`, `icono`, `cantidad`, `resumen`, `solicitarCuenta`, `actualizarEstado`, `liberarMesa`, `asignarPedido`, `solicitarCuenta`, `aplicarCantidad`, `guardarLayout`.

### Pendiente de normalizar

`PantallaMesas.tsx` conserva comentarios y nombres internos en inglés: cabecera `ADMIN TABLES SCREEN` (`:2`), `COMPONENTS` (`:26`), `DRAG & DROP LOGIC` (`:57`), `HANDLERS` (`:94`), `FAB ITEMS` (`:127`), `HEADER` (`:178`), `SUMMARY BAR` (`:214`), `CANVAS EDITOR` (`:242`) y `GRID PATTERN IN EDIT MODE` (`:252`). También mantiene identificadores locales como `draftLayout`, `dragState`, `createMesaPanResponder`, `newQuantity`, `canvasSize`, `fabItems`, `handleSaveLayout` y `handleUpdateQuantity`.

La hoja de estilos mezcla claves en español e inglés: `header`, `subtitle`, `headerActions`, `editBadge`, `quantityControl`, `summaryBar`, `canvasContainer`, `canvasEditMode`, `gridOverlay`, `gridWatermark`, `mesaItem`, `mesaNum`, `mesaTotal`. La capacidad conserva `DEFAULT_SHAPE`, `normalizeCoordinate`, `mapMesaToLayout` y etiquetas de log `MesasManagement`, además de mensajes de error en inglés (`Error updating estado`, `Error refreshing mesas`, `Error liberating mesa`, `Error assigning pedido`, `Error requesting cuenta`, `Error applying cantidad`, `Error saving layout`).

Los nombres de persistencia `posX`, `posY`, `shape`, `updatedAt`, `MesaLayoutInput` y `_sendOrderLock` son contratos existentes compartidos con RTDB y otros módulos. No conviene renombrarlos unilateralmente solo por estilo; si se exige español completo, debe hacerse mediante una capa de dominio y una migración documentada, no como cambio aislado en la pantalla.

## 7. Residuos de refactorización

`src/ui/roles/administrador/mesas/estilos.ts:103-129` conserva `summaryCard`, `summaryIcon`, `summaryValue` y `summaryTitle`. Una búsqueda global confirmó que esas cuatro claves aparecen únicamente en su propia definición; `TarjetaResumen` usa `tarjeta`, `icono`, `valor` y `titulo` en su hoja local (`TarjetaResumen.tsx:18-24`). Son estilos sin consumidores y pueden retirarse en una limpieza autorizada sin modificar la apariencia actual.

`TarjetaResumen.tsx:3` conserva una referencia histórica a `SummaryCard` y `AdminTablesScreen`. Esa referencia puede mantenerse como trazabilidad de la extracción, pero no debe confundirse con una dependencia funcional.

## 8. Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| `./node_modules/.bin/tsc --noEmit` | **PASS**, salida 0. El compilador no detecta los contratos ocultos por `any`. |
| `./node_modules/.bin/jest --runInBand` | **PASS**, 19 suites y 102 tests. No hay suite directa para PantallaMesas/useGestionMesas. |
| ESLint focal sobre Mesas, capacidad, repositorio, ruta y registro | **FAIL de calidad**, salida 1: tres errores Prettier por saltos de línea en `PantallaMesas.tsx:28,304` y `estilos.ts:186`; un warning `react-hooks/exhaustive-deps` en `PantallaMesas.tsx:158` por dependencia innecesaria `mesas` en `useMemo`. |
| Búsqueda de nombres antiguos en `src`/`app` | **PASS**: sin imports funcionales de `AdminTablesScreen`/`useMesasManagement`; `SummaryCard` solo queda en comentario histórico. |
| Búsqueda de `any`/`as any` | **HALLAZGOS**: 3 casts en la pantalla, 1 en `TarjetaResumen`, 1 en estilos y varios en persistencia. |
| Verificación de `onValue`/`off` | **HALLAZGO**: Firebase declara `onValue → Unsubscribe` y `off → callback`; el cleanup actual mezcla ambos contratos. |
| Estado del árbol | **PASS**: revisión sin cambios funcionales ni intervención en el frente visual. |

## 9. Orden recomendado de corrección

1. Corregir el ciclo de vida de listeners de Firebase y la inicialización con `tenantPath` vacío.
2. Resolver el contrato de estados/pagos/totales con una decisión de dominio; retirar los tres `as any` de la pantalla.
3. Tipar `TarjetaResumen.icono`, `gridOverlay` y las respuestas de repositorio; eliminar `Promise<any[]>` y `snapshotVal: any`.
4. Elegir y documentar la fuente canónica de cantidad de mesas; exigir enteros en `aplicarCantidad`.
5. Retirar los cuatro estilos legacy no usados y corregir los errores Prettier/warning de ESLint.
6. Normalizar comentarios, mensajes e identificadores internos nuevos al español. Tratar los campos persistidos en inglés mediante una migración o adaptador, no mediante renombrado unilateral.

## 10. Conclusión

**La obra está integrada, pero no está terminada con el nivel de precisión solicitado.** El tipado estricto del proyecto pasa porque los casts explícitos silencian inconsistencias importantes. El siguiente paso correcto no es parchear nombres o agregar más `any`: es cerrar primero los contratos de Mesa, pedido, cantidad y ciclo de vida RTDB; después limpiar nomenclatura y formato con pruebas directas del hook/repository.

No se modificó código ni el trabajo visual del otro modelo. Este documento es una revisión técnica y no una orden de corrección; las decisiones de cambio corresponden al orquestador o a una instrucción posterior explícita.
