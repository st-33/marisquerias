# Contrato de Experiencia de Software

| Campo | Valor |
|---|---|
| Nombre | Contrato de Experiencia de Software por Dispositivo |
| Versión | 1.0 |
| Fecha | 2026-08-26 UTC |
| Alcance | Renderizado, navegación, desplazamiento y legibilidad de los roles de la aplicación |
| Estado | Propuesta operativa para revisión del arquitecto |

## 1. Propósito

Este documento establece cómo debe sentirse la aplicación cuando una persona cambia de pantalla, consulta información o trabaja con controles. La aplicación no debe parecer una colección de pantallas que aparecen de golpe; debe sentirse como un espacio continuo, ordenado y amable, en el que cada vista entra con suavidad, conserva su lugar y deja claro qué puede hacer la persona.

El contrato separa dos ideas. La primera es **funcionamiento posible**: una pantalla puede abrir técnicamente en un dispositivo. La segunda es **experiencia objetivo**: la pantalla fue diseñada, dimensionada y verificada para trabajar bien en ese dispositivo. Que algo funcione en un teléfono no significa que el teléfono sea el escenario recomendado.

## 2. Prioridad por rol

| Rol | Dispositivo objetivo principal | Dispositivos secundarios | Principio |
|---|---|---|---|
| Mesero | Móvil y tablet | Laptop o pantalla web | Trabajo táctil rápido; mesas, pedido, productos y acciones deben ser fáciles de leer y tocar. |
| Cocina | Monitor, TV, laptop o tablet horizontal | Móvil | Lectura a distancia y actualización continua; las comandas deben conservar jerarquía y no quedar escondidas. |
| Administrador | Tablet, especialmente en vertical y horizontal | Laptop, computadora, monitor o smart TV; móvil solo como uso posible | El Administrador es una consola de trabajo: la tablet es el mínimo de calidad esperado. El móvil puede abrirlo, pero no es el foco de diseño. |
| Mostrador / Venta | Tablet, laptop o computadora | Móvil grande | Los totales y acciones deben permanecer visibles, separados y fáciles de confirmar. |
| Selector de roles | Móvil, tablet y escritorio | Todos | Entrada clara, lectura centrada y desplazamiento natural. |

## 3. Niveles de pantalla

| Nivel | Referencia aproximada | Regla visual |
|---|---|---|
| Móvil pequeño | Menos de 480 px de ancho | Una columna cuando los elementos necesiten aire; ningún texto importante debe ser truncado; el scroll debe ser vertical salvo categorías o filtros horizontales. |
| Móvil ancho / tablet compacta | 480–759 px | Se permite una cuadrícula de dos o cuatro elementos según el contenido, siempre que cada control conserve un tamaño cómodo. |
| Tablet | 760–1099 px | Es el mínimo de calidad para Administrador; los paneles pueden compartir ancho cuando exista espacio y deben conservar márgenes generosos. |
| Laptop / computadora | 1100–1599 px | Se aprovecha el espacio sin estirar tarjetas hasta hacerlas vacías; los contenidos deben conservar un ancho de lectura razonable. |
| Monitor amplio / smart TV | 1600 px o más | Se prioriza lectura a distancia, límites de ancho y jerarquía; el contenido no debe pegarse a los bordes ni crecer sin control. |

Los cortes exactos pueden ajustarse con evidencia de dispositivos reales. La obligación no es obedecer un número aislado, sino conservar lectura, área táctil, jerarquía y scroll en cada nivel.

## 4. Contrato de transición

Cada cambio de pantalla debe cumplir estas reglas:

| Regla | Criterio de aceptación |
|---|---|
| Entrada gradual | La nueva pantalla aparece con una transición breve de opacidad y un desplazamiento vertical mínimo; no debe parpadear ni saltar desde una posición inesperada. |
| Consistencia | Android usa la transición nativa del Stack y web usa el velo/entrada visual de la aplicación; ambas deben sentirse parte del mismo producto. |
| Brevedad | La transición no debe impedir el trabajo. La referencia actual es aproximadamente un cuarto de segundo. |
| Continuidad | El cambio no debe mover el FAB, el área de acciones o el scroll de manera sorpresiva. |
| Estado de carga | Si los datos tardan, debe mostrarse una señal de carga en el lugar de contenido, no una pantalla vacía que parezca rota. |
| Estado vacío | Si no hay datos, debe explicarse qué significa el vacío y cuál es el siguiente paso. |
| Cierre de overlays | Selectores, modales y hojas deben entrar y salir suavemente, respetar safe areas y permitir desplazamiento interno sin cortar el footer. |

