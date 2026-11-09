# AGENTS.md — Reglas para agentes externos (M1–M5)

**Repositorio:** `st-33/marisquerias` — ecosistema modular de negocio local (Expo/React Native + Firebase RTDB).
**Rama de trabajo:** `rama-2` únicamente. `main` es un espejo: **nunca** trabajes en `main`.

## Arranque (obligatorio, en este orden)

```bash
git fetch && git checkout rama-2 && git pull
```

1. Leer este archivo.
2. Leer `docs/comunicacion_multimodelo/MANIFIESTO.md` — fuente operativa única
   (rama, sesión activa, mecánica de detección, estados).
3. Leer `docs/comunicacion_multimodelo/sesiones/<sesion_activa>/EVENTOS.json`
   (el libro de eventos).
4. Leer `docs/comunicacion_multimodelo/sesiones/<sesion_activa>/CENTRAL/estado.md`.
5. Leer tu carpeta `M<n>/` (`instruccion.md`, `estado.md`, `procesado.json`).
6. Aplicar `docs/comunicacion_multimodelo/protocolos/02_subagente.md`.

> La documentación de sesiones históricas puede contener ramas y rutas antiguas:
> **no es fuente operativa** (carpetas marcadas con `HISTORICO.md`).

## Detección de trabajo (nunca por historial de git)

Un commit **no** es una instrucción. Solo un evento `INSTRUCCION_NUEVA` en
`EVENTOS.json` dirigido a tu `agente` y con `sello` no presente en tu
`procesado.json` significa trabajo nuevo. Sin evento pendiente → escribe
`DISPONIBLE` en tu `estado.md` y termina.

## Reglas de escritura

- Escribe **solo** en tu carpeta `M<n>/` de la sesión activa y en los archivos de código
  explícitamente autorizados en tu `instruccion.md`.
- `CENTRAL/`, otras carpetas `M*`, `protocolos/`, `plantillas/`, `MANIFIESTO.md`,
  `LEEME.md`, `EVENTOS.json`, `ACTIVACIONES.json` y este archivo son de solo lectura.
- `ACTIVACIONES.json` registra activaciones enviadas por el workflow; no sustituye
  `M<n>/procesado.json`, que cada agente actualiza al terminar su propia tarea.
- Si la sesión no está ACTIVA: no ejecutar trabajo; registrar `DISPONIBLE`.

## Commits

- Un commit por unidad terminada; mensaje `docs(multimodelo/M<n>): resumen` (documentos)
  o `feat|fix|refactor(<area>): resumen` (código autorizado).
- `git pull --rebase` antes de publicar. Conflicto sobre archivos de otros → no
  resolver por tu cuenta: `BLOQUEADA` en `estado.md` y reportar.

## Estándares del proyecto

- Nomenclatura propia en español; conservar en inglés solo APIs, librerías, protocolos
  y convenciones técnicas obligatorias.
- Todo movimiento funcional deja huella (`MIGRACION.md` local o registro en
  `docs/desfragmentaciones/`).
- Verificación mínima antes de reportar: `npx tsc --noEmit`, `npm test` y lint focal
  cuando la tarea toque código.

## Protocolo de Arquitectura y Operación en Producción

### 15. Aislamiento Multi-Inquilino en Web

- En compilaciones Web (`Platform.OS === 'web'`), el almacenamiento local debe aislarse estrictamente por pestaña/ventana utilizando `sessionStorage`.
- `metro.config.js` debe resolver `@react-native-async-storage/async-storage` hacia `src/sistema/almacenamiento/asyncStorageWeb.ts` cuando `platform === 'web'`.
- `obtenerDeviceIdResiliente()` debe priorizar `sessionStorage` para evitar colisiones de presencia y sobreescritura de sesiones entre pestañas de `localhost:8081`.

### 16. Raíz Operativa Dedicada

- En negocios con RTDB propia exclusiva, `rutaNegocio` es legítimamente `''` o `'/'`.
- Todo servicio, repositorio o sincronizador debe invocar `validar_ruta_negocio(rutaNegocio, { permitirRaiz: true })`.
- Nunca evaluar la validez de `rutaNegocio` con truthiness booleana (`!rutaNegocio`); verificar siempre `rutaNegocio === null || rutaNegocio === undefined`.

