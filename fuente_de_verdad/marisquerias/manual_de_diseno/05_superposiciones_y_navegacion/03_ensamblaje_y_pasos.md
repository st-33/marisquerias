# ENSAMBLAJE Y PASOS: SUPERPOSICIONES Y NAVEGACION
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

Pasos normativos de construcción visual del subsistema
`05_superposiciones_y_navegacion`. Cada paso hace referencia a los contratos
definidos en `02_contratos_y_tipos.md` (secciones indicadas entre paréntesis).
El objetivo es que modales, transiciones y navegación se muevan rápido, respeten
al usuario y jamás pongan en riesgo una venta en curso.

## PASO 01: Construir superposiciones y modales

### ESPECIFICACION
- Se construye el modal respetando las reglas del contrato (sección 2): cierre
  con gesto o botón visible, y foco contenido en el diálogo.
- El modal usa el radio 20-24 y el scrim con media de elevación definidos en
  fundamentos, y la coordinación explícita es testeable sin depender de un
  `zIndex` fijo (sección 2).
- Se aplica `superposicion + cierre_visual = flujo_temporal_visual`: la capa
  aparece encima sin cerrar la pantalla de fondo, y volver restaura el contexto.
- Condición de terminado: abrir y cerrar una capa (elegir salsa, confirmar
  cobro) regresa exactamente donde se estaba, con el carrito visible debajo.

## PASO 02: Aplicar las duraciones canónicas de transición

### ESPECIFICACION
- Se aplican las duraciones exactas del contrato (sección 1): `press_release`
  100-200 ms, `cambio_estado` 180-280 ms, `entrada_modal` 220-320 ms, `exito`
  ≤ 500 ms, `error` sin rebote agresivo.
- Cada movimiento indica a dónde se va (adelante, atrás, abrir o cerrar); el
  movimiento acompaña a la acción y nunca la retrasa.
- Se aplica `pantalla + transicion_visual = navegacion_visual` (sección 3) para
  los cambios de pantalla.
- Condición de terminado: ninguna transición excede su duración canónica y
  ninguna animación bloquea una acción crítica.

## PASO 03: Coordinar sonido y háptica

### ESPECIFICACION
- La retroalimentación háptica/sonora acompaña los hitos críticos (pago
  confirmado, pedido enviado a cocina, cobro exitoso) alineada con las
  duraciones canónicas de la sección 1.
- El sonido y la háptica son refuerzos, nunca la única señal: el significado
  sigue visible por texto, posición y forma además de color y vibración.
- Condición de terminado: con el sonido silenciado o sin háptica, el usuario
  entiende igualmente el resultado de su acción.

## PASO 04: Garantizar la accesibilidad

### ESPECIFICACION
- Todo objetivo táctil mide **≥ 44×44 px** (sección 4); el foco es visible en
  web y con teclado.
- El dato importante se transmite con texto + posición + forma, además de color;
  un icono sin etiqueta accesible queda **fuera** de la definición de terminado.
- Se respeta el movimiento reducido: con la opción activa, las animaciones se
  minimizan o eliminan y se conserva solo el cambio de contenido.
- Condición de terminado: nada imprescindible depende del movimiento y ningún
  control queda por debajo del tamaño mínimo táctil.

## PASO 05: Componer los 4 contextos responsive

### ESPECIFICACION
- Se aplican los 4 contextos del contrato (sección 3): teléfono vertical (una
  columna, CTA accesible, resumen anclado), tablet (panel de trabajo + detalle),
  web (navegación lateral + tablas) y offline (lectura y captura local con cola
  pendiente visible).
- En cada contexto se conserva el shell y la cabecera del subsistema de
  pantallas, adaptando solo la disposición.
- Condición de terminado: la misma pantalla funciona en los 4 contextos sin
  perder el dato crítico ni el acceso a la acción dominante.

## PASO 06: Verificar las reglas de navegación

### ESPECIFICACION
- Se verifican las dos reglas de navegación: respetar el movimiento reducido y
  que la navegación **nunca** oculta una venta en curso (sección 4 y reglas de
  concepto).
- Moverse entre secciones, abrir un menú o un reporte deja la venta abierta,
  disponible y visible para retomarse, sin perder carrito, mesa ni total.
- Condición de terminado: los 6 pasos quedan aplicados y una venta abierta
  sobrevive a cualquier superposición, transición o cambio de pantalla.