La implementación vigente se apoya en `app/_layout.tsx`, `src/composicion/resolvedorPantalla.tsx` y `src/ui/bloques/TransicionPantalla.tsx` [1] [2] [3].

## 5. Contrato de desplazamiento

Una pantalla debe tener un solo desplazamiento principal por región. No se debe obligar a la persona a descubrir accidentalmente si debe desplazar toda la pantalla, una tarjeta interna o un modal. Los encabezados y áreas de acción deben permanecer visibles cuando su desaparición impida entender o confirmar una acción.

En el Mesero, la selección de mesas y el pedido pueden compartir pantalla en superficies amplias; en superficies estrechas se acepta una disposición vertical, pero la persona debe poder pasar de mesas a pedido sin que la barra inferior tape el contenido. Los selectores de categorías pueden desplazarse horizontalmente; los productos y variantes deben desplazarse verticalmente [4] [5] [6] [7].

En Administrador, la tablet es el escenario base. Las pantallas pueden usar paneles y barras de resumen, pero deben conservar un margen visible alrededor del contenido y no depender de un móvil para leer tablas densas o controles complejos [8].

## 6. Contrato de interacción visual

Todo botón debe conservar un área táctil clara, una diferencia visible entre estado normal, presionado, deshabilitado y ocupado, y un texto que explique la acción. Los hallazgos de comportamiento incorrecto de botones se registran en la auditoría y no se consideran resueltos por una animación estética.

Los cambios de contenido que alteran la altura de una región —por ejemplo, la aparición del total del pedido, el cambio de botones o el paso de variantes— deben suavizar su entrada para que la pantalla no “brinque” [5] [7]. La animación no debe esconder un error ni retrasar una acción urgente.

## 7. Criterios antes de declarar una pantalla final

Una pantalla se considera lista solo cuando cumple simultáneamente estas condiciones:

| Criterio | Pregunta de verificación |
|---|---|
| Lectura | ¿Se entiende qué pantalla es y qué está pasando sin adivinar? |
| Acomodo | ¿Los elementos respiran y no se enciman en su dispositivo objetivo? |
| Desplazamiento | ¿El contenido completo se puede alcanzar con un scroll predecible? |
| Transición | ¿La entrada y salida se sienten suaves, breves y consistentes? |
| Estados | ¿Loading, vacío, error, presionado y deshabilitado tienen representación visible? |
| Orientación | ¿La tablet vertical y horizontal conservan una composición útil? |
| Distancia | ¿Laptop, monitor y smart TV mantienen texto y controles legibles sin estiramiento excesivo? |
| Validación | ¿Se verificó el runtime con una sesión real, no solo el TypeScript y el export? |

## 8. Declaración sobre Administrador y móvil

El rol Administrador **puede utilizarse en un móvil**, pero esa posibilidad no constituye el objetivo de calidad del producto. La pantalla administrativa está concebida como una consola de configuración y supervisión, por lo que su experiencia de referencia es una tablet; también debe conservar buena legibilidad en laptop, computadora, monitor y smart TV.

El producto no debe sacrificar la experiencia de tablet o escritorio para forzar que cada panel administrativo quepa en un móvil pequeño. Si se requiere una edición móvil de Administrador, debe tratarse como una adaptación de producto separada, con decisiones propias de navegación, densidad y controles.

## 9. Referencias internas

[1]: ../../../../../app/_layout.tsx "Layout raíz y transición global"
[2]: ../../../../../src/composicion/resolvedorPantalla.tsx "Resolvedor de pantallas"
[3]: ../../../../../src/ui/bloques/TransicionPantalla.tsx "Transición visual de pantallas"
[4]: ../../../../../src/ui/bloques/TablesGrid.tsx "Grid de mesas del Mesero"
[5]: ../../../../../src/ui/bloques/ActionArea.tsx "Área de acciones del Mesero"
[6]: ../../../../../src/ui/bloques/ProductPickerOverlay.tsx "Selector de productos"
[7]: ../../../../../src/ui/bloques/VariantsModal.tsx "Selector de variantes"
[8]: ../../../../../src/ui/roles/administrador/mesas/PantallaMesas.tsx "Pantalla administrativa de Mesas"
