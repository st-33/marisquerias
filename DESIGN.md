# Marisquerías — DESIGN.md

> Documento de dirección de diseño para el ecosistema operativo de una marisquería: punto de venta, cocina, mesas, inventario, dispositivos y reparto.

**Estado:** propuesta base lista para implementación gradual  
**Versión:** 1.0  
**Autoría:** Manus AI  
**Ámbito:** aplicación Expo/React Native + Firebase RTDB, rama `rama-2`  
**Última revisión:** 2026-09-03

## 1. Propósito del documento

Este documento define el aspecto, el lenguaje visual y la experiencia de usuario deseados para Marisquerías. Su función es servir como contrato común para diseño, producto e implementación: una pantalla nueva debe sentirse parte del mismo sistema aunque pertenezca a Administrador, Mostrador, Mesero, Cocina o Reparto.

Marisquerías no es una demo de restaurante ni un panel administrativo genérico. Es una herramienta de operación en tiempo real, usada durante trabajo físico, con presión de tiempo, manos ocupadas, conectividad imperfecta y consecuencias reales si una venta, comanda, impresión o movimiento de inventario se duplica o se pierde. La interfaz debe priorizar **claridad operativa, confianza y recuperación** antes que decoración.

La dirección visual parte de los bloques y roles existentes en el repositorio y acompaña la ruta de producto: estabilizar ventas, mesas, cocina, inventario, impresión, báscula, sincronización e aislamiento por negocio antes de ampliar la visión futura del ecosistema.[^1][^2]

## 2. Declaración de diseño

> **Marisquerías convierte el movimiento de un restaurante en decisiones claras:** qué está pasando, qué necesita atención y cuál es la siguiente acción segura.

La experiencia debe transmitir un establecimiento de mar y oficio sin caer en clichés náuticos. La marca puede tener carácter, brillo y profundidad; la operación, en cambio, debe permanecer sobria, legible y predecible. El sistema visual se comporta como un **puesto de mando cálido**: superficies oscuras que reducen deslumbramiento, acentos de coral y dorado para jerarquizar, y señales azules o turquesa para comunicar actividad, conectividad y frescura.

## 3. Principios no negociables

| Principio                        | Aplicación concreta                                                                                               | Señal de cumplimiento                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **La operación manda**           | La acción principal de cada pantalla debe ser visible sin explorar menús secundarios.                             | Una persona nueva identifica qué hacer en menos de cinco segundos.      |
| **Cada estado se explica**       | Loading, vacío, error, desconectado, pendiente y éxito tienen texto y acción de recuperación.                     | Nunca aparece un botón que parezca funcionar pero no haga nada.         |
| **Una acción, una consecuencia** | Confirmar venta, enviar comanda, imprimir y registrar inventario muestran resultado explícito.                    | El usuario sabe si la operación quedó aplicada, pendiente o rechazada.  |
| **El rol reduce ruido**          | Cada rol ve sus tareas y permisos, no una copia completa del sistema.                                             | La interfaz no obliga a atravesar capacidades que el rol no puede usar. |
| **El dato crítico respira**      | Totales, estados de comanda, mesa, peso y stock tienen espacio y contraste propios.                               | Los datos de riesgo no se esconden dentro de texto auxiliar.            |
| **La estética no rompe el POS**  | Animación, textura, sonido y brillo siempre son secundarios a lectura y velocidad.                                | Se puede completar el flujo con movimiento reducido y sin audio.        |
| **Recuperar es parte del flujo** | Reintentar, cancelar, volver a editar y consultar pendientes son acciones de primera clase.                       | Un fallo no termina en un callejón sin salida.                          |
| **Privacidad por defecto**       | La identidad del negocio y el tenant se mantienen visibles en contextos sensibles sin exponer datos innecesarios. | Un usuario puede verificar que opera en el negocio correcto.            |

## 4. Personalidad de marca y tono

La personalidad es **marina, artesanal, confiable y resolutiva**. “Marina” aporta frescura y profundidad; “artesanal” evita que el producto parezca una banca fría; “confiable” guía los estados y confirmaciones; “resolutiva” impide que la identidad visual se convierta en espectáculo.

El texto de interfaz debe ser directo y humano. Se prefieren verbos de acción como **Agregar**, **Enviar comanda**, **Cobrar**, **Reintentar**, **Ver pendientes** y **Cancelar lectura**. Se evita el lenguaje técnico dirigido al personal, como `tenant`, `RTDB`, `adapter`, `legacy` o `fierros`; cuando el producto se refiere a hardware, el nombre público es **Dispositivos**.[^1]

