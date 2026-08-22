# Auditoría visual y UX — Marisquerías / rama-2

## Alcance

Revisión estática y de lectura del repositorio `st-33/marisquerias`, referencia remota `origin/rama-2`, commit `7d3b617` (`fix(validacion): corregir bloqueos de tipos tests y lint`). Se creó únicamente un árbol local detached para lectura; no se creó ni publicó ninguna rama y no se modificó el repositorio remoto.

## Hallazgos iniciales

1. **La rama es una aplicación Expo/React Native multiplataforma**, no una web React convencional. La UI principal vive en `src/ui`, las rutas en `app`, y el flujo operativo depende de componentes propios, `react-native-reanimated`, `react-native-gesture-handler`, `@expo/vector-icons` y temas custom.
2. **Hay una capa visual artesanal grande y repetida**: 74 archivos `.tsx`, pantallas administrativas extensas, modales, tabs, switches, cards, FAB radial, overlays y varios wrappers de interacción. La mayor oportunidad de velocidad no es reemplazar la lógica de negocio, sino estandarizar primitives, overlays, formularios, feedback y tokens.
3. **No se confirma un bloqueo de imports en los archivos revisados:** una vista anterior parecía omitir algunos imports, pero la lectura directa de las cabeceras confirma que `useEffect`, `useState`, `useMemo` e `Ionicons` sí están importados en los archivos señalados. No se reportan como errores. La rama todavía debe validarse con TypeScript/CI, pero el entorno local no permite ejecutar esa validación sin instalar dependencias.
4. **El sistema de temas puede desincronizarse:** `ThemeContext` tiene temas `elite` y `default`, pero exporta un objeto legacy `theme` siempre basado en `defaultColors`. Varios componentes importan `theme` en vez de `useAppTheme()`/`useThemedColors()`. El root layout usa `theme.colors.background`, por lo que la envolvente puede conservar el fondo azul oscuro default aunque la categoría marisquerías deba usar el tema elite dorado/negro.
5. **La preferencia de tema se guarda globalmente** en `@adi_theme_preference`, no por tenant/categoría. Un cambio realizado para un negocio puede filtrarse visualmente a otro.
6. **El proveedor de tema devuelve `null` mientras carga AsyncStorage**, sin un shell/splash propio en esa capa. Esto puede producir una pantalla en blanco perceptible durante el arranque.
7. **El tema calcula escala y dimensiones al cargar el módulo** con `Dimensions.get('window')`; no se actualiza en rotación, resize web o cambios de ventana. La escala manual también aparece duplicada en varios componentes.
8. **Hay colores hardcodeados y problemas de contraste** en `AdminMenuScreen`: `emptySubtitle` usa `#0F172A` sobre superficies oscuras; `textInput` usa `#64748B` como color de texto; títulos y etiquetas usan `#64748B` en varios estados. Esto puede hacer que texto parezca invisible o apagado.
9. **`AdminMenuScreen` concentra demasiada UI propia:** sidebar, cards, botones, tabs, modal, inputs, switches, selector de unidad y footers. Es el mejor candidato para migrar gradualmente a un kit de primitives/overlays/forms.
10. **El flujo de mesero está compuesto por varias capas superpuestas:** `PuestoMando`, `NotificationToast`, `ProductPickerOverlay`, `VariantsModal` y `BluetoothPrinterModal`. La lógica es específica y debe conservarse, pero dialogs/sheets/toasts/portals y estados de feedback pueden estandarizarse.
11. **En `PuestoMando`, `handleSend` se convierte en un no-op cuando `canSend` es falso** (`() => {}`). Aunque `ActionArea` deshabilita el CTA, la ausencia de explicación contextual puede percibirse como “el botón no funciona”. Conviene sustituir no-op silencioso por estado disabled con motivo visible o tooltip/toast contextual.
12. **El FAB radial es una implementación custom frágil:** posicionamiento absoluto, tamaños fijos, `zIndex: 9999`, radio trigonométrico, pulso perpetuo, sin backdrop, sin gestión de foco/dismiss, y sin coordinación explícita con overlays. Es candidato claro para reemplazar el patrón de interacción por un componente/primitive más robusto o encapsularlo sobre una librería.
13. **El logo configurado se reutiliza para varios contextos** (`icon`, `android adaptiveIcon.foregroundImage`, splash y favicon) aunque esos contextos requieren composiciones diferentes. El asset visto es un PNG 1024×1024 con marca genérica `adi - APP`, mucho margen y fondo claro; no es una identidad específica de marisquería ni un set de assets adaptativos. Esto puede explicar recortes, bordes, escalado extraño o sustituciones inconsistentes.
14. **No todo requiere reemplazo:** `ProductPickerOverlay` y `TarjetaComanda` ya contienen patrones razonables de estados, animación, selección y feedback. Conviene conservar su semántica de negocio y refactorizar sólo la base visual/overlays, no tirarlos completos.
15. **La base instalada ya incluye `react-native-reanimated` y `react-native-gesture-handler`**, por lo que el problema no es ausencia de capacidad de animación, sino consistencia, coordinación, accesibilidad, manejo de estados y exceso de implementaciones aisladas.
16. **Hay no-op de navegación/acción en superficies visibles:** `PanelInventario` registra una acción FAB principal con `onPress: () => {}`; `AdminDashboardScreen` registra la acción de métricas con `onPress: () => {}` y un fallback disabled que también no ejecuta nada. En `PuestoMando`, el envío se transforma en no-op cuando no se cumplen precondiciones. Estas acciones deben expresar explícitamente su estado disabled, motivo o destino, no aparentar botones rotos.

