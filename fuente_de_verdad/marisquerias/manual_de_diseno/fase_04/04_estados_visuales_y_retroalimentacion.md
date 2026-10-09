# INSTRUCCION: ESTADOS VISUALES Y RETROALIMENTACION

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 04

## ORIGEN

- Terminos: ESTADO VISUAL, MENSAJE VISUAL, NOTIFICACION TEMPORAL, RETROALIMENTACION CAMPO, VALIDACION VISUAL, ESTADO VACIO.
- Formulas: campo_de_entrada_visual + estado_visual = retroalimentacion_campo; mensaje_visual + duracion_visual = notificacion_temporal.
- Reglas: INTERACCION (rubro en reglas_diseno.md).
- Fuente real: `DESIGN.md` seccion 9.

## PASO 01: CONTRATO DE ESTADOS DE SISTEMA

### ESPECIFICACION

- Toda pantalla de datos contempla: cargando, vacio inicial, sin coincidencias, offline, error recuperable, permiso insuficiente, exito y pendiente.
- Cada estado tiene mensaje esperado y accion posible (reintentar, limpiar filtros, solicitar autorizacion).

## PASO 02: RETROALIMENTACION DE CAMPO

### ESPECIFICACION

- Todo formulario declara su validacion visual y su formulario cerrado antes del envio.
- El campo comunica su estado de validacion (empty, focused, filled, invalid, disabled).

## PASO 03: MENSAJES Y NOTIFICACIONES

### ESPECIFICACION

- Todo mensaje visual declara su duracion visual y su cierre visual.
- Los avisos no desaparecen tan rapido que impidan entender que ocurrio.

## PASO 04: ESTADOS VACIOS

### ESPECIFICACION

- El estado vacio explica por que no hay datos y que hacer; cubre sin datos, sin conexion y filtro sin coincidencias.

## PASO 05: CONSERVACION DE CONTEXTO

### ESPECIFICACION

- El sistema nunca borra el contexto de una venta o pedido para mostrar un error.
- Los formularios conservan los datos editables cuando sea seguro y diferencian "no guardado", "guardado pendiente" y "guardado confirmado".
