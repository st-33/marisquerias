# INSTRUCCION: SUPERPOSICIONES, NAVEGACION Y RESPONSIVE

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 05

## ORIGEN

- Terminos: SUPERPOSICION, TRANSICION VISUAL, NAVEGACION VISUAL, UNIDAD NAVEGABLE, MODAL, GESTO, FLUJO TEMPORAL VISUAL.
- Formulas: pantalla + transicion_visual = navegacion_visual; superposicion + cierre_visual = flujo_temporal_visual.
- Reglas: INTERACCION (rubro en reglas_diseno.md).
- Fuente real: `DESIGN.md` secciones 10, 11 y 12, y `src/ui/bloques/TransicionPantalla.tsx`.

## PASO 01: SUPERPOSICIONES Y MODALES

### ESPECIFICACION

- Las superposiciones se cierran con gesto o boton visible y mantienen el foco dentro del dialogo.
- La coordinacion de overlays es explicita y testeable; no depende exclusivamente de zIndex fijo.

## PASO 02: TRANSICIONES Y MOVIMIENTO

### ESPECIFICACION

- Press/release 100-200 ms; cambio de estado 180-280 ms; entrada de modal 220-320 ms; exito hasta 500 ms; error sin rebote agresivo.
- Se respeta la preferencia de movimiento reducido; la animacion nunca bloquea una accion critica ni retrasa el registro de una venta.

## PASO 03: SONIDO Y FEEDBACK HAPTICO

### ESPECIFICACION

- El sonido se reserva para eventos operativos utiles (recepcion de comanda, confirmacion de accion) y debe poder silenciarse.
- El feedback exitoso puede apoyarse en microanimacion, sonido o haptica, sin depender de uno solo.

## PASO 04: ACCESIBILIDAD

### ESPECIFICACION

- Los objetivos tactiles no bajan de aproximadamente 44x44 puntos; el foco es visible en web y teclado.
- El dato importante se expresa con texto, posicion y forma ademas de color; los iconos sin etiqueta accesible quedan fuera de la definicion de terminado.

## PASO 05: RESPONSIVE Y PLATAFORMAS

### ESPECIFICACION

- El diseno comparte tokens y semantica entre Android, iOS y web sin forzar geometria identica.
- Telefono: una columna, CTA accesible, resumen anclado; tablet: panel de trabajo + detalle; web: navegacion lateral y tablas; offline: lectura y captura local con cola pendiente visible.
