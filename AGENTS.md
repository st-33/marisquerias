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

### 27. Arquitectura Progresiva de 4 Fases para Menú e Inventario

- En los módulos de administración de catálogo y recetas, la ficha de producto se organiza estrictamente en cuatro fases secuenciales:
  1. Básico: Identidad fundamental (nombre, precio base, canal de visibilidad [Restaurante / Mostrador], visibilidad de operadores y sobreescritura de despacho a cocina).
  2. Variantes / Opciones: Parametrización de venta (unidad de venta [Pieza / Peso en báscula], tiempo de preparación y grupos de variantes).
  3. Inventario: Asignación explícita del área o sub-contenedor de almacenamiento y deducción preferente, con fallback automático al almacén general/bodega.
  4. Receta / Insumos: Desglose de materias primas con estado vacío guiado (aviso pedagógico cuando el catálogo de insumos está vacío) y cálculo de capacidad de producción.
- Queda prohibido ocultar el botón de alta de insumos en contenedores vacíos o renderizar selectores vacíos sin texto de orientación operativa.

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
