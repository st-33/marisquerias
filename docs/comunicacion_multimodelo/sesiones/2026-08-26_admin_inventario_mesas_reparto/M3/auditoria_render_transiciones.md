# Auditoría de renderizado y transiciones — M3

| Campo | Valor |
|---|---|
| Autor | Manus AI / M3 |
| Alcance | Renderizado, acomodo responsive, desplazamiento y transiciones visuales de todos los roles |
| Rama | `rama-2` |
| Fecha | 2026-08-26 UTC |
| Regla de intervención | Se corrigieron solo problemas visuales verificables; los problemas de botones, negocio o persistencia quedaron reportados sin modificación |

## 1. Resumen ejecutivo

La sensación de “golpe” al cambiar de pantalla tenía una causa transversal: la navegación global no declaraba una animación y las pantallas se montaban directamente. Además, varias superficies internas cambiaban de tamaño de forma instantánea cuando aparecían botones, totales, productos o pasos de variantes.

Se aplicaron correcciones visuales en cuatro niveles. Primero, las rutas nativas usan una transición `fade` y en web se añade una entrada suave de opacidad y desplazamiento. Segundo, la fábrica de pantallas envuelve los roles resueltos con una entrada gradual. Tercero, el Mesero tiene acomodo más estable en móviles y tablets: el grid de mesas cambia sus columnas según el ancho, la barra de acciones entra suavemente y los pasos de variantes no saltan. Cuarto, se corrigió el selector de roles para medir el alto real de la pantalla y se permitió que las estadísticas de Cocina envuelvan sus tarjetas.

El resultado está **estructuralmente corregido y compilable**, pero la validación visual end-to-end con datos reales queda pendiente de una sesión autenticada en cada dispositivo. No se introdujeron cambios en transacciones de negocio, RTDB, persistencia ni botones funcionales.

## 2. Mapa visual auditado

| Rol o superficie | Qué se revisó | Resultado |
|---|---|---|
| Acceso | Tarjeta centrada, entrada hacia el selector y adaptación vertical | El layout ya usa ancho máximo; ahora los cambios de ruta quedan cubiertos por la transición global. |
| Selector de roles | Grid de roles, fondo, scroll y cálculo de espacios | Se reemplazó el alto congelado de `Dimensions.get('window')` por `useWindowDimensions`, para que rotación y resize no conserven medidas viejas. |
| Mesero | Grid de mesas, panel de pedido, barra inferior, selector de productos y variantes | Se corrigieron breakpoints del grid, entrada de acciones, transición de pasos y anchos de opciones en móvil. |
| Cocina | Encabezado y tarjetas de estadísticas | Las tarjetas de estadísticas ahora pueden bajar de línea en pantallas estrechas. |
| Administrador | Rutas de Dashboard, Menú, Inventario, Mesas, Reparto, Dispositivos y Mostrador | Las pantallas resueltas reciben entrada suave; la ruta directa de Dispositivos también queda cubierta por el velo global. La experiencia objetivo del Admin sigue siendo tablet y pantalla grande. |
| Transición global | Stack raíz, resolvedor y cambios de pathname | Android usa `fade` nativo; web usa un velo breve y la fábrica usa entrada de pantalla. |
| Piezas compartidas | `TablesGrid`, `ActionArea`, `ProductPickerOverlay`, `VariantsModal`, FAB | Se mantuvieron sus contratos; solo se corrigieron presentaciones visuales dentro del alcance. |

## 3. Correcciones realizadas