| Situación         | Escribir                                             | Evitar              |
| ----------------- | ---------------------------------------------------- | ------------------- |
| Éxito             | “Venta registrada”                                   | “Operación exitosa” |
| Pendiente         | “Guardado pendiente de conexión”                     | “Sync pending”      |
| Error recuperable | “No se pudo imprimir. Reintentar”                    | “Error 500”         |
| Permiso           | “Esta acción requiere autorización de Administrador” | “Access denied”     |
| Sin datos         | “Aún no hay ventas en este periodo”                  | “Sin resultados”    |
| Estado de cocina  | “En preparación”                                     | “Processing”        |

## 5. Dirección visual

### 5.1. Atmósfera

La base visual utiliza fondos profundos, superficies elevadas y acentos luminosos. El fondo no es negro puro: debe permitir separar capas y conservar contraste en ambientes oscuros. Los degradados y transparencias se reservan para el shell, los encabezados y las acciones de marca; las tarjetas de datos deben mantener una superficie suficientemente estable para lectura rápida.

La referencia visual existente incluye `LiquidBackground`, `AtmosphereLayer`, `BrandSeal`, `OrbButton`, `StickerLayer` y controles de presión animados. Estos elementos pueden conservarse como lenguaje de marca, pero deben subordinarse a una jerarquía común de superficies, estados y espaciado.[^3]

### 5.2. Paleta semántica

Los valores siguientes son la dirección de diseño. La implementación debe consolidarlos en un único origen de verdad y evitar colores aislados dentro de las pantallas. Los colores se usan por **significado**, no como decoración.

| Token             |  Valor de referencia | Uso                                         | No usar para                |
| ----------------- | -------------------: | ------------------------------------------- | --------------------------- |
| `fondo.canvas`    |            `#07131A` | Fondo principal en modo oscuro              | Texto o iconos finos        |
| `fondo.surface`   |            `#0E2028` | Tarjetas y paneles                          | Fondos de pantalla completa |
| `fondo.elevated`  |            `#15313B` | Modal, menú, superficie activa              | Mensajes de error           |
| `texto.primary`   |            `#F4F7F6` | Títulos, totales, acciones                  | Texto auxiliar extenso      |
| `texto.secondary` |            `#A9BEC2` | Metadatos, etiquetas y ayuda                | Información crítica única   |
| `marca.coral`     |            `#F26B5E` | CTA principal, marca y calor                | Estado de error por sí solo |
| `marca.dorado`    |            `#C5A059` | Sello, rol Administrador, énfasis premium   | Alertas urgentes            |
| `estado.info`     |            `#34C5D5` | Conectividad, lectura de báscula, actividad | Confirmación definitiva     |
| `estado.success`  |            `#55C58A` | Guardado, cobro, impresión completada       | Acción primaria permanente  |
| `estado.warning`  |            `#F2B85B` | Pendientes, stock bajo, atención            | Error bloqueante            |
| `estado.danger`   |            `#E96A68` | Error, cancelación destructiva, pérdida     | Decoración                  |
| `borde.subtle`    |            `#24434D` | Separación de superficies                   | Contornos de alto énfasis   |
| `overlay.scrim`   | `rgba(0, 0, 0, .62)` | Modal y foco                                | Fondo habitual              |

**Regla de contraste.** Todo texto esencial debe conservar contraste suficiente contra su superficie; la combinación coral/dorado se reserva para elementos grandes o de énfasis y nunca sustituye una etiqueta textual de estado. El significado no debe depender únicamente del color: cada badge de estado incorpora texto, icono o ambos.

### 5.3. Tipografía

La tipografía debe ser sans serif, abierta y robusta en pantallas pequeñas. La jerarquía usa peso y tamaño, no mayúsculas constantes ni sombras fuertes.

| Nivel              | Tamaño orientativo |    Peso | Uso                                     |
| ------------------ | -----------------: | ------: | --------------------------------------- |
| Display            |           32–40 px |     700 | Bienvenida, total excepcional, marca    |
| Título de pantalla |           24–28 px |     700 | “Inventario”, “Cocina”, “Ventas de hoy” |
| Título de sección  |           18–20 px |     700 | Grupos de tarjetas y paneles            |
| Cuerpo             |              16 px | 400–500 | Descripción y contenido operativo       |
| Etiqueta           |           12–14 px |     600 | Campos, badges y metadatos              |
| Auxiliar           |       12 px mínimo |     400 | Ayuda, timestamp y explicación          |
| Dato numérico      |           24–32 px |     700 | Precio, peso, cantidad, KPI             |

