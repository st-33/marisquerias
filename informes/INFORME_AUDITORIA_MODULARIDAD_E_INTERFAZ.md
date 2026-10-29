# INFORME DE AUDITORÍA: ARQUITECTURA FRONTEND, MODULARIDAD Y EXPERIENCIA DE USUARIO (UX/UI)

**Módulo**: Aplicación de Categoría (Marisquerías)  
**Repositorio**: `/home/st/Escritorio/marisquerias`  
**Stack auditado**: Expo Router v57, React Native 0.86 (React 19), React Native Reanimated, Zustand, Tailwind / Theming System.  
**Autoridad**: Mariscal y Arquitecto Principal de Aplicación de Categoría  
**Fecha**: 2026-10-28  

---

## 1. Resumen Ejecutivo y Diagnóstico Global

El ecosistema frontend de `marisquerias` presenta una clara dualidad arquitectónica:
1. **Intención de arquitectura limpia:** Existen directrices de diseño bien concebidas como la fábrica de pantallas (`useResolvedorPantalla`), el sistema de diseño unificado (`src/compartido/temas/index.ts` bajo la consigna *"NO MÁS HARDCODED VALUES"*), y separación de roles en lógica pura vs manos visuales.
2. **Degradación técnica en pantallas críticas:** La implementación real sufre de acumulación de deuda técnica severa:
   - **Monolitos gigantes:** Componentes que superan las 800 líneas (alcanzando hasta 1,076 líneas en `MostradorPro.tsx`).
   - **Violación del dogma de contenedores en Expo Router:** Mientras que la regla es mantener containers ultra-finos de 10-15 líneas en `app/`, `app/_role/admin/dispositivos.tsx` se convirtió en un monolito de **722 líneas** directamente en el árbol de rutas.
   - **Navegación callejón sin salida (Dead-end Navigation):** En el módulo de Administración, `DisenoAdministrador.tsx` es un cascarón vacío; pantallas como `dispositivos.tsx` y `reparto.tsx` no tienen botón de retorno ni barra de navegación, dejando al usuario atrapado sin poder volver al dashboard.
   - **Fallas de layout nativo:** Ausencia de `<SafeAreaProvider>` en la raíz de `app/_layout.tsx`, causando que los footers y botones absolutos colisionen directamente con la barra de gestos / Home Indicator de iOS y Android.
   - **Inconsistencia y colisiones visuales:** Competición de tres elementos flotantes independientes en la esquina inferior derecha (`ConmutadorTema`, `AccionRadialFlotante`, `mobileCartToggle`), textos en miniatura (10px) en interfaces de cobro rápido, y más de 160 colores hexadecimales hardcodeados que ignoran el tema activo.

---

## 2. Modularidad de Pantallas y Componentes Monolíticos

### 2.1. `app/_role/admin/dispositivos.tsx` (722 líneas) — Severidad: Crítica
- **Ubicación incorrecta:** Vive directamente en el directorio de rutas de Expo Router (`app/`), rompiendo la convención del proyecto donde las rutas solo deben delegar en `src/composicion/resolvedorPantalla.tsx`.
- **Acoplamiento multirresponsabilidad:**
  - Lógica de escaneo y conexión Bluetooth/Serial para impresoras y básculas (`useFierros`).
  - Lógica de persistencia de Hub Central en RTDB (`useDevicesManagement`) y fallback local en `AsyncStorage` con importación dinámica de `resolverDeviceIdADI` en un `useEffect`.
  - Manejo de dos pestañas ('impresoras' y 'basculas').
  - Vista previa de ticket en formato monospace.
  - Formulario de guardado y botón absoluto flotante de prueba.
  - Más de 200 líneas de `StyleSheet.create`.
- **Bypass de la Fábrica:** No está registrado en `src/composicion/registroPantallas.ts` ni usa `useResolvedorPantalla`.