### 17. Desacoplamiento de Paneles de Control

- El acceso al dashboard administrativo (`admin_dashboard`) es gobernado exclusivamente por el rol de Administrador (`adminRoleEnabled`).
- Jamás bloquear el ingreso al panel administrativo por la ausencia de capacidades secundarias (ej. `metricas_y_cierres`). Dichas capacidades deben mostrar tarjetas informativas o estados desactivados dentro del dashboard sin rebotar al usuario.

### 18. Tolerancia a Estado Cero (Zero-Record Resilience)

- Toda interfaz o hook de datos operativos (mesas, comandas, productos) debe admitir bases de datos recién creadas (0 registros) sin quedar atrapada en spinners perpetuos.
- Desconectar `loading` ante la confirmación del primer snapshot de RTDB y añadir fallback timer para habilitar pedidos para llevar (_takeaway_).

### 19. Evaluación Exacta de Rutas Públicas en Guardias de Navegación

- En layouts de Expo Router (`app/_layout.tsx`), queda prohibido evaluar rutas públicas con `PUBLIC_ROUTES.some(r => pathname.includes(r))` cuando `'/'` está en el arreglo. Debe utilizarse siempre coincidencia exacta o prefijo de ruta (`pathname === '/' || PUBLIC_ROUTES.some(r => pathname.startsWith(r))`).

### 20. Aislamiento Estricto del FAB y Conmutación Dinámica

- El botón radial flotante (FAB) pertenece exclusivamente al rol Administrador (`/_role/admin/*`).
- Queda terminantemente prohibido renderizarlo o retener su estado en el selector de roles (`/_role/roles`) o perfiles operativos de piso.
- En Administrador, el módulo activo debe situarse en la burbuja principal con su icono canónico y permutar con el abanico radial.

### 21. Unicidad de Acciones en Estados Vacíos

- En pantallas de gestión y catálogo (ej. menú de administración), si una colección se encuentra vacía, la acción de creación debe centralizarse en la tarjeta hero explicativa.
- Queda prohibido duplicar botones de alta en barras de encabezado secundarias mientras no existan elementos en la colección.

### 22. Gobierno de Cupo de Terminales en Central

- El límite de terminales autorizadas simultáneas (`limite_dispositivos`) reside soberanamente en la Unidad Central bajo `/negocio/{id}/configuracion/dispositivos`. Toda terminal física o web debe validar este cupo antes de operar en piso.

### 23. Persistencia Inmutable de Vinculación Física de Dispositivos Nativos

- Una vez autorizada la terminal mediante resolución O(1) y admitido el operador responsable en la Unidad Operativa, el estado de vinculación (`adi_dispositivo_vinculado`, `device_registered` y sesión operativa local) es permanente e inmutable en el almacenamiento local del dispositivo.
- Queda terminantemente prohibido re-presentar la pantalla de código de acceso (`/access`) o expulsar al operador en reinicios, aperturas frías o cambios de ruta interna.
- La pantalla de acceso únicamente volverá a presentarse ante desinstalación completa de la app, limpieza manual de datos, o revocación remota explícita desde la Torre de Control/Monitoreo bajo `sesiones/{plaza}`.

### 24. Sincronización Reactiva de Capacidades en Caliente (Regla 25)

- La aplicación suscribe reactivamente `useCapacidadesRealtime` a `${ruta_negocio}/capacidades_autorizadas` en Unidad Secundaria.
- Cualquier mutación emitida por Torre de Control en Ecosistema recalcula de inmediato en memoria `EstadoEncendido` (intersección NPB 00 ∩ Capacidades Autorizadas) y lo propaga a Zustand sin reiniciar la terminal.

### 25. Homologación Canónica de Capacidades a Roles Operativos y Gating Reactivo

- Las capacidades macro corresponden 1:1 a roles operativos físicos del negocio (Mesero `control_mesas`, Cocina `comanda_cocina`, Mostrador `mostrador_y_pos`, Menú Digital `menu_digital`, Administrador `administrador`).
- Cero términos abstractos o burocráticos ('salón', 'marcha de cocina', 'KDS', 'cobro y POS', 'stock físico').
- Toda la lógica operativa permanece intacta y funcional; los filtros son estrictamente visuales y de enrutamiento seguro en caliente.