Los precios, pesos, cantidades y totales deben usar cifras tabulares cuando la plataforma lo permita. Las etiquetas de producto se mantienen en español y con capitalización natural. El uso de cursiva, texto condensado o etiquetas rotadas queda fuera de la dirección base.

### 5.4. Espaciado, forma y profundidad

El sistema usa una escala de ocho puntos: `4`, `8`, `12`, `16`, `24`, `32` y `40` px. Las tarjetas operativas suelen usar `16` px de padding; los módulos principales, `24` px; los grupos de controles, separación mínima de `12` px.

| Elemento               |    Radio | Profundidad                 |
| ---------------------- | -------: | --------------------------- |
| Campo y botón compacto | 10–12 px | Sin sombra o sombra mínima  |
| Tarjeta operativa      |    16 px | Elevación baja, borde sutil |
| Modal y panel flotante | 20–24 px | Scrim + elevación media     |
| Orb o sello de marca   |      50% | Brillo controlado           |
| Chip/badge             |   999 px | Sin sombra                  |

Los bordes redondeados expresan cercanía y tactilidad; no deben convertir una tabla o una lista en una colección de burbujas sin jerarquía. El brillo pertenece a la acción y al estado activo, no a todos los componentes simultáneamente.

## 6. Arquitectura de experiencia

La aplicación debe conservar una estructura mental estable:

1. **Identidad:** negocio activo, rol y estado de conexión.
2. **Contexto:** pantalla, mesa, canal, periodo o comanda actual.
3. **Trabajo:** lista o formulario principal.
4. **Decisión:** acción primaria y consecuencias visibles.
5. **Confirmación:** resultado, pendiente o recuperación.

El shell compartido debe incluir una cabecera breve con nombre de pantalla, contexto operativo y señal de conectividad. La navegación no debe ocultar una venta o comanda en curso sin advertencia. Los overlays se cierran con gesto o botón visible, mantienen el foco dentro del diálogo y no deben depender exclusivamente de `zIndex` fijo; su coordinación debe ser explícita y testeable.[^2]

## 7. Experiencia por rol

| Rol               | Objetivo principal                               | Pantalla inicial      | Acción dominante               | Datos que deben permanecer visibles            |
| ----------------- | ------------------------------------------------ | --------------------- | ------------------------------ | ---------------------------------------------- |
| **Administrador** | Supervisar el negocio y configurar su operación. | Resumen de operación. | Abrir módulo o revisar alerta. | Negocio activo, ventas, alertas y permisos.    |
| **Mostrador**     | Registrar y cobrar ventas rápidas.               | Venta de mostrador.   | Agregar producto / cobrar.     | Carrito, total, método de pago y pendientes.   |
| **Mesero**        | Tomar pedidos y operar mesas.                    | Mapa/lista de mesas.  | Abrir mesa / enviar comanda.   | Mesa, productos, notas y estado del pedido.    |
| **Cocina**        | Preparar y despachar comandas.                   | Cola de cocina.       | Marcar estado de preparación.  | Número, tiempo, prioridad y líneas del pedido. |
| **Reparto**       | Coordinar pedidos fuera del salón.               | Pedidos de reparto.   | Asignar / actualizar entrega.  | Dirección operativa, estado y responsable.     |

### 7.1. Administrador

Administrador necesita densidad informativa, pero no una pared de KPIs. La pantalla inicia con un resumen de ventas y alertas que conduzcan a una acción. Los módulos de Menú, Inventario, Mesas, Dispositivos y ADI Repart deben aparecer como entradas claras, con un estado breve cuando exista algo que revisar. El lenguaje público debe ser de operación y no de implementación.

### 7.2. Mostrador

Mostrador es el flujo de mayor velocidad. La pantalla se divide en **selección**, **detalle de venta** y **cierre**. El carrito permanece visible mientras se agregan productos; el total debe estar anclado en una zona de fácil alcance. Para productos por peso, la lectura debe mostrar peso, unidad, estabilidad y error. Si la báscula no está disponible, la interfaz debe ofrecer entrada manual o cancelación explícita, nunca simular una lectura.[^2]

### 7.3. Mesero

Mesero comienza por la mesa y termina en una comanda enviada o una cuenta solicitada. Las mesas comunican estado con texto y señal visual: libre, ocupada, pendiente, cuenta solicitada o bloqueada. La selección de productos usa tarjetas compactas con variante, cantidad y notas sin desplazar la confirmación fuera de contexto.

### 7.4. Cocina

