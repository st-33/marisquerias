# INSTRUCCION: ESTADOS VISUALES Y RETROALIMENTACION

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 04

## ORIGEN

- Terminos: ESTADO VISUAL, MENSAJE VISUAL, NOTIFICACION TEMPORAL, RETROALIMENTACION CAMPO, VALIDACION VISUAL, ESTADO VACIO.
- Formulas: campo_de_entrada_visual + estado_visual = retroalimentacion_campo; mensaje_visual + duracion_visual = notificacion_temporal.
- Reglas: INTERACCION.
- Fuente real: `DESIGN.md` seccion 9.

## CONTRATO DE ESTADOS DE SISTEMA (TABLA CANONICA)

| Estado | Mensaje esperado | Accion posible |
| --- | --- | --- |
| cargando | "Cargando [contenido]..." | Cancelar solo si la operacion lo permite |
| vacio_inicial | Explicacion breve del contexto | Crear, agregar o cambiar periodo |
| sin_coincidencias | "No encontramos resultados con estos filtros." | Limpiar filtros |
| offline | "Sin conexion. Los cambios quedaran pendientes." | Ver pendientes / reintentar |
| error_recuperable | Que fallo y por que importa | Reintentar o alternativa segura |
| permiso_insuficiente | Que rol puede ejecutar la accion | Volver o solicitar autorizacion |
| exito | Que quedo hecho | Continuar; consultar comprobante |
| pendiente | Que se guardo localmente o espera dispositivo | Ver estado, reintentar, cancelar si es seguro |

## PASO 01: CONTRATO DE ESTADOS DE SISTEMA

### ESPECIFICACION

- Toda pantalla de datos contempla los 8 estados de la tabla.
- Ninguno puede omitirse: un estado sin accion es un vacio de contrato.

## PASO 02: RETROALIMENTACION DE CAMPO

### ESPECIFICACION

- Todo formulario declara su validacion visual y su formulario cerrado antes del envio.
- Estados de campo: empty, focused, filled, invalid, disabled.

## PASO 03: MENSAJES Y NOTIFICACIONES

### ESPECIFICACION

- Todo mensaje visual declara su duracion visual y su cierre visual.
- Los avisos no desaparecen tan rapido que impidan entender que ocurrio.

## PASO 04: ESTADOS VACIOS

### ESPECIFICACION

- Estado vacio explica por que no hay datos y que hacer: sin datos, sin conexion, filtro sin coincidencias.

## PASO 05: CONSERVACION DE CONTEXTO

### ESPECIFICACION

- Nunca borrar el contexto de una venta/pedido para mostrar un error.
- Formularios conservan datos editables cuando sea seguro; diferencian "no guardado", "guardado pendiente", "guardado confirmado".

## CONTRATO DE SALIDA

- Ningun callejon sin salida: todo estado tiene texto + accion de recuperacion; el usuario siempre sabe si la operacion quedo aplicada, pendiente o rechazada.