### 26. Scroll Autocontenido en Tarjetas y Adaptabilidad Paramétrica

- Las vistas operativas y administrativas deben evitar barras de desplazamiento infinitas que muevan la ventana completa como página web.
- Las listas densas (como el registro diario de ventas) deben residir en tarjetas con `maxHeight` delimitado y desplazamiento interno (`nestedScrollEnabled`).
- La parrilla de mesas (`CuadriculaMesas`) debe calcular dinámicamente sus columnas (3 a 5 en móvil, 6 a 8 en tablet/escritorio) preservando proporción táctil y textos legibles en formato natural (`M1, M2`).

### 27. Separación Soberana de Inventario, Cocina (Libro de Platillos y Producción) y Menú Comercial

- **Inventario (`Administrador -> Inventario`)**: Dueño exclusivo de los artículos físicos (`/inventario/catalogo`), sus imágenes (`assets/images/inventario/{bebidas,postres,insumos}`), unidades base (`kg`, `g`, `l`, `ml`, `pza`, `caja`), equivalencias explícitas (`piezasPorCaja`, `pesoPromedioPiezaKg`, `piezasPorKg`, `esAproximado`), existencias por ubicación, porcionado a granel, mermas, costos de adquisición (`costo`) y uso explícito (`uso: 'insumo' | 'venta_directa' | 'ambos' | 'producto_terminado'`). Prohibido fijar precios de venta en Inventario.
- **Cocina → Libro de Platillos (`/menu/libro_platillos`)**: Acceso discreto desde el encabezado de Cocina. Dueño exclusivo de las definiciones culinarias, imágenes de platillos (`assets/images/platillos/`), modo de preparación (`por_pedido` vs `produccion_anticipada`), ingredientes vinculados a Inventario, rendimiento (`porcion` vs `lote`), procedimiento paso a paso, tiempo estimado (`prepMin`) y estación KDS.
- **Cocina → Producción por Lotes (`/inventario/produccion_lotes`)**: Ejecuta preparaciones anticipadas (ej. lote de 8 flanes), descuenta los insumos al completar el lote, registra el rendimiento real obtenido frente al esperado (calculando merma de producción si rinde menos) y actualiza las existencias más el costo unitario real del artículo terminado (`itemTerminadoId`) en Inventario.
- **Administrador → Menú (`/menu/catalogo`)**: Configurador estrictamente comercial. Selecciona un artículo vendible de Inventario (`origenTipo: 'inventario'`) o un platillo del Libro de Platillos (`origenTipo: 'platillo'`), organiza categorías, compara el costo de referencia contra el precio de venta (distinguiendo Margen sobre Precio `costo / (1 - margen)` de Recargo sobre Costo / Markup `costo * (1 + recargo)`) y habilita canales de venta.
- **Mesero y Mostrador**: Consumen la oferta publicada en Menú. Mostrador vende exclusivamente artículos de entrega directa (incluyendo productos terminados de lotes anticipados como flanes) y bloquea platillos `por_pedido` incluso dentro de categorías mixtas.

### 28. Pureza Terminológica Operativa ("Menú"), Plantilla Base Agnóstica y Gating Visual

- Terminología de Usuario: Queda prohibido exponer la palabra "catálogo" en textos visibles al usuario, títulos de pantallas o estados vacíos. En la experiencia operativa de piso y administración, el concepto es estrictamente "Menú". El término "catálogo" queda restringido a referencias técnicas internas a nivel de código fuente.
- Plantilla Agnóstica Reutilizable: Todo componente y resolvedor debe diseñarse como fórmula plantilla genérica del NPB 00. Queda prohibido acoplar la lógica o resolvedores a marcas o nombres de productos particulares mediante coincidencias de cadenas quemadas (hardcoded). La resolución de recursos opera por identificador (`imagen_id`), slug de categoría o fallback neutro.
- Sincronización y Gating de Capacidades: Las capacidades macro autorizadas deben coincidir léxicamente con la taxonomía gobernada por Ecosistema. La desactivación de una capacidad opera estrictamente como gating visual y de navegación; los esquemas de datos, recetas, repositorios y persistencia continúan activos e íntegros.

### 29. Higiene Arquitectónica Continua y Prohibición de Puentes Fantasma ("Operación Barredora")