## Restricción de verificación

En el árbol local no existe `node_modules` y el entorno no tiene `tsc` ni `eslint` globales. Hasta este punto no se ha ejecutado la app ni se ha instalado nada para preservar la revisión como lectura; los bloqueos indicados son observaciones estáticas que deberían validarse en CI antes de una migración.

## Hallazgo visual de assets

El icono principal y el favicon son visualmente el mismo PNG 1024×1024: fondo claro casi circular con bastante margen, la marca genérica `adi` y el texto `- APP -`. No se observa una composición propia para marisquería, ni una versión compacta para favicon, ni una separación clara entre icono de launcher, foreground de Android adaptive icon y splash. La reutilización del mismo archivo en `app.config.js` es una causa plausible de recortes, márgenes excesivos y diferencias entre plataformas; la solución debe ser un set de assets con safe area, foreground transparente y lockup/wordmark separados.

## Investigación externa — candidatos UI

### React Native Paper

La guía oficial de React Native Paper documenta instalación directa con `react-native-paper`, uso con Expo sin instalar manualmente los iconos de Expo, un `PaperProvider` que centraliza el tema y funciona como portal para componentes que deben renderizarse en el nivel superior, y temas personalizados basados en Material Design 3. Es una opción fuerte para formularios, botones, dialogs, menus, tabs, surfaces y feedback, pero su lenguaje visual por defecto es Material; habría que tematizarlo para no imponer una estética genérica.[Fuente oficial](https://oss.callstack.com/react-native-paper/docs/guides/getting-started)

### gluestack UI

La página oficial de gluestack se presenta como una biblioteca de componentes y patrones para React y React Native, con código copy-paste basado en Tailwind CSS/NativeWind, orientada a apps universales Expo + web y con control directo del código y de la personalización. Encaja especialmente bien con el stack actual porque ya usa NativeWind y permite editar los componentes en lugar de tratarlos como una caja negra.[Fuente oficial](https://gluestack.io/)

### React Native Reusables

La documentación oficial presenta React Native Reusables como una biblioteca de componentes copy-paste que lleva el enfoque de shadcn/ui a React Native, con NativeWind o Uniwind, y muestra variantes para Web, Native y Expo. Su principal ventaja para este repo es que los componentes quedan dentro del código del proyecto y se pueden editar para la identidad de marisquería; no es una caja negra. Su costo es que el equipo debe asumir la responsabilidad de mantener y adaptar cada primitive.[Fuente oficial](https://reactnativereusables.com/)

### Moti

La documentación oficial de Moti lo describe como una capa de animación universal para React Native, con soporte de web y Expo, animaciones de montaje/desmontaje, variantes, keyframes y ejecución sobre el hilo nativo mediante Reanimated. Puede reducir la cantidad de `Animated.Value`, `useEffect` y cleanup manual en overlays y listas, pero no reemplaza el sistema de componentes ni la lógica del dominio.[Fuente oficial](https://moti.fyi/)

### Tamagui

La documentación oficial de Tamagui combina primitives y UI kit, tokens tipados, temas como variables, media queries, variantes, estilos de press/hover y animaciones universales, con compatibilidad para React Native y web. Es una opción potente para reconstruir el sistema visual completo y reducir la escala manual, pero su adopción es más invasiva que introducir primitives copy-paste; la reservaría para una reescritura visual amplia o una estrategia universal web/native, no como primer parche rápido.[Fuente oficial](https://tamagui.dev/)

### React Native Elements / RNEUI

La documentación oficial de RNEUI presenta un kit all-in-one con API y look consistentes, guía específica para Expo, versión 5.0.0 y un `ThemeProvider` central para colores y props. Puede acelerar botones, cards, inputs, badges, overlays sencillos y formularios, aunque su estilo base es más genérico y su enfoque de tema no resuelve por sí solo la identidad premium de marisquería.[Fuente oficial](https://reactnativeelements.com/docs)

## Verificación de gratuidad

Los repositorios oficiales de React Native Paper y React Native Reusables muestran licencia MIT, con permisos de uso comercial, modificación, distribución y uso privado, sujetos a conservar el aviso de copyright y licencia. Esto confirma que son opciones gratuitas/open source para incorporar y adaptar, sin confundir “gratis” con una plataforma SaaS.[Paper MIT](https://github.com/callstack/react-native-paper/blob/main/LICENSE.md) [Reusables MIT](https://github.com/founded-labs/react-native-reusables/blob/main/LICENSE)

### `@gorhom/bottom-sheet`

La documentación oficial de React Native Bottom Sheet v5 declara soporte para React Native Web, sizing dinámico, modales, snapping, teclado, listas y accesibilidad; para Expo requiere precisamente `react-native-reanimated` y `react-native-gesture-handler`, dependencias que ya aparecen en `package.json` de la rama. Su repositorio tiene licencia MIT. Es el candidato más directo para reemplazar `ProductPickerOverlay`, `VariantsModal`, `BluetoothPrinterModal` y quizá el panel de acciones, aunque debe validarse específicamente con las versiones actuales de Expo SDK 56/Reanimated 4 antes de adoptar v5.[Documentación](https://gorhom.dev/react-native-bottom-sheet/) [MIT](https://github.com/gorhom/react-native-bottom-sheet/blob/master/LICENSE)

## Compatibilidad real del repositorio

El `package.json` de `origin/rama-2` declara Expo `~56.0.12`, React Native `0.85.3`, Reanimated `4.3.1`, Gesture Handler `~2.31.1`, `react-native-web` `~0.21.0` y Zustand `5.0.14`. No declara `nativewind`. Por tanto, gluestack y React Native Reusables son atractivos por su enfoque editable, pero no deben presentarse como integración inmediata: habría que introducir NativeWind/Uniwind o tomar sus patrones como referencia y traducirlos a `StyleSheet`/tokens existentes. Para velocidad inmediata, Paper/RNEUI y un sistema propio de primitives sobre `StyleSheet` tienen menor costo de migración.

### Tamagui UI y Moti — verificación adicional

La página oficial de Tamagui UI confirma que sus componentes son copy-paste, composables y multiplataforma, y que se instalan mediante el paquete `tamagui` con un provider raíz para portales como dialogs y popovers. El sitio separa explícitamente Core/UI de Pro; para este informe sólo se considera el material Core/UI, no Pro.[Tamagui UI](https://tamagui.dev/ui/intro)

El repositorio oficial de Moti muestra licencia MIT, soporte web y Expo, animaciones de montaje/desmontaje y uso sobre Reanimated. Es una opción gratuita para simplificar motion, pero el repo/documentación se presenta como powered by Reanimated 3; por eso debe probarse con la versión Reanimated 4.3.1 del proyecto antes de introducirlo en producción.[Moti GitHub](https://github.com/nandorojo/moti)

### Assets y carga visual con Expo

La guía oficial de Expo recomienda tratar splash e icono como assets de branding distintos; para splash recomienda PNG transparente de 1024×1024, y para Android adaptive icon separa foreground, background y monochrome. También indica que el icono iOS debe ser cuadrado y llenar el lienzo sin esquinas redondeadas ni píxeles transparentes innecesarios. Esto confirma que reutilizar el mismo PNG con fondo y margen para icono, foreground, splash y favicon no es una solución robusta.[Expo splash & app icon](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/)

La documentación de `expo-image`, que ya está en las dependencias de la rama, ofrece carga multiplataforma, cache de memoria/disco, placeholders y `contentFit`/`contentPosition`. Para el logo dentro de pantallas se puede usar `contentFit="contain"` y un asset con fondo/transparencia controlados; esto mejora el render de la imagen en UI, pero no sustituye la separación correcta de assets nativos.[Expo Image](https://docs.expo.dev/versions/latest/sdk/image/)

## Verificación visual de exportación web — rama-2.3

La exportación web de Expo terminó correctamente y publicó 17 rutas estáticas. La ruta inicial redirige a `/access` y renderiza el formulario de acceso sin errores; al no existir tenant autenticado, conserva el tema default azul, lo cual es coherente con la detección por tenant. Al navegar directamente a `/_role/roles` sin slash final, el servidor `python -m http.server` devolvió 404 por no hacer fallback/index resolution de esa URL; no es un error de TypeScript ni del bundler. Debe verificarse con `/_role/roles/` o con un servidor SPA que resuelva las rutas estáticas.

La exportación contiene `dist/_role/roles.html`, pero abrirlo como URL pública produce una pantalla de “Unmatched Route” porque Expo Router interpreta `.html` como parte del pathname. Esto confirma que la prueba visual correcta requiere un servidor que resuelva los archivos generados como rutas SPA o un preview de Expo/EAS; no se modificará la navegación sólo para compensar `python -m http.server`.

La ruta `/_role/roles/` ya se sirve mediante el alias temporal y el bundle carga, pero permanece en `CARGANDO SESIÓN...` porque la guardia/bootstrap de sesión necesita autenticación o datos remotos. No se considera fallo visual de la pantalla Elite; sí queda como limitación de la verificación manual sin sesión.

## Sincronización con `rama-2` — verificación posterior

Se actualizó `origin/rama-2` y se confirmó que avanzó de `a4edbfc` a `cb4e8fb` con el commit `fix(tenant): aislar tema y eliminar no-ops de acciones`. El cambio nuevo afecta `app/_layout.tsx`, `src/compartido/temas/ThemeContext.tsx`, `src/capacidades/ui/useUniversalFab.ts`, `src/capacidades/ui/index.ts`, `ActionArea`, `PuestoMando`, `AdminDashboardScreen` y añade `ThemeContext.test.tsx`.

En `rama-2.3` se portaron los hechos compatibles: clave exacta `@adi_theme_preference:<tenantPath>`, aislamiento de tenant cargado, export público `ThemeContextValue`/`theme`, prueba de tenant y eliminación de `useUniversalFab` sin consumidores. Se conservaron deliberadamente las mejoras UI de `rama-2.3`: feedback contextual al enviar, FAB sin pulso perpetuo, dismiss de overlays y paso reactivo de `tenantPath` al shell raíz. También se conservó `isPrinting` en `PuestoMando`, porque el diff de `rama-2` lo elimina aunque `ActionArea` aún usa ese estado para la cuenta.

Validación posterior: `git diff --check`, TypeScript, ESLint sobre archivos afectados, **16 suites / 102 pruebas**, exportación Expo web correcta con **17 rutas estáticas**. `rama-2` no fue checkout, modificada ni empujada.