### 2.2. `src/ui/bloques/MostradorPro.tsx` (1076 líneas) — Severidad: Crítica
- **El componente visual más grande del repositorio.** Acopla 6 subsistemas en un solo archivo:
  1. **Teclado numérico virtual (`Keypad`, líneas 23-80):** Definido inline dentro del mismo archivo para el ingreso manual de kilogramos.
  2. **Polling de hardware:** Un `useEffect` ejecutando `setInterval(..., 300)` para leer la báscula en vivo si el producto seleccionado es en kilogramos.
  3. **Catálogo y búsqueda:** Listado horizontal de categorías con scroll y grid de productos.
  4. **Visor de pesaje en tiempo real:** Bloque de estilo neón para pesaje dinámico.
  5. **Carrito y checkout lateral:** Panel de venta con denominaciones rápidas de efectivo ($50, $100, $200, $500), cálculo de cambio e impresión de comprobante.
  6. **Estado inflado:** Maneja más de 10 estados locales simultáneos.

### 2.3. `src/ui/pantallas/PantallaCaja.tsx` (905 líneas) — Severidad: Alta
- **Monolito de terminal de cobro:** Aunque utiliza el hook `useCajaCobro()`, toda la capa de presentación está condensada en un solo archivo con 500 líneas de `StyleSheet`:
  - Buscador de texto y barra horizontal de categorías inline.
  - Tarjetas de catálogo con layout fijo del 48%.
  - Carrito lateral con controles de cantidad y modal de vaciado.
  - Resumen de totales y descuentos.
  - Modal de cobro embebido con selector de 3 métodos de pago y switches de impresión.

### 2.4. `src/ui/bloques/ModalVariantes.tsx` (870 líneas) — Severidad: Alta
- **Monolito de interacción táctil:**
  - Motor de wizard por pasos con auto-avance condicional en selección simple.
  - 4 animaciones simultáneas (`fadeAnim`, `slideAnim`, `pulseAnim`, `stepTransition`) combinadas con `LayoutAnimation` de React Native.
  - Carga y limpieza de sonidos (`useSonidosAlternados`) y disparo de `Haptics`.
  - Evaluación de reglas lógicas del negocio (`evaluateRules`, `computeVariantDeltaAndLabels`, `getOrderedVisibleGroups`).

### 2.5. `src/ui/roles/administrador/menu/editores/EditorVariantes.tsx` (842 líneas) — Severidad: Alta
- **Editor de árbol de variantes:**
  - CRUD de grupos y de opciones con deltas de precio.
  - Sistema de triggers condicionales.
  - **Anti-patrón de Modal anidado:** Monta un `<Modal transparent visible>` dentro de `ModalProducto` (que a su vez es modal). En Web y Android causa trampas de foco y fallas de apilamiento z-index.

### 2.6. `src/ui/roles/administrador/inventario/PanelInventario/index.tsx` (784 líneas) — Severidad: Media-Alta
- **Complejidad de navegación y formularios:**
  - Orquesta 5 modos de navegación jerárquica: `areas`, `containers`, `items_section`, `items_area`, `items_container`.
  - Contiene 3 modales distintos inline con formularios para insumos, áreas y contenedores.

---

## 3. Problemas y Fallas del Producto en la Interfaz Visual

### 3.1. Responsive Web vs Móvil y anarquía de Breakpoints
- **Falta de sistema unificado de media queries:**
  - `PanelInventario`: `width > 800`
  - `MostradorPro`: `width > 900`
  - `PantallaCaja`: `width >= 768`
  - `PantallaMenuAdmin`: `width < 768`
  - `ModalVariantes`: `screenWidth < 480`
  - `CuadriculaMesas`: `1100`, `760`, `480`
- **Falla visual en `PantallaCaja.tsx` en móvil (`width < 768`):**
  - Divide la pantalla verticalmente asignando `flex: 3` al catálogo y `flex: 2` al carrito.
  - En un teléfono de ~700px de altura, el carrito inferior consume más de 350px. El catálogo superior queda reducido a ~200px (apenas una fila), forzando scroll anidado doble.