- Prohibición de Shims y Puentes de Transición: Cuando un concepto, módulo o componente sea descartado o renombrado (ej. de `stickers` a `catalogoImagenes`, o de `SelectorProductoSuperpuesto` a `SelectorProducto`), todos sus consumidores deben migrarse en el mismo acto y el archivo anterior debe eliminarse físicamente. Queda terminantemente prohibido dejar archivos puente (`re-export`), alias de retrocompatibilidad o pruebas de alias que simulen vigencia.
- Barriles (`index.ts`) sin Huérfanos: Un archivo `index.ts` no justifica la existencia de un módulo. Si un servicio, hook, repositorio o componente visual únicamente es referenciado por su barril de exportación y carece de consumidores reales en `src/` o `app/`, se declara código muerto y debe eliminarse junto con su línea en el barril.

### 30. Prevención de Fugas de Memoria por Reactividad Ciega y Efectos en Cascada (Anti-OOM)

- Prohibición de Timestamps Ciegos en Store: Queda prohibido inyectar timestamps dinámicos (`Date.now()`, `timestamp: now()`) dentro de los métodos `set()` de Zustand a menos que los datos recibidos difieran de los existentes. Si el contenido de la colección (mesas, pedidos, categorías) es equivalente, el estado debe preservarse para no invalidar selectores ni forzar re-renders masivos en componentes en segundo plano.
- Idempotencia en Efectos de Mutación Remota: Todo `useEffect` que realice escrituras a Firebase a partir de evaluaciones de estado local (ej. auto-cerrar pedidos completados, sincronización de misiones logísticas) DEBE contar con un candado de idempotencia (`Set<string>` en `useRef`) para registrar los identificadores ya procesados y evitar feedback loops con los listeners de RTDB.
- Limpieza Estricta de Heartbeats y Spool en Raíz: Las rutas operativas bajo RTDB dedicada (`rutaNegocio === '/'`) deben normalizarse mediante utilidades canónicas para evitar dobles barras (`//impresion/...` o `//spool/...`) que rompan el descarte de listeners o multipliquen suscripciones.

### 31. Autoridad Única e Idempotente de Movimientos de Inventario y Subordinación de Roles a Capacidades

- **Autoridad Única de Movimientos (`ServicioMovimientosInventario`)**: Toda deducción por venta o preparación, reversión por cancelación, lote de producción y porcionado debe atravesar `ServicioMovimientosInventario` registrando `/inventario/operaciones_aplicadas/{operacionId}` para garantizar idempotencia estricta.
- **Cero Doble Descuento**:
  - Venta directa (`origenTipo: 'inventario'`) descuenta el artículo una sola vez.
  - Platillo por pedido (`modoPreparacion: 'por_pedido'`) descuenta los ingredientes de su receta una sola vez por preparación.
  - Platillo de producción anticipada (`modoPreparacion: 'produccion_anticipada'`) descuenta sus ingredientes al completar el lote de producción; la venta posterior descuenta únicamente la pieza del `itemTerminadoId`.
- **Sincronización Dual de Costo (`costo` ↔ `costoUnitario`)**: `RepositorioInventario` sincroniza ambos campos al crear/actualizar artículos, y todo calculador comercial (`useGestionMenu`, `calcularCosteoYCapacidadPlatillo`) resuelve `item.costo ?? item.costoUnitario ?? 0`.
- **Huella Estructural en KDS y Normalización de Raíz (`rutaNegocio === '/'`)**: `useLogicaCocina` compara la firma estructural de órdenes/ítems antes de llamar a `setOrdenes()` (excluyendo `tiempoTranscurrido` y prohibiendo `console.log` por ítem), y toda ruta RTDB limpia barras extremas (`rutaNegocio.replace(/^\/+|\/+$/g, '')`) para evitar dobles barras (`//config`, `//spool`).
- **Subordinación Estricta de Roles**: En `encenderCapacidades`, ningún rol operativo (`mesero`, `cocina`, `cajero`, `admin`) puede permanecer encendido si su capacidad macro gobernada (`control_mesas`, `comanda_cocina`, `mostrador_y_pos`, `administrador`) no está activa en la intersección `NPB 00 ∩ capacidades_autorizadas`.

