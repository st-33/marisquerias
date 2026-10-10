# ENSAMBLAJE Y PASOS: FUNDAMENTOS DE MARCA
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

Pasos normativos de construcción visual del subsistema `01_fundamentos_de_marca`.
Cada paso hace referencia a los contratos definidos en `02_contratos_y_tipos.md`
(secciones indicadas entre paréntesis). El objetivo es que los valores exactos de
paleta, tipografía y forma queden consolidados en un único origen antes de usarse
en cualquier bloque o pantalla.

## PASO 01: Consolidar el origen único de tokens

### ESPECIFICACION
- Se crea un solo módulo o hoja de tokens que repite, **sin variaciones**, el
  objeto `paleta` del contrato (sección 1). Ningún color se declara "suelto" en
  otra parte.
- Todos los valores se expresan en su formato exacto: `#07131A`, `#0E2028`,
  `#15313B`, `#F4F7F6`, `#A9BEC2`, `#F26B5E`, `#C5A059`, `#34C5D5`, `#55C58A`,
  `#F2B85B`, `#E96A68`, `#24434D` y el scrim `rgba(0, 0, 0, .62)`.
- Condición de terminado: si un valor cambia, cambia en un solo lugar y se
  propaga al resto sin reescribir literales en las pantallas.

## PASO 02: Fijar la paleta semántica con roles no decorativos

### ESPECIFICACION
- Cada token se asigna a un **significado fijo** y no a un adorno: coral =
  acción principal, dorado = administración, azul (`info`) = conectividad,
  verde (`success`) = éxito, amarillo (`warning`) = advertencia, rojo
  (`danger`) = error (ver invariantes, sección 4).
- El fondo profundo (`fondo.canvas`, `fondo.surface`, `fondo.elevated`) y los
  textos (`texto.primary`, `texto.secondary`) quedan como base neutra; los
  acentos coral y dorado se reservan para lo principal y lo administrativo.
- Condición de terminado: ningún elemento de la interfaz usa un color fuera de
  este mapa, y cada color aparece solo en su significado.

## PASO 03: Verificar contraste sobre el fondo oscuro

### ESPECIFICACION
- Cada combinación texto/fondo cumple un contraste legible sobre la "noche
  marina": `texto.primary` (#F4F7F6) sobre `fondo.canvas` (#07131A) es la pareja
  de lectura por defecto; los acentos solo se usan con tamaño y peso suficientes
  (sección 2, inciso "KPI/Display" con peso 700).
- El dato crítico (precio, peso, total) usa contraste alto y **exclusivo**, sin
  compartir color ni tamaño con datos secundarios (invariante 4 y sección 3).
- Condición de terminado: ningún texto pequeño (≤14 px) se pinta con un acento
  de bajo contraste sobre el fondo profundo sin un respaldo legible.

## PASO 04: Aplicar la escala tipográfica de niveles

### ESPECIFICACION
- Se mapean los niveles de la tabla de la sección 2 a la interfaz, respetando
  rango y peso: Display 32-40/700, Titulo pantalla 24-28/700, Titulo seccion
  18-20/700, Cuerpo 16/400-500, Etiqueta 12-14/600, Auxiliar ≥12/400, KPI
  24-32/700.
- El KPI (precio, peso, cantidad, total) recibe su rango 24-32/700 y espacio
  propio, destacado por encima de los textos vecinos (invariante 4).
- Condición de terminado: no se introducen tamaños ni pesos fuera de estos
  rangos; cada texto declara su nivel de la escala.

## PASO 05: Aplicar la escala de 8 puntos y los radios

### ESPECIFICACION
- Todo espaciado (márgenes, padding, gaps) sale de la escala 8 puntos:
  `4, 8, 12, 16, 24, 32, 40 px` (sección 3).
- Los radios se asignan por tipo de pieza: campo/botón 10-12, tarjeta 16, modal
  20-24, orb/sello 50%, chip/badge 999 (sección 3). Cada forma usa el radio que
  le corresponde, sin mezclar arbitrariamente.
- La elevación queda acotada: campo sin sombra, tarjeta baja + borde sutil,
  modal scrim + media, orb brillo controlado, badge sin sombra.
- Condición de terminado: ningún valor de espaciado ni de radio se "inventa"
  fuera de la escala; la forma de cada pieza es predecible al combinar bloques.

## PASO 06: Verificar las invariantes de fundamentos

### ESPECIFICACION
- Antes de dar por terminado el subsistema se comprueban las invariantes
  (sección 4): ningún estilo fuera de la paleta; color por significado, no
  decoración; el significado nunca depende solo del color (badge con texto +
  icono); el KPI respira con contraste y espacio propios.
- Se recorre un caso representativo (tarjeta de producto, botón de cobrar, KPI
  de total) y se confirma que respeta paleta, contraste, tipografía y forma.
- Condición de terminado: los seis puntos de este archivo quedan aplicados y
  verificables en una sola lectura del origen de tokens.