| Corrección | Archivo | Efecto visible |
|---|---|---|
| Transición nativa del Stack | `app/_layout.tsx` | Android deja de cortar la navegación y usa un fade de 240 ms. |
| Velo de transición web | `app/_layout.tsx` | La nueva ruta aparece bajo una capa breve que se desvanece en 240 ms, evitando el cambio seco en web y en rutas directas. |
| Entrada de pantallas resueltas | `src/composicion/resolvedorPantalla.tsx`, `src/ui/bloques/TransicionPantalla.tsx` | Roles y módulos que pasan por la fábrica entran con opacidad y desplazamiento vertical muy ligero. |
| Grid de mesas responsive | `src/ui/bloques/TablesGrid.tsx` | En móvil pequeño usa 3 columnas; en móvil ancho 4; en tablet 5; en escritorio amplio 6. Las mesas dejan de verse diminutas por forzar demasiadas columnas. |
| Barra inferior del Mesero | `src/ui/bloques/ActionArea.tsx` | Cuando cambia el conjunto de acciones o el total, los botones entran con una escala y desplazamiento mínimos en vez de reaparecer de golpe. |
| Pasos de variantes | `src/ui/bloques/VariantsModal.tsx` | El contenido del paso actual entra suavemente; las opciones ocupan el ancho completo en móvil menor a 480 px y dos columnas en superficies mayores. |
| Selector de roles | `src/ui/bloques/RoleSelectorElite.tsx` | El alto se recalcula al rotar o redimensionar la ventana, evitando espacios o cortes heredados del primer render. |
| Estadísticas de Cocina | `src/ui/pantallas/CocinaScreen.tsx` | Los indicadores pueden envolver línea cuando no caben, sin desbordar el encabezado. |
| Admin Mesas | `src/ui/roles/administrador/mesas/PantallaMesas.tsx`, `estilos.ts` | El encabezado y tarjetas resumen se acomodan mejor en tablet compacta; el canvas vacío ahora explica qué hacer y se reserva espacio inferior para el FAB. |

## 4. Incidencias encontradas y no corregidas

Estas incidencias se reportan para el arquitecto y los responsables funcionales. No se tocaron porque no son correcciones de renderizado transversal o porque requieren una decisión de producto.

| Prioridad | Incidencia | Evidencia | Motivo para no modificarla |
|---|---|---|---|
| P1 | La navegación contextual del Admin usa `router.push` para cambiar entre módulos; acumula historial y puede hacer que el botón atrás recorra cada módulo visitado. | `src/ui/roles/administrador/metricas/PantallaMetricasDatos.tsx:110-156` | Es comportamiento de navegación y producto, no solo presentación. |
| P1 | Dispositivos mantiene una pantalla inline en `app/_role/admin/devices.tsx`, fuera del patrón de fábrica usado por la mayoría de módulos Admin. | `app/_role/admin/devices.tsx` frente a `app/_role/admin/menu.tsx` y `app/_role/admin/tables.tsx` | Requiere una decisión de composición y extracción, no un parche visual. |
| P1 | La barra de acciones del Mesero cambia de botones según el estado del pedido; aunque ahora entra suavemente, la altura total puede variar entre estados. | `src/ui/bloques/ActionArea.tsx:172-404` | Corregirlo por completo requeriría rediseñar el contrato visual de acciones. |
| P1 | El selector de variantes usa una hoja de altura fija del 92 % y footer fijo. | `src/ui/bloques/VariantsModal.tsx:528-542`, `:693-703` | Debe probarse con teclado, orientación y dispositivos reales antes de cambiar la estructura. |
| P2 | Los puntos de mesas del canvas Admin usan tamaño fijo y coordenadas porcentuales; con muchas mesas pueden acercarse o encimarse. | `src/ui/roles/administrador/mesas/estilos.ts:158-172`; `PantallaMesas.tsx:259-297` | Requiere definir reglas de diseño del plano, no solo responsive genérico. |
| P2 | El FAB global usa posiciones absolutas fijas y puede competir con contenido inferior en superficies pequeñas. | `src/ui/bloques/FabRadial.tsx:195-249` | Se reporta; la corrección debe validarse con cada módulo y safe area. |
| P2 | Algunas pantallas administrativas conservan filas horizontales densas, especialmente métricas, mostrador y dispositivos. | `src/ui/roles/administrador/metricas/*`, `MostradorAdminScreen.tsx`, `app/_role/admin/devices.tsx` | El objetivo del Admin es tablet/pantalla grande; hace falta una revisión visual dedicada con viewport objetivo. |
| P2 | La ruta de acceso solicita código y no se pudo validar una sesión completa autenticada en navegador. | `app/(auth)/access.tsx` | No se introdujeron credenciales ni datos personales. |

## 5. Verificaciones

