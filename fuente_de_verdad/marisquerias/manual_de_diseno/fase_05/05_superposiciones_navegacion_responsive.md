# INSTRUCCION: SUPERPOSICIONES, NAVEGACION Y RESPONSIVE

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 05

## ORIGEN

- Terminos: SUPERPOSICION, TRANSICION VISUAL, NAVEGACION VISUAL, UNIDAD NAVEGABLE, MODAL, GESTO, FLUJO TEMPORAL VISUAL.
- Formulas: pantalla + transicion_visual = navegacion_visual; superposicion + cierre_visual = flujo_temporal_visual.
- Codigo real: `src/ui/bloques/TransicionPantalla.tsx`, `src/compartido/componentes/ui/ModernAlert.tsx`.

## CONTRATO DE DURACIONES (VALORES EXACTOS)

```typescript
const duraciones = {
  press_release:   '100-200 ms',
  cambio_estado:   '180-280 ms',
  entrada_modal:   '220-320 ms',
  exito:           '<= 500 ms',
  error:           'sin rebote agresivo',
};
```

## PASO 01: SUPERPOSICIONES Y MODALES

### ESPECIFICACION

- Se cierran con gesto o boton visible; foco contenido dentro del dialogo.
- Coordinacion explicita y testeable; no depende de zIndex fijo.

## PASO 02: TRANSICIONES Y MOVIMIENTO

### ESPECIFICACION

- Duraciones de la tabla; transiciones de pantalla breves y discretas.
- Se respeta movimiento reducido; la animacion nunca bloquea una accion critica ni retrasa el registro de una venta.

## PASO 03: SONIDO Y HAPTICA

### ESPECIFICACION

- Sonido solo para eventos utiles (recepcion de comanda, confirmacion) y silenciable.
- Feedback exitoso: microanimacion, sonido o haptica; nunca depende de uno solo.

## PASO 04: ACCESIBILIDAD

### ESPECIFICACION

- Objetivos tactiles >= 44x44 px; foco visible en web y teclado.
- Dato importante con texto, posicion y forma ademas de color; icono sin etiqueta accesible queda fuera de definicion de terminado.
- Numeros criticos no dependen de un grafico; tablas/listas conservan alternativa legible.

## PASO 05: RESPONSIVE Y PLATAFORMAS

### ESPECIFICACION

- Tokens y semantica compartidos entre Android, iOS y web; geometria no identica forzada.
- Telefono vertical: una columna, CTA accesible, resumen anclado.
- Telefono horizontal: dos zonas si el flujo lo justifica, sin esconder el total.
- Tablet: panel de trabajo + detalle o cola operativa.
- Web: navegacion lateral/compacta, tablas y paneles comparables.
- Offline: lectura y captura local con cola pendiente visible.

## CONTRATO DE SALIDA

- Toda superposicion tiene cierre y foco; toda transicion respeta duraciones y movimiento reducido; toda pantalla es operable en offline con cola visible; la navegacion nunca oculta una venta en curso.