### 32. Origen Predeterminado en Menú, Estaciones Dinámicas de Cocina, Costeo de Gas LP y Prohibición del Término "Caja"

- **Unidad de Venta Predeterminada por Origen**: En el configurador de Menú (`ModalProducto` / `EditorVariantes`), queda prohibido exponer un selector manual de "Unidad de Venta (Por Pieza / Por Peso)". La unidad viene predeterminada por la naturaleza de su origen: si proviene de Inventario (`origenTipo: 'inventario'`), hereda su unidad física base (`kg`, `pza`, `l`, etc.); si proviene de Cocina (`origenTipo: 'platillo'`), su costo y descuento ya están gobernados por la receta y sus porciones.
- **Selección Adaptativa y Compacta en Menú**: Al editar un producto existente o una vez elegido su origen (artículo de inventario o platillo de cocina), el modal debe mostrar una tarjeta resumen compacta con botón "Cambiar" en lugar de desplegar listas completas simultáneas. Los selectores de origen se adaptan dinámicamente a las capacidades activas del negocio.
- **Estaciones de Cocina Gobernadas por el Administrador**: Queda prohibido quemar en código (`hardcode`) estaciones ajenas al giro como "Cafetería" o listas fijas de estaciones KDS en el Libro de Platillos. Las áreas de preparación seleccionables en Cocina se derivan dinámicamente de las áreas configuradas por el administrador en Inventario (`estacionesDisponibles`), con opción de escribir una estación personalizada.
- **Estimación de Consumo de Gas LP en Recetas**: El costeo de platillos y lotes en Cocina (`platillos.repositorio.ts`) integra la estimación aproximada de consumo de gas LP según intensidad de flama (`sin_fuego`, `baja`, `media`, `alta`) y minutos de cocción (`minutosCoccion`), sumándose al costo de insumos para ofrecer al administrador un costo de referencia realista antes de fijar el precio de venta en Menú.
- **Prohibición del Término "Caja" sin Capacidad Activa**: Mientras el módulo independiente de Caja (punto centralizado de cobro y corte) no esté habilitado como capacidad activa, queda terminantemente prohibido usar la palabra "Caja" para referirse al área de venta en crudo o cobro rápido; el término canónico es **Mostrador** (`Mostrador Principal`, `DETALLE DE MOSTRADOR`). Asimismo, la unidad física de empaque `'caja'` en Inventario debe etiquetarse visualmente como **`Paquete / Tara`** (`paq/tara`) para jamás confundirse con una caja registradora.
- **Activos Visuales PNG con Transparencia Real (RGBA) y Caché Offline-First en Cocina**: Toda imagen de producto o bebida en `assets/images/` debe poseer canal alfa transparente real (`RGBA`), sin fondos blancos ni dameros grises quemados en los píxeles, renderizándose flotante sin recuadros contenedores oscuros o blancos. El Libro de Platillos y Producción por Lotes debe hidratarse instantáneamente desde memoria RAM y `AsyncStorage` con actualizaciones optimistas para garantizar cero latencia visual en Web y Android.

37. Ergonomía del Mesero: Modal de Variantes Modular, Desduplicación de Precios en Comanda y Cuadrícula en Tableta Apaisada
1. Descomposición Modular de Modales Operativos: Los modales de alta densidad de piso (como `ModalVariantes`) deben estructurarse en subsistemas atómicos (`BotonOpcionVariante`, `BarraResumenPasos`, `PieModalVariantes`) dentro de su propia carpeta `src/ui/bloques/{Componente}/`. Queda terminantemente prohibido mantener archivos monolíticos de más de 600 líneas mezclando lógica de animación, pasos, estilos y renderizado de ítems.
2. Ancho Paramétrico y Prohibición de Píldoras Verticales en Variantes: En la selección de opciones de variantes, las opciones deben ocupar un ancho del 100% en pantallas móviles y del 48% (2 columnas simétricas) en pantallas amplias/tabletas, con disposición horizontal (`flexDirection: 'row'`, texto a la izquierda, precio e indicador a la derecha). Queda prohibido aplicar porcentajes a hijos anidados dentro de contenedores animados sin ancho definido que causen colapso del texto a una letra por línea.
3. Desduplicación Estricta de Precios en Tarjetas de Comanda: La etiqueta de variante mostrada en `TarjetaPartida` (`variantLabels`) debe sanitizarse mediante `limpiarEtiquetaVariante` para purgar importes monetarios integrados en el título (`($140)`), evitando redundancias visuales donde la variante y el total de la partida repiten el mismo número lado a lado.
4. Distribución en Tableta Apaisada (Landscape): Al girar el dispositivo a posición horizontal (`width > height && width >= 600`), la cuadrícula de mesas debe acomodarse en una columna lateral esbelta y compacta (agregando una segunda columna vertical únicamente si el número de mesas supera 7), cediendo el espacio restante al 100% para la comanda digital y sus áreas de acción, eliminando zonas muertas entre mesas y comanda.