Cocina prioriza lectura a distancia y velocidad de escaneo visual. Cada comanda muestra número, mesa o canal, tiempo transcurrido y líneas agrupadas. Los estados avanzan de forma inequívoca: **recibida → en preparación → lista → entregada**. Un pedido duplicado o una pérdida de red debe mostrar una señal de reconciliación, no crear una segunda tarjeta indistinguible.

### 7.5. Reparto

Reparto debe tratar el estado de entrega como una secuencia de trabajo, no como una ficha administrativa: pendiente, asignado, en camino, entregado o incidencia. Las acciones destructivas o irreversibles solicitan confirmación y explican el efecto.

## 8. Componentes y contratos visuales

| Componente              | Responsabilidad                                          | Estados mínimos                                               |
| ----------------------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| **Botón primario**      | Ejecutar la acción principal del contexto.               | Normal, pressed, loading, disabled, success/error.            |
| **Botón secundario**    | Acción alternativa o de navegación.                      | Normal, pressed, disabled.                                    |
| **Campo**               | Capturar un dato editable.                               | Empty, focused, filled, invalid, disabled.                    |
| **Tarjeta de producto** | Mostrar producto, precio, variante y acción.             | Disponible, agotado, seleccionado, error.                     |
| **Tarjeta de comanda**  | Representar una unidad de trabajo de cocina.             | Recibida, preparación, lista, entregada, pendiente.           |
| **Badge**               | Comunicar estado breve.                                  | Informativo, éxito, advertencia, peligro, neutral.            |
| **Modal/overlay**       | Editar, confirmar o mostrar detalle sin perder contexto. | Abierto, cargando, error, cerrado.                            |
| **FAB/orb**             | Acceso rápido a una acción realmente disponible.         | Visible, pressed, expandido, dismiss, disabled/no disponible. |
| **Empty state**         | Explicar por qué no hay datos y qué hacer.               | Sin datos, sin conexión, filtro sin coincidencias.            |
| **Banner de conexión**  | Hacer visible el estado de sincronización.               | Conectado, reconectando, offline, pendiente.                  |

Una acción no disponible debe ocultarse si no aporta contexto o mostrarse deshabilitada con motivo y alternativa. Quedan prohibidos los `onPress` vacíos o los controles que parecen interactivos sin producir una consecuencia comunicada.[^3]

## 9. Estados de sistema

El estado es parte del diseño, no una excepción técnica. Toda pantalla de datos debe contemplar el siguiente contrato:

| Estado               | Mensaje esperado                                 | Acción posible                                 |
| -------------------- | ------------------------------------------------ | ---------------------------------------------- |
| Cargando             | “Cargando [contenido]…”                          | Cancelar solo si la operación lo permite.      |
| Vacío inicial        | Explicación breve del contexto.                  | Crear, agregar o cambiar periodo.              |
| Sin coincidencias    | “No encontramos resultados con estos filtros.”   | Limpiar filtros.                               |
| Offline              | “Sin conexión. Los cambios quedarán pendientes.” | Ver pendientes / reintentar.                   |
| Error recuperable    | Qué falló y por qué importa.                     | Reintentar o volver a una alternativa segura.  |
| Permiso insuficiente | Qué rol puede ejecutar la acción.                | Volver o solicitar autorización.               |
| Éxito                | Qué quedó hecho.                                 | Continuar; consultar comprobante si aplica.    |
| Pendiente            | Qué se guardó localmente o espera dispositivo.   | Ver estado, reintentar, cancelar si es seguro. |

El sistema nunca debe borrar el contexto de una venta o pedido para mostrar un error. Los formularios conservan los datos editables cuando sea seguro hacerlo y diferencian entre “no guardado”, “guardado pendiente” y “guardado confirmado”.

## 10. Movimiento, sonido y feedback háptico

La animación comunica causa y efecto. Las transiciones de pantalla deben ser breves y discretas; la presión de un botón puede usar escala ligera y halo corto. Un feedback exitoso puede apoyarse en microanimación, sonido o háptica, pero nunca depender de uno solo.

| Feedback         | Duración orientativa | Uso                                       |
| ---------------- | -------------------: | ----------------------------------------- |
| Press/release    |           100–200 ms | Confirmar tacto.                          |
| Cambio de estado |           180–280 ms | Mostrar avance de tarjeta o badge.        |
| Entrada de modal |           220–320 ms | Conservar orientación espacial.           |
| Éxito            |         Hasta 500 ms | Celebrar sin interrumpir el ritmo.        |
| Error            |  Sin rebote agresivo | Llamar la atención con texto y contraste. |

