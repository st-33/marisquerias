# Auditoría visual y de experiencia de usuario
## Aplicación de marisquería — `origin/rama-2`

**Autor:** Manus AI  
**Modalidad:** revisión estática y lectura del repositorio, sin modificaciones  
**Repositorio:** [`st-33/marisquerias`](https://github.com/st-33/marisquerias)  
**Referencia revisada:** `origin/rama-2`, commit `7d3b617` (`fix(validacion): corregir bloqueos de tipos tests y lint`)

## Veredicto ejecutivo

**Sí conviene modernizar de forma importante la capa visual y los flujos de interacción, pero no conviene reemplazar absolutamente todo ni tirar la lógica operativa del negocio.** La aplicación tiene una base funcional específica para un POS de marisquería: mesas, comandas, cocina, inventario, recetas, variantes, impresión y operación offline. Esa lógica es valiosa y no debería sustituirse por un kit genérico.

Lo que sí conviene reemplazar casi por completo es la **capa repetitiva de primitives y composición visual**: botones, inputs, tabs, switches, cards, modales, sheets, toasts, estados de carga, estados vacíos, FAB, feedback de presión, tokens de color y reglas de accesibilidad. Actualmente muchas de esas piezas fueron creadas de manera independiente, con estilos hardcodeados, tamaños fijos y comportamiento distinto entre pantallas. Esa es la razón por la que la interfaz se percibe plana, inconsistente y frágil aunque existan algunos componentes visualmente trabajados.

Mi recomendación concreta es una estrategia **70/30**: modernizar aproximadamente el 70 % de la infraestructura visual compartida y conservar el 30 % que expresa la semántica propia del restaurante. Para la primera etapa usaría **React Native Paper + `@gorhom/bottom-sheet` + el Reanimated que ya está instalado + un sistema de tokens propio**. Dejaría gluestack, React Native Reusables y Tamagui como referencias o segunda etapa, porque el repositorio no utiliza NativeWind actualmente y esas opciones implican una decisión adicional de sistema de styling.

| Área | Diagnóstico estático | Prioridad |
|---|---|---:|
| Identidad visual y logo | Inconsistente y técnicamente mal separado por contexto | P0 |
| Primitives compartidas | Demasiadas implementaciones propias y estilos duplicados | P0 |
| Modales, overlays y sheets | Composición custom con riesgo de superposición y estados frágiles | P0 |
| Botones y estados disabled/loading | Existen no-op visibles y feedback insuficiente | P0 |
| Tema y tokens | Puente legacy puede mezclar tema default con tema elite | P0 |
| Animaciones | Hay capacidad suficiente, pero está dispersa y sobrepersonalizada | P1 |
| Pantallas POS específicas | Conservan valor de negocio; conviene refinar, no reemplazar | P1 |
| Dashboard y formularios administrativos | Candidatos claros para migración a primitives de biblioteca | P1 |

## Qué encontré en la rama dos

La rama revisada es una aplicación **Expo/React Native multiplataforma**, con rutas en `app/` y una capa visual extensa en `src/ui/`. El `package.json` declara Expo `~56.0.12`, React Native `0.85.3`, Reanimated `4.3.1`, Gesture Handler `~2.31.1`, React Native Web `~0.21.0` y Zustand `5.0.14`. No declara NativeWind; el estilo dominante es `StyleSheet` y composición manual.

El flujo inicial es corto, pero visualmente puede presentar una transición brusca: `app/index.tsx` redirige inmediatamente a `/(auth)/access`, y el `ThemeProvider` devuelve `null` mientras recupera la preferencia desde AsyncStorage. Esto puede producir un parpadeo o una pantalla vacía antes de que aparezca la interfaz. El acceso utiliza una tarjeta oscura y un botón simple; funcionalmente es claro, pero no comunica todavía la identidad de una marisquería ni presenta una experiencia de entrada premium.

El selector de roles (`RoleSelectorElite`) concentra el mayor esfuerzo visual artesanal: fondo líquido, stickers, botones orbitales, halos, slogan, selector de tema y acciones de cliente/logout. La idea tiene personalidad, pero hay demasiados elementos decorativos compitiendo con la acción principal. El usuario necesita identificar rápidamente “Mesero”, “Cocina”, “Administrador” o el acceso correspondiente; un sistema de tarjetas/roles con jerarquía y estados de presión claros sería más robusto que varios círculos con texto uppercase, letter spacing alto y escalas calculadas manualmente.

La pantalla administrativa de menú es el candidato número uno para una migración visual. `AdminMenuScreen.tsx` concentra sidebar, listado de productos, tarjetas, botón primario, modal, tabs, inputs, switches, selector de unidad, secciones anidadas y footer de acciones. Ese archivo supera las mil líneas y mantiene gran parte de los componentes con `StyleSheet` propio. Es precisamente el tipo de pantalla donde una biblioteca UI puede reducir trabajo futuro y evitar que cada nuevo formulario vuelva a inventar estados de foco, error, disabled, loading, pressed y responsive.

El flujo de mesero está mejor resuelto desde el punto de vista del dominio. `MeseroScreen` coordina `PuestoMando`, `ProductPickerOverlay`, `VariantsModal`, `BluetoothPrinterModal` y `NotificationToast`; `PuestoMando` compone mesas, pedido y área de acciones; `TarjetaComanda` presenta estados operativos y timers. Esa arquitectura no debe destruirse. Lo correcto es conservar los hooks y contratos de negocio y reemplazar gradualmente la infraestructura visual de los overlays, las tarjetas y las acciones.

## Problemas concretos que deben corregirse antes de pulir

El primer problema es la coexistencia de dos fuentes de verdad para el tema. `src/compartido/temas/ThemeContext.tsx` define el tema dinámico `elite/default`, pero también exporta un objeto legacy `theme` cuyo `colors` apunta siempre a `defaultColors`. En `app/_layout.tsx` se utiliza `theme.colors.background` aunque el `ThemeProvider` pueda haber seleccionado el tema elite. En `AdminMenuScreen`, `ProductCard` y otros componentes se mezcla `theme` con colores dinámicos y hexadecimales directos. El resultado probable es una pantalla con fondos, títulos y superficies que no pertenecen al mismo tema.

Además, la preferencia se almacena con una sola clave global, `@adi_theme_preference`. Si la misma instalación trabaja con distintos tenants o categorías, el tema seleccionado para un negocio puede filtrarse a otro. La preferencia debería ser por tenant o, como mínimo, por categoría. También conviene eliminar el puente legacy después de migrar los consumidores a un único hook de tema.

El segundo problema es de contraste. En `AdminMenuScreen.tsx`, `emptySubtitle` usa `#0F172A` sobre superficies oscuras; `textInput` usa `#64748B` como color de texto; varios títulos usan `#64748B` aunque el fondo sea muy oscuro. Estas combinaciones pueden hacer que información válida parezca invisible. Los tokens deben definir pares explícitos `background/foreground`, `surface/surfaceForeground`, `primary/primaryForeground`, `muted/mutedForeground`, `error/errorForeground` y `warning/warningForeground`.

El tercer problema son los estados silenciosos. `PanelInventario` registra una acción FAB con `onPress: () => {}` y `AdminDashboardScreen` registra una acción de métricas con el mismo patrón; `PuestoMando` convierte `handleSend` en no-op cuando `canSend` es falso. Aunque algunos botones visualmente se deshabiliten, el usuario no siempre recibe el motivo. Un botón que no hace nada debe desaparecer, mostrar estado disabled inequívoco o explicar la precondición: “Selecciona una mesa”, “No hay productos pendientes”, “La impresora no está conectada” o “Esta función aún no está disponible”.

El cuarto problema es la implementación del FAB radial global. `FabRadial.tsx` usa posicionamiento absoluto, tamaños fijos, `zIndex: 9999`, radio trigonométrico, pulso perpetuo y burbujas animadas, pero no tiene backdrop, gestión de foco, coordinación explícita con los overlays ni una estrategia clara para descartar el menú al tocar fuera. En una aplicación con modales de producto, variantes, impresora y toasts superpuestos, esta capa es un candidato de alto riesgo.

## Logo y branding

El logo actual no está roto sólo por un problema de render; el problema empieza en la configuración de assets. `app.config.js` reutiliza `assets/images/icon_custom.png` como icono principal, foreground del adaptive icon de Android y splash; `favicon.png` es visualmente el mismo PNG. El asset observado es una imagen 1024×1024 con fondo claro casi circular, mucho margen y la marca genérica `adi - APP`. No es una identidad específica de marisquería y no está preparado como conjunto de assets nativos.

Expo documenta que el splash, el icono general y el Android adaptive icon requieren composiciones distintas. En particular, el adaptive icon de Android separa foreground, background y monochrome, mientras que el icono iOS debe llenar el lienzo cuadrado sin esquinas redondeadas ni transparencias innecesarias.[11]

> “The Android Adaptive Icon is formed from two separate layers — a foreground image and a background color or image.” — Expo Documentation [11]

La corrección debe ser un paquete de assets, no otro PNG improvisado: `logo-mark.png` transparente para uso interno, `wordmark.png` para encabezados, `icon.png` cuadrado para launcher, `android-foreground.png`, `android-monochrome.png`, `splash-icon.png`, `splash-icon-dark.png` y un `favicon.png` compacto. Para el logo dentro de la aplicación ya existe `expo-image`, que ofrece cache, `contentFit`, `contentPosition` y transiciones; usar `contentFit="contain"` con un asset diseñado para el contenedor evita recortes y parpadeos, aunque no sustituye la correcta configuración nativa.[12]

## Qué conviene reemplazar y qué conviene conservar

| Parte del proyecto | Decisión | Motivo |
|---|---|---|
| Botones, icon buttons y estados pressed/disabled/loading | Reemplazar por una primitive única | Es el origen más frecuente de inconsistencias y “botones que no jalan” |
| Inputs, labels, errores y switches del admin | Reemplazar por Paper/RNEUI o primitives copy-paste | Hay muchos formularios y estados que mantener |
| Tabs del editor de producto | Reemplazar por primitive de tabs con estado activo y accesibilidad | Actualmente son botones estilizados individualmente |
| Dialogs, overlays y selector de productos | Reemplazar por sheets/dialogs coordinados | Reduce problemas de keyboard, z-index, dismiss y safe area |
| FAB radial | Reemplazar por FAB group o barra contextual | El patrón actual es demasiado global y frágil |
| Tokens y provider de tema | Refactorizar completamente | El puente legacy puede mezclar temas |
| `PuestoMando` y `TablesGrid` | Conservar semántica; refactorizar base visual | La semántica POS es específica y no debe volverse genérica |
| `TarjetaComanda` | Conservar y pulir | Ya tiene estados, timers y acciones operativas razonables |
| `ProductPickerOverlay` | Conservar la lógica; migrar a sheet | Ya tiene selección, categorías y feedback útiles |
| Animaciones de dominio | Conservar intención; centralizar implementación | No hace falta convertir toda la app a otra librería |

## Bibliotecas gratuitas recomendadas

### Primera elección: React Native Paper

[React Native Paper](https://oss.callstack.com/react-native-paper/docs/guides/getting-started) aporta componentes production-ready, un `PaperProvider`, theming centralizado y portal para componentes de nivel superior. La guía oficial explica su integración con Expo y la posibilidad de personalizar colores y tipografías.[1] Su licencia oficial es MIT, con permisos de uso comercial, modificación y distribución.[8]

Para este proyecto lo utilizaría en **Button, IconButton, TextInput, HelperText, Switch, Chip, Badge, Dialog, Portal, Snackbar, Surface, Card y Tabs**. No utilizaría su tema Material por defecto sin editarlo; lo tematizaría con negro carbón, dorado marino, blanco cálido, estados verdes/rojos y radios más controlados. Es la opción con mejor relación entre velocidad de adopción y cobertura de la pantalla administrativa.

### Complemento directo: `@gorhom/bottom-sheet`

[React Native Bottom Sheet](https://gorhom.dev/react-native-bottom-sheet/) v5 es la mejor pieza para `ProductPickerOverlay`, `VariantsModal`, `BluetoothPrinterModal` y posiblemente el panel de acciones. Su documentación declara soporte para web, sizing dinámico, modales, teclado, listas, snapping y accesibilidad; requiere Reanimated y Gesture Handler, que ya están en el proyecto.[7] El repositorio tiene licencia MIT.[10]

Aquí sí conviene probar primero una migración de una sola pantalla. Si el bottom sheet resuelve bien Android, iOS y web en la versión actual, se puede retirar gran parte del posicionamiento absoluto y de las animaciones manuales de overlays.

### Para una reconstrucción editable: React Native Reusables o gluestack UI

[React Native Reusables](https://reactnativereusables.com/) lleva el enfoque de shadcn/ui a React Native y ofrece componentes copy-paste para NativeWind o Uniwind.[3] Su licencia MIT está verificada en el repositorio oficial.[9] [gluestack UI](https://gluestack.io/) también se presenta como una biblioteca de componentes y patrones copy-paste para React Native, Expo y web, con control directo del código.[2]

Ambas son buenas referencias para la estética que se busca: componentes editables, superficies modernas, estados bien resueltos y composición menos plana. Sin embargo, el repositorio actual no tiene NativeWind. Adoptarlas de forma literal implica introducir NativeWind o Uniwind, cambiar el sistema de estilos y revisar una gran cantidad de archivos. Las usaría como **segunda etapa** o como fuente de primitives, no como un reemplazo de una semana.

### Para una migración visual mayor: Tamagui

[Tamagui](https://tamagui.dev/) combina primitives, UI kit, tokens tipados, temas, media queries, variantes, animaciones y optimización para React Native y web.[5] [Tamagui UI](https://tamagui.dev/ui/intro) utiliza componentes copy-paste composables y providers para portales como dialogs y popovers.[6]

Es atractivo si se decide reconstruir toda la experiencia visual con una estrategia universal web/native. No lo recomiendo como primera acción porque implica introducir un sistema de styling, providers, tokens y componentes con una arquitectura distinta a la actual. Es una buena ruta para una versión mayor, no para apagar rápidamente los incendios de botones, modales y contraste.

### Para animación: mantener Reanimated primero; Moti como opción secundaria

[Moti](https://moti.fyi/) simplifica animaciones de montaje/desmontaje, variantes, keyframes y transiciones multiplataforma sobre Reanimated.[4] Su repositorio declara licencia MIT y soporte para Expo/web.[13] Aun así, el proyecto ya usa Reanimated `4.3.1`, mientras que la documentación de Moti hace referencia a Reanimated 3; antes de añadirlo hay que validar compatibilidad real en un prototipo.

Mi recomendación es **no añadir Moti inmediatamente**. Primero centralizaría los patrones existentes en helpers de Reanimated 4: `pressScale`, `fadeIn`, `sheetTransition`, `stagger`, `reduceMotion` y `withTiming` con duraciones de 120–280 ms. Si el código sigue siendo demasiado verboso después de esa normalización, entonces sí probaría Moti en overlays y listas.

### Alternativa de adopción sencilla: React Native Elements / RNEUI

[React Native Elements](https://reactnativeelements.com/docs) ofrece un kit all-in-one, guía específica para Expo y un `ThemeProvider` central.[14] Puede acelerar rápidamente inputs, buttons, cards, badges y formularios. Lo pondría por debajo de Paper porque el proyecto necesita dialogs, portals, sheets y una identidad premium más controlada; RNEUI es una buena alternativa si Paper resulta demasiado Material o si se prefiere una API más simple.

| Candidato | Gratis verificado | Encaje con rama dos | Mejor uso | Riesgo |
|---|---:|---|---|---|
| React Native Paper | Sí, MIT | Alto | Forms, buttons, dialogs, theme | Estética Material genérica |
| `@gorhom/bottom-sheet` | Sí, MIT | Muy alto | Overlays, sheets, keyboard | Validar con Reanimated 4/web |
| React Native Reusables | Sí, MIT | Medio | Primitives editables | Requiere NativeWind/Uniwind |
| gluestack UI | Revisar licencia del repo antes de fijar versión | Medio | Sistema copy-paste universal | Añade NativeWind/Uniwind |
| Tamagui Core/UI | Separar de Pro y revisar versión | Medio-bajo inmediato | Rediseño universal grande | Migración arquitectónica |
| Moti | Sí, MIT | Medio | Motion declarativo | Validar con Reanimated 4 |
| RNEUI | Open source según documentación | Medio-alto | Forms/cards rápidos | Menos distintivo y menos adecuado para sheets complejos |

## Hoja de ruta recomendada

**Fase cero: estabilidad.** Antes de cambiar la estética, instalar las dependencias en CI o en un entorno limpio y ejecutar `npm run verify`. En esta revisión no se instaló `node_modules`, ni se modificó el repositorio, y el entorno local no tenía `tsc` ni `eslint` globales. Por tanto, los problemas de calidad descritos aquí son hallazgos estáticos y deben confirmarse con lint, TypeScript, Jest y una ejecución real.

**Fase uno: sistema visual único.** Crear `src/ui/primitivos/` con `Button`, `IconButton`, `Card`, `Badge`, `Input`, `Select`, `SegmentedControl`, `Dialog`, `Sheet`, `Toast`, `EmptyState`, `LoadingState` y `ErrorState`. Definir tokens en un único lugar: colores, spacing, radius, typography, elevation, motion y breakpoints. Migrar primero AdminMenu y no permitir nuevos hexadecimales fuera de tokens.

**Fase dos: reparar el flujo crítico.** Sustituir el modal de producto, variantes y Bluetooth por sheets/dialogs coordinados. Cada acción debe tener `idle`, `pressed`, `disabled`, `loading`, `success` y `error`. Los botones deshabilitados deben explicar su motivo. El botón primario debe confirmar visualmente la presión en menos de 200 ms, usar haptics sólo en acciones relevantes y respetar `reduce motion`.

**Fase tres: rehacer el admin de menú.** Mantener `useMenuManagement` y sus acciones, pero migrar visualmente sidebar, cards, tabs, inputs, switches y footer. El objetivo es que agregar un nuevo campo no requiera crear otra familia de estilos. El modal debe tener scroll de formulario, teclado, foco inicial, validación de campo y footer persistente.

**Fase cuatro: refinar la operación POS.** Conservar `TablesGrid`, `PuestoMando` y `TarjetaComanda`, pero aplicar las nuevas primitives. La mesa debe comunicar con claridad libre/ocupada/cuenta; la comanda debe separar urgencia, estado, timer y acción; el área inferior debe mostrar siempre el siguiente paso disponible. No introducir decoración que reduzca la velocidad de operación.

**Fase cinco: branding y prueba multiplataforma.** Generar el set de assets separado, actualizar `app.config.js`, reemplazar el logo genérico y probar en Android, iOS y web. La matriz mínima debe cubrir teléfono pequeño, teléfono grande, tablet, navegador web, modo oscuro, modo elite, teclado abierto, safe area, texto largo, orientación y `prefers-reduced-motion`.

## Decisión final

**Sí conviene invertir en una modernización profunda de la UI. No conviene reemplazar la lógica del POS ni migrar de golpe todo el proyecto a un framework visual nuevo.** El camino más rápido y robusto es centralizar primitives, tematizar correctamente, sustituir overlays por bottom sheets, eliminar no-op visibles, separar assets de branding y conservar los componentes de dominio que ya tienen valor.

Si hubiera que elegir sólo tres acciones para empezar mañana, serían: **(1)** crear el sistema de tokens y corregir el bridge legacy del tema; **(2)** migrar `ProductPickerOverlay`, `VariantsModal` y `BluetoothPrinterModal` a `@gorhom/bottom-sheet`; y **(3)** reconstruir `AdminMenuScreen` con React Native Paper o primitives equivalentes. Con esas tres decisiones se reduce la sensación de interfaz plana, se estabilizan los flujos más frágiles y se acelera el trabajo restante sin reescribir el negocio.

## Referencias

[1]: https://oss.callstack.com/react-native-paper/docs/guides/getting-started "React Native Paper — Getting Started"
[2]: https://gluestack.io/ "gluestack UI — React & React Native UI Components"
[3]: https://reactnativereusables.com/ "React Native Reusables"
[4]: https://moti.fyi/ "Moti — Universal animation package for React Native"
[5]: https://tamagui.dev/ "Tamagui — React and React Native style library and UI kit"
[6]: https://tamagui.dev/ui/intro "Tamagui UI — Copy-paste composable components"
[7]: https://gorhom.dev/react-native-bottom-sheet/ "React Native Bottom Sheet — Documentation"
[8]: https://github.com/callstack/react-native-paper/blob/main/LICENSE.md "React Native Paper — MIT License"
[9]: https://github.com/founded-labs/react-native-reusables/blob/main/LICENSE "React Native Reusables — MIT License"
[10]: https://github.com/gorhom/react-native-bottom-sheet/blob/master/LICENSE "React Native Bottom Sheet — MIT License"
[11]: https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/ "Expo — Splash screen and app icon"
[12]: https://docs.expo.dev/versions/latest/sdk/image/ "Expo Image"
[13]: https://github.com/nandorojo/moti "Moti — GitHub repository and MIT license"
[14]: https://reactnativeelements.com/docs "React Native Elements — Overview and theming"