| Verificación | Resultado |
|---|---|
| `npx tsc --noEmit` | Verde después de las correcciones. |
| Lint focal de layout, resolución, Mesero, Cocina y Mesas | Verde después de corregir errores de refs, formato y dependencias innecesarias. |
| `npm test -- --runInBand` | 19 suites y 102 pruebas verdes. |
| `CI=1 npx expo export --platform web` | Verde; el export declaró 17 rutas, incluyendo Mesero, Cocina y módulos Admin. |
| Responsive estático | Breakpoints y estados revisados en código para móvil pequeño, móvil ancho, tablet, laptop y monitor. |
| Runtime autenticado | Pendiente; el build web redirige a `/access` sin código de sesión disponible. |

## 6. Veredicto

La obra deja de tener el problema transversal de “aparecer de trancazo”: las rutas tienen una transición gradual y las superficies internas con cambios visibles reciben animaciones breves. El Mesero mejora su comportamiento en móviles y tablets; Cocina evita que sus indicadores se salgan del encabezado; el Administrador conserva un tratamiento orientado a tablet y escritorio.

No se debe declarar el frente visual como perfecto todavía. Antes del cierre de producto deben hacerse pruebas visuales autenticadas en un móvil, una tablet en vertical y horizontal, una laptop y un monitor amplio. El criterio de aceptación no es solo que compile: cada pantalla debe conservar lectura, área táctil, scroll único y jerarquía clara en su viewport objetivo.

## Referencias

[1]: ../../../../../app/_layout.tsx "Layout raíz y transición global"
[2]: ../../../../../src/composicion/resolvedorPantalla.tsx "Resolvedor común de pantallas"
[3]: ../../../../../src/ui/bloques/TransicionPantalla.tsx "Entrada suave de pantalla"
[4]: ../../../../../src/ui/bloques/TablesGrid.tsx "Grid visual compartido de Mesero"
[5]: ../../../../../src/ui/bloques/ActionArea.tsx "Barra inferior de acciones del Mesero"
[6]: ../../../../../src/ui/bloques/ProductPickerOverlay.tsx "Selector de productos"
[7]: ../../../../../src/ui/bloques/VariantsModal.tsx "Modal de variantes"
[8]: ../../../../../src/ui/bloques/RoleSelectorElite.tsx "Selector de roles"
[9]: ../../../../../src/ui/pantallas/CocinaScreen.tsx "Pantalla de Cocina"
[10]: ../../../../../src/ui/roles/administrador/mesas/PantallaMesas.tsx "Pantalla administrativa de Mesas"
[11]: ../../../../../src/ui/roles/administrador/mesas/estilos.ts "Estilos administrativos de Mesas"
[12]: ../../../../../src/ui/bloques/FabRadial.tsx "FAB global"
[13]: ../../../../../src/ui/roles/administrador/metricas/PantallaMetricasDatos.tsx "Navegación contextual del Administrador"
[14]: ../../../../../app/_role/admin/devices.tsx "Pantalla inline de Dispositivos"

## 7. Reauditoría sobre el estado remoto actual

Se actualizó la información remota antes de revisar el resultado. En el momento de esta reauditoría, `origin/main` y `origin/rama-2` apuntan exactamente al mismo commit: `76a8341`. La comparación `git rev-list --left-right --count origin/main...origin/rama-2` devuelve `0 0`; por lo tanto, no hay divergencia ni versiones distintas entre las dos ramas remotas.

La historia compartida contiene, después de la construcción de fase 4, los commits `f57b427`, `786965c`, `260ee9b` y `76a8341`. El primero actualiza el libro de eventos, el segundo corrige banderas de carga de Inventario, el tercero documenta la revisión de M4 y el cuarto contiene las correcciones visuales y la documentación de M3. No apareció un commit posterior oculto en `rama-2` durante la verificación.

La comprobación repetida sobre ese mismo estado confirmó que TypeScript termina correctamente, las 19 suites y 102 pruebas pasan, y el export web genera 17 rutas. El lint focal de los archivos modificados pasa. El lint completo conserva un único error de formato fuera de este diff, en `src/ui/roles/administrador/inventario/PanelInventario/index.tsx:784`, además de advertencias no bloqueantes en otros archivos. No se modificó ese archivo porque no pertenece al frente visual de esta entrega.

La comprobación web real mostró que `/access` renderiza correctamente la tarjeta de acceso y que `/_role/mesero` es redirigida a `/access` por el guardia cuando no existe sesión. La inspección runtime autenticada de Mesero, Cocina y Administrador queda pendiente de un código de acceso válido; no se usaron credenciales ni datos personales.
