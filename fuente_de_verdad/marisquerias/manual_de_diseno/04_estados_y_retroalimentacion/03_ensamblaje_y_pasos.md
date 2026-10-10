# ENSAMBLAJE Y PASOS: ESTADOS Y RETROALIMENTACION
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

Pasos normativos de construcción visual del subsistema
`04_estados_y_retroalimentacion`. Cada paso hace referencia a los contratos
definidos en `02_contratos_y_tipos.md` (secciones indicadas entre paréntesis).
El objetivo es que ninguna pantalla quede "muerta" o en blanco ante un estado
inesperado, y que el contexto de una venta nunca se pierda.

## PASO 01: Implementar el contrato de estados de sistema

### ESPECIFICACION
- Se construye un bloque de estado reutilizable que cubre los 8 estados de la
  tabla (sección 1): cargando, vacío_inicial, sin_coincidencias, offline,
  error_recuperable, permiso_insuficiente, éxito, pendiente.
- Cada estado entrega su **mensaje esperado** y su **acción posible** exactos de
  la tabla, sin variar el texto salvo el contenido dinámico entre corchetes.
- Condición de terminado: cualquier pantalla puede delegar a este bloque y
  obtener los 8 estados con mensaje + acción listos.

## PASO 02: Aplicar los 8 estados a toda pantalla de datos

### ESPECIFICACION
- Toda pantalla que muestra datos integra los 8 estados; **ninguno puede
  omitirse** (invariante 2). Se recorren cargando, vacío, sin coincidencias,
  offline, error recuperable, permiso insuficiente, éxito y pendiente.
- Cada estado usa la paleta semántica de fundamentos: `info` para cargando y
  conectividad, `warning` para pendiente, `danger` para error, `success` para
  éxito.
- Condición de terminado: no existe una pantalla de datos que se quede en
  blanco ante alguno de los 8 estados.

## PASO 03: Construir la retroalimentación de campo

### ESPECIFICACION
- Se aplican las composiciones del contrato (sección 2):
  `formulario + validacion_visual = formulario_cerrado`;
  `campo_de_entrada_visual + estado_visual = retroalimentacion_campo`.
- Cada campo refleja su estado (`empty`, `focused`, `filled`, `invalid`,
  `disabled`) con borde y mensaje, siempre acompañado de texto (no solo color).
- Condición de terminado: un error de validación se ve junto al campo que lo
  origina, sin desplazar ni ocultar el resto del formulario.

## PASO 04: Definir mensajes y notificaciones temporales

### ESPECIFICACION
- Se aplica `mensaje_visual + duracion_visual = notificacion_temporal`
  (sección 2), usando el componente `Toast` del subsistema de primitivos.
- Éxito y error se diferencian de "pendiente": se distingue siempre entre
  "no guardado", "guardado pendiente" y "guardado confirmado" (invariante 2).
- Condición de terminado: el mensaje confirma qué pasó (y qué hacer), y la
  duración no corta la lectura ni bloquea una acción crítica.

## PASO 05: Construir estados vacíos y conservar contexto

### ESPECIFICACION
- Cada estado vacío ("No encontramos resultados con estos filtros.", offline,
  vacío inicial) ofrece su acción correspondiente (limpiar filtros, ver
  pendientes/reintentar, crear/agregar) según la tabla (sección 1).
- Se verifica que **nunca** se borra el contexto de una venta/pedido para
  mostrar un error (invariante 2): el carrito, la mesa y el total permanecen
  intactos y visibles bajo cualquier aviso.
- Los formularios conservan los datos editables cuando sea seguro (invariante 2).
- Condición de terminado: un error en medio de una venta deja la venta
  retomable exactamente donde estaba.

## PASO 06: Verificar las invariantes de estados

### ESPECIFICACION
- Se comprueban las tres invariantes (sección 3): cobertura de los 8 estados,
  contexto de venta intacto ante errores, y la distinción "no guardado /
  guardado pendiente / guardado confirmado".
- Se prueba un flujo completo (crear venta → error de red → reintentar → éxito)
  y se confirma que en ningún punto se pierde el total ni el carrito.
- Condición de terminado: los 6 pasos quedan aplicados y el bloque de estados
  es reutilizable en todas las pantallas del sistema.