38. Aislamiento Estricto de Hubs de Hardware por Terminal Física y Canal Operativo + Hidratación Unificada en Mostrador
1. Vinculación de Hub por Terminal Física Nativa (`localDeviceId`): La configuración de Concentrador de Hardware (`impresion/hubs/restaurante` y `impresion/hubs/venta_crudo`) se vincula única y exclusivamente al identificador físico de la terminal Android (`localDeviceId`). En la pantalla `Admin -> Dispositivos`, el interruptor y el selector de destino (`restaurante` vs `venta_crudo`) reflejan y gobiernan únicamente si **esa terminal física** es el Hub activo de dicho canal, sin sobrescribir claves globales en la raíz de `impresion/hubs` que interfieran con el otro canal. En ejecuciones Web (`Platform.OS === 'web'`), la vinculación y escucha como Hub físico están bloqueadas por diseño.
2. Aislamiento Cruzado de Impresión Local entre Roles: Si una terminal física está vinculada como Hub de `venta_crudo` (Mostrador) y tiene una impresora Bluetooth conectada, al cambiar al rol `Mesero` en ese mismo dispositivo queda terminantemente prohibido imprimir cuentas de restaurante directamente por el socket local (`servicioFierros.imprimirCuenta`); la orden debe encolarse en RTDB (`spool/jobs` con `destination: 'standard'`) para ser listo su despacho por el Hub de `restaurante`. Inversamente, si la terminal es Hub de `restaurante`, las ventas de `Mostrador` (`venta_crudo`) jamás deben secuestrar la impresora local de restaurante.
3. Hidratación Unificada de Productos y Prioridad de Herencia en Mostrador: Los listeners centrales (`operacion.ts` y `menu.repositorio.ts`) deben consolidar en tiempo real tanto los productos anidados en `menu/categorias/{cid}/productos` como los de `menu/productos`, garantizando que `MostradorPro` visualice todos los productos elegibles de entrega directa sin depender de que el Administrador abra antes el módulo de Menú. La carga de caché SQLite (`cargarCacheOffline`) jamás debe sobrescribir una lista ya hidratada desde Firebase, y la activación de `cat.herencia?.ventaCrudo === true` en una categoría habilita en Mostrador todos sus artículos de venta directa o producción anticipada.

39. Gobierno del Hub Central: Condición de Impresora Conectada, Auto-Liberación por Desconexión, Nomenclatura 'Mostrador' e Impresión Directa Local
1. Condición Estricta de Activación del Hub Central: El switch de Modo Hub Central en una terminal Android solo puede habilitarse si el dispositivo tiene físicamente conectada y sincronizada en verde una impresora Bluetooth (`estaConectado === true`). Si no hay impresora conectada, el switch permanece bloqueado (`disabled`) con un mensaje explicativo al operador indicando que primero debe vincular la impresora en el paso 3.
2. Auto-Liberación por Desconexión de Hardware: Si una terminal actúa como Hub Central activo y la impresora Bluetooth se apaga, desconecta o sale del rango de cobertura, el componente de monitoreo (`GestorConcentrador`) debe detectar inmediatamente `!estaConectado`, liberar la asignación del canal en Firebase RTDB (`enabled: false`) y desactivar el estado local (`desactivarHub()`), dejando el canal libre para que otra terminal pueda tomar el servicio sin quedar bloqueada por un registro colgado.
3. Adopción Soberana y Desalojo de Registros Colgados: Si un canal de Hub (`restaurante` o `mostrador`) quedó registrado en la nube con un identificador de dispositivo previo o colgado, la terminal actual (cumpliendo la condición de tener su impresora conectada) puede activar el Hub Central para transferir soberanamente la titularidad del canal a su `localDeviceId` sin que el sistema lo rechace ni lo devuelva a `false`. Adicionalmente, se provee un botón explícito de "Liberar canal colgado" para administración manual.
4. Nomenclatura Canónica 'Mostrador' vs 'Venta en Crudo': Queda prohibido exponer el término 'venta en crudo' en selectores, títulos o configuraciones de Hub visibles al usuario. El término oficial y gobernado es **Mostrador** (`mostrador`), mapeándose de forma transparente y retrocompatible con la partición histórica de RTDB.
5. Impresión Directa Local en Mostrador con Fallback a Hub: Al completar una venta o solicitar reimpresión en `MostradorPro`, si la terminal física tiene conectada directamente su impresora Bluetooth, el ticket se emite de forma inmediata por hardware local (`direct_bluetooth`) sin depender de la cola en la nube. Si la venta se realiza desde una terminal sin impresora física pero en línea, el trabajo se encola en RTDB (`spool/jobs`) para ser procesado por la terminal designada como Hub Central de Mostrador.