Debe respetarse la preferencia de movimiento reducido. El sonido se reserva para eventos operativos útiles, como recepción de comanda o confirmación de una acción, y debe poder silenciarse. La animación nunca bloquea una acción crítica ni retrasa el registro de una venta.

## 11. Accesibilidad y uso en el establecimiento

Los objetivos táctiles deben ser cómodos para uso rápido y, cuando el control lo permita, no menores de aproximadamente 44 × 44 puntos. El foco debe ser visible en web y teclado; el orden de lectura debe seguir el orden de la tarea. Iconos sin etiqueta accesible quedan fuera de la definición de terminado.

La interfaz debe funcionar con luz variable, reflejos y atención dividida. El dato importante se expresa con texto, posición y forma además de color. Los números críticos no deben depender de un gráfico; las tablas y listas deben mantener una alternativa legible. Los avisos no deben desaparecer tan rápido que impidan entender qué ocurrió.

## 12. Responsive y plataformas

El diseño comparte tokens y semántica entre Android, iOS y web, pero no fuerza una geometría idéntica. En teléfono se prioriza alcance con una mano y una acción principal persistente; en tablet y web se aprovecha la anchura para separar selección, detalle y supervisión. Las listas pueden convertirse en rejillas cuando la densidad mejore sin reducir el tamaño táctil.

| Contexto            | Prioridad de composición                                           |
| ------------------- | ------------------------------------------------------------------ |
| Teléfono vertical   | Una columna, CTA accesible, resumen anclado.                       |
| Teléfono horizontal | Dos zonas cuando el flujo lo justifique, sin esconder el total.    |
| Tablet              | Panel de trabajo + detalle o cola operativa.                       |
| Web                 | Navegación lateral/compacta, tablas y paneles comparables.         |
| Offline             | Mantener lectura y captura local; hacer visible la cola pendiente. |

## 13. Qué no hacer

No introducir un nuevo kit visual completo para resolver una sola pantalla. No mezclar tema estático con tema dinámico. No utilizar degradados, glassmorphism o brillos como sustituto de jerarquía. No ocultar un fallo detrás de un toast efímero. No deshabilitar silenciosamente una acción. No cambiar la semántica de venta, pedido, inventario o impresión para conseguir una apariencia distinta. No presentar capacidades futuras —agentes, automatización física, predicciones o aplicaciones hermanas— como si ya estuvieran disponibles.[^1][^2]

## 14. Criterios de implementación

La evolución visual debe ser incremental y verificable. El orden recomendado es consolidar tema y tokens, eliminar no-op visibles, normalizar feedback, extraer primitives compartidas y probar overlays en una pantalla aislada antes de ampliar dependencias.[^2]

Antes de considerar terminada una pantalla, el equipo debe poder responder afirmativamente a estas preguntas:

- ¿Se entiende el rol, negocio y contexto activo?
- ¿Existe una acción principal inequívoca?
- ¿Todos los controles tienen consecuencia visible o motivo de indisponibilidad?
- ¿Se contemplan carga, vacío, error, offline, pendiente y éxito?
- ¿Los datos críticos conservan contraste y no dependen solo del color?
- ¿La pantalla se puede usar con movimiento reducido y sin sonido?
- ¿La operación se conserva si falla la red o el dispositivo?
- ¿La solución reutiliza tokens y primitives en lugar de añadir estilos aislados?
- ¿Se validó el flujo sin alterar la semántica de negocio?

## 15. Mapa de adopción

| Horizonte        | Entregable visual                                                                | Evidencia de salida                                        |
| ---------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Ahora**        | Tema único, tokens, estados y feedback de venta, mesas, cocina e inventario.     | Flujos críticos legibles y recuperables.                   |
| **Siguiente**    | Primitives compartidas, overlays controlados, tablas y formularios consistentes. | Componentes reutilizados en más de un rol.                 |
| **Después**      | Contratos visuales para dispositivos, reparto, histórico y capacidades futuras.  | Estados versionados y permisos explícitos.                 |
| **Experimental** | Automatización física y superficies contextuales.                                | Hardware/simulador, límites de seguridad y apagado seguro. |

## Referencias

[^1]: [Ecosistema Marisquerías — visión y clasificación de capacidades](docs/vision/ecosistema_marisquerias.md).

[^2]: [Ruta de producto funcional — flujos, estados y orden de evolución](docs/planes/ruta_producto_funcional.md).

[^3]: [Auditoría visual recalibrada — hallazgos y orden recomendado](docs/auditorias/auditoria_visual_recalibrada_2026-08-21.md).