- **Desbordamiento horizontal:** `productCard` fija `width: '48%'` más gaps y paddings, desbordando en pantallas de 320px-360px.

### 3.2. Colisión de elementos flotantes en esquina inferior derecha
- Coexisten 3 elementos flotantes en la misma coordenada `bottom-right` sin orquestador:
  1. `ConmutadorTema` (`bottom: 25, right: 20, zIndex: 100`).
  2. `mobileCartToggle` en `MostradorPro.tsx` (`bottom: 30, right: 30, zIndex: 10`).
  3. `AccionRadialFlotante` en `_layout.tsx` (`bottom: 90, right: 25, zIndex: 9999`).
- En Mostrador o selección de roles, los botones se tapan mutuamente o interceptan toques.

### 3.3. Estados vacíos rotos o inconsistentes
- **`PuestoMando.tsx` (Mesero):** Cuando termina de cargar y no hay mesas configuradas (`mesas.length === 0`), renderiza un espacio en blanco sin mensaje ni guía.
- **Inconsistencia generalizada:** Coexisten 8 implementaciones distintas de texto gris suelto sin un componente canónico reutilizable.

### 3.4. Problemas de contraste, accesibilidad y fuentes ilegibles
- **Ruptura de tokens:** Más de 160 colores hexadecimales hardcodeados (`#0a0f1d`, `#1e293b`, `#111c35`, `#38bdf8`, `#16a34a`) rompen el switch entre temas.
- **Fuentes de 10px y 11px en interfaces de operación continua:**
  - En `PantallaCaja.tsx`: botones de método de pago con `fontSize: 10`, subtítulo del carrito con `fontSize: 11`.
  - En terminales POS a 60 cm de distancia, genera fatiga y errores táctiles de cobro.

### 3.5. Layout Shift en `TarjetaPartida.tsx`
- Al pasar de 2 unidades a 1, el botón `-` se desmontaba del árbol, provocando un salto inmediato de los botones `+` y papelera hacia la izquierda, causando pulsaciones accidentales de borrado.

### 3.6. Timers descontrolados en Cocina (`TarjetaComanda.tsx`)
- Cada tarjeta y cada ítem montaba su propio `setInterval(..., 1000)`. Con 15 órdenes activas y 4 partidas por orden, **más de 75 timers de JavaScript se ejecutaban cada segundo en paralelo**, degradando el rendimiento de tablets térmicas.

### 3.7. Callejón sin salida en navegación de Administrador
- `DisenoAdministrador.tsx` es un wrapper vacío. Pantallas como `dispositivos.tsx` o `reparto.tsx` no tienen barra de navegación ni botón de retorno, dejando al usuario atrapado sin poder volver al dashboard.

---

## 4. Plan de Acción y Propuestas Técnicas

1. **Montaje de `<SafeAreaProvider>` en `app/_layout.tsx`** (Ejecutado).
2. **Refactorización de `app/_role/admin/dispositivos.tsx`**: Extraer a `src/ui/roles/administrador/dispositivos/` con header de retorno y reducir archivo en `app/` a container fino de 15 líneas.
3. **Componente Canónico `EstadoVacio.tsx`**: Unificar los 8 estados vacíos artesanales en `src/compartido/componentes/ui/EstadoVacio.tsx`.
4. **Pulso Centralizado de Tiempo (`useStoreReloj`)**: Sustituir los 75+ `setInterval` de comanda por un selector de latido global de 1 segundo.
5. **Estabilidad de Layout en `TarjetaPartida.tsx`**: Mantener visible el botón `-` convirtiéndolo en papelera cuando `qty === 1`.
6. **Responsive Sheet en `PantallaCaja.tsx`**: Modularizar en `CatalogoCaja` y `TicketVentaCaja` (Bottom Sheet en móvil).