40. Camino Único para Capacidades, Variantes y Equivalencia Arranque/Caliente (estado: objetivo con deuda reconocida; ver informe de capacidades)
1. Toda capacidad, acción de interfaz o perfil se clasifica antes de implementarse: Capacidad (contrato), Acción en slot (composición), Perfil de interfaz (forma) o Interruptor operativo (temporal). Prohibido resolver una clase con el mecanismo de otra.
2. El estado derivado de capacidades (roles, cajones, dependencias) se calcula con una sola función. La sincronización en caliente y el arranque en frío deben producir resultados idénticos para la misma autorización; se exige prueba de equivalencia.
3. El catálogo de capacidades tiene una sola fuente de verdad. Las apps de giro no mantienen copias propias del motor ni del catálogo; una prueba de contrato falla ante divergencia.
4. Prohibidos los alias de capacidades. Al renombrar, se migra en el mismo acto (Regla 32).
5. Estado de capacidades no resuelto implica módulo oculto (falla cerrada), nunca encendido.
6. Ninguna lista de capacidades se escribe a mano en la interfaz de Ecosistema; se deriva del catálogo, para que un botón nunca ofrezca una capacidad que el validador rechaza.

41. Invariancia Matemática de Sincronización Realtime y Perfiles de Operación
1. Idempotencia Estricta (Arranque == Caliente): Toda función o hook de sincronización en tiempo real (`useCapacidadesRealtime`, `escucharCapacidadesRealtime`) debe recibir y preservar la totalidad de los campos de gobernanza del negocio (`tipo_acceso`, `roles_permitidos`, `cajones_dormidos_forzados`, `version_npb_origen`). Queda terminantemente prohibido descartar o hardcodear estos parámetros al recomputar el `EstadoEncendido`.
2. Prevención de Fugas y Cancelación Asíncrona: Todo oyente de RTDB (`onValue`, SSE) que dependa de lecturas asíncronas previas (`cargarNPB`) debe implementar bandera sincrónica de cancelación (`cancelado = true`) en la función de limpieza (`cleanup`) de `useEffect` para impedir oyentes huérfanos en memoria ante desmontajes rápidos.
3. Supresión Reactiva de Timestamps en Reposo (Anti-OOM): Antes de invocar `setEstadoEncendido()` o persistir en almacenamiento local, debe evaluarse la igualdad estructural de las colecciones ordenadas (`capacidades_activas`, `roles_activos`, `cajones_activos`). Si el snapshot no muta la proyección operativa, queda prohibido despachar un nuevo objeto o inyectar `timestamp: Date.now()`.
4. Navegación Canónica en Modo Pantalla Única (Apego a Regla 19):
   - En giros de pantalla única (`modo_operacion === 'pantalla_unica'`), los operadores de piso navegan directamente a `/_role/mostrador` sin FAB radial.
   - Los operadores con cargo de Administrador navegan a `/_role/admin/mostrador`, donde el FAB radial se renderiza legítimamente bajo el namespace `/_role/admin/*`, asignando el icono de Mostrador a la burbuja principal y los módulos administrativos al abanico radial.



