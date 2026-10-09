# ESTRUCTURA UNIDAD CENTRAL

- Alcance: Ecosistema
- Fecha: 2026-10-08

## IDENTIFICACION

- Nombre: Unidad Central
- Tipo: Base de datos en tiempo real (RTDB)
- Proyecto asociado: ecosistema-adi
- Capa: gobierno central
- Autoridad unica de escritura de gobierno: Torre de Control
- Autoridad de lectura general: Torre de Control · Torre de Monitoreo · aplicaciones del negocio

## PROPOSITO

Unidad Central es el registro canonico de gobierno del Ecosistema ADI APP. Contiene las entidades de gobierno, sus relaciones y la bitacora de operaciones. No contiene datos operativos de negocios ni giros particulares.

## NODOS RAIZ (10)

1. terminos
2. leyes
3. reglas
4. codigos_acceso
5. categorias_registradas
6. proyectos_registrados
7. negocios_registrados
8. dispositivos_registrados
9. clientes_registrados
10. bitacora_operaciones

---

## NODO terminos

- Alcance: Ecosistema
- Fecha: 2026-10-08

### PROPOSITO

Espejo consultable de los terminos canonicos del sistema.

### CAMPOS OBLIGATORIOS

- slug · identificador canonico del termino
- nombre_visible · nombre en formato humano
- definicion · texto atomico del termino
- alcance · valor dentro de: ecosistema, nicho, categoria, aplicable

### CAMPOS OPCIONALES

Ninguno.

### VALIDACIONES

- slug cumple formato `^[a-z][a-z0-9_]{2,40}$`
- definicion no puede estar vacia
- alcance debe pertenecer a la lista declarada

### AUTORIDAD DE ESCRITURA

Intencion Fundadora · mediante proceso de carga fundacional autorizada.

### AUTORIDAD DE LECTURA

Todos los componentes del sistema.

### CONTRATO ASOCIADO

Ninguno.

### REGLAS ESPECIFICAS

- Los terminos no se modifican una vez cargados.
- Los terminos no se borran.
- Un cambio de termino requiere nueva carga fundacional autorizada con clave "tomate" y sello "aprobado".

---

## NODO leyes

- Alcance: Ecosistema
- Fecha: 2026-10-08

### PROPOSITO

Leyes canonicas e inmutables del sistema.

### CAMPOS OBLIGATORIOS

- numero · entero ordinal
- texto · enunciado de la ley
- orden · entero para ordenamiento

### CAMPOS OPCIONALES

Ninguno.

### VALIDACIONES

- numero unico
- orden unico
- texto no puede estar vacio

### AUTORIDAD DE ESCRITURA

Intencion Fundadora · unicamente desde la consola de Firebase.

### AUTORIDAD DE LECTURA

Todos los componentes del sistema.

### CONTRATO ASOCIADO

Ninguno.

### REGLAS ESPECIFICAS

- Las leyes no se modifican desde la aplicacion.
- Las leyes no se borran.
- Toda ley lleva autorizacion canonica de la Intencion Fundadora (clave "tomate" y sello "aprobado").

---

## NODO reglas

- Alcance: Ecosistema
- Fecha: 2026-10-08

### PROPOSITO

Reglas operativas derivadas de las leyes.

### CAMPOS OBLIGATORIOS

- rubro · nombre del agrupador (nomenclatura_y_escritura, modos_de_existencia, gobernanza_de_datos)
- obligatorio · lista de acciones obligatorias
- permitido · lista de acciones permitidas
- prohibido · lista de acciones prohibidas

### CAMPOS OPCIONALES

Ninguno.

### VALIDACIONES

- rubro debe estar declarado
- cada lista puede estar vacia pero debe existir

### AUTORIDAD DE ESCRITURA

Intencion Fundadora.

### AUTORIDAD DE LECTURA

Todos los componentes del sistema.

### CONTRATO ASOCIADO

Ninguno.

### REGLAS ESPECIFICAS

- Las reglas no se modifican desde la aplicacion.

---

## NODO codigos_acceso

- Alcance: Ecosistema
- Fecha: 2026-10-08

### PROPOSITO

Asociar una instalacion fisica con un negocio registrado.

### CAMPOS OBLIGATORIOS

- codigo · string en formato PL{AAAA}-{NN}
- negocio_id · slug del negocio al que resuelve
- fecha_emision · momento de emision en ISO 8601
- estado_codigo · valor dentro de: activo, revocado, expirado

### CAMPOS OPCIONALES

- fecha_revocacion · momento de revocacion en ISO 8601
- motivo_revocacion · texto libre

### VALIDACIONES

- codigo cumple formato `^PL[0-9]{4}-[0-9]{2}$`
- negocio_id debe existir en negocios_registrados
- estado_codigo debe pertenecer a la lista declarada

### AUTORIDAD DE ESCRITURA

Torre de Control.

### AUTORIDAD DE LECTURA

Torre de Control · aplicacion del negocio al primer arranque.

### CONTRATO ASOCIADO

CONTRATO DE CODIGO DE ACCESO.

### REGLAS ESPECIFICAS

- Un codigo no puede reutilizarse tras revocacion.
- Un codigo no puede estar asociado a dos negocios.
- Un codigo expirado no valida.

---

## NODO categorias_registradas

- Alcance: Ecosistema
- Fecha: 2026-10-08

### PROPOSITO

Registro de cada categoria dada de alta en el sistema.

### CAMPOS OBLIGATORIOS

- nombre_visible · string entre 3 y 60 caracteres
- slug · identificador canonico
- nicho_padre · slug del nicho al que pertenece
- url_base_categoria · HTTPS obligatorio
- proyecto_firebase · identificador del proyecto asociado
- activa · booleano
- fecha_alta · ISO 8601
- negocios_asociados · lista de slugs
- capacidades_permitidas · lista no vacia · catalogo de capacidades de la categoria

### CAMPOS OPCIONALES

- notas_administrativas · texto libre
- fecha_baja · ISO 8601

### VALIDACIONES

- slug cumple formato `^[a-z][a-z0-9_]{2,40}$`
- nicho_padre debe existir registrado en catalogo_nichos_y_categorias.md
- url_base_categoria debe ser HTTPS
- proyecto_firebase debe existir en proyectos_registrados
- capacidades_permitidas debe ser lista no vacia
- cada capacidad de capacidades_permitidas cumple formato `^[a-z][a-z0-9_]{2,40}$` y no se repite

### AUTORIDAD DE ESCRITURA

Torre de Control.

### AUTORIDAD DE LECTURA

Torre de Control · Torre de Monitoreo · aplicacion del negocio.

### CONTRATO ASOCIADO

CONTRATO DE CATEGORIA.

### REGLAS ESPECIFICAS

- Una categoria se registra inicialmente con activa en false.
- Una categoria no puede activarse sin proyecto Firebase asociado.
- Un slug no puede repetirse.
- Una categoria inactiva no se puede reactivar sin autorizacion canonica (clave "tomate" y sello "aprobado").
- Unidad Central conserva unicamente el catalogo de capacidades de la categoria; la plantilla estructural completa pertenece a la definicion documental de la categoria.
- negocios_asociados se actualiza en la misma operacion atomica que registra el negocio.

---

## NODO proyectos_registrados

- Alcance: Ecosistema
- Fecha: 2026-10-08

### PROPOSITO

Registro de cada proyecto Firebase derivado.

### CAMPOS OBLIGATORIOS

- slug · identificador canonico
- tipo · valor dentro de: categoria, aplicable
- proyecto_firebase · identificador
- url_rtdb · HTTPS obligatorio
- categoria_padre · slug existente
- activo · booleano
- fecha_alta · ISO 8601

### CAMPOS OPCIONALES

- version_plantilla · SemVer

### VALIDACIONES

- tipo debe pertenecer a la lista declarada
- url_rtdb debe ser HTTPS
- categoria_padre debe existir en categorias_registradas

### AUTORIDAD DE ESCRITURA

Ecosistema ADI APP (al derivar un proyecto).

### AUTORIDAD DE LECTURA

Torre de Control · aplicacion del negocio.

### CONTRATO ASOCIADO

CONTRATO DE PROYECTO.

### REGLAS ESPECIFICAS

- Un proyecto no puede existir sin categoria padre.
- Un proyecto no puede tener mas de una RTDB asociada.

---

## NODO negocios_registrados

- Alcance: Ecosistema
- Fecha: 2026-10-08

### PROPOSITO

Registro de cada negocio operativo dado de alta en tiempo de ejecucion.

### CAMPOS OBLIGATORIOS

- nombre_visible · string
- slug · identificador canonico
- categoria_padre · slug existente
- codigo_acceso · string activo
- url_operativa · HTTPS obligatorio
- activo · booleano
- fecha_alta · ISO 8601
- dispositivos_maximos · entero entre 1 y 10
- dispositivos_activos · entero
- capacidades_firmadas · objeto cuyas claves son las capacidades asignadas, cada una con valor true

### CAMPOS OPCIONALES

- notas_operativas · texto libre
- fecha_baja · ISO 8601
- motivo_baja · texto libre

### VALIDACIONES

- categoria_padre debe existir en categorias_registradas
- codigo_acceso cumple formato `^PL[0-9]{4}-[0-9]{2}$` y esta activo
- url_operativa debe ser HTTPS
- dispositivos_activos no puede superar dispositivos_maximos
- capacidades_firmadas debe estar vigente
- toda clave de capacidades_firmadas debe existir en capacidades_permitidas de la categoria padre
- la categoria padre debe estar activa al registrar el negocio

### AUTORIDAD DE ESCRITURA

Torre de Control.

### AUTORIDAD DE LECTURA

Torre de Control · aplicacion del negocio · Torre de Monitoreo.

### CONTRATO ASOCIADO

CONTRATO DE NEGOCIO · CONTRATO DE CAPACIDADES FIRMADAS.

### REGLAS ESPECIFICAS

- Un negocio no puede existir sin categoria padre.
- Un negocio no puede tener mas de un codigo activo.
- Un negocio inactivo no se reactiva sin autorizacion canonica (clave "tomate" y sello "aprobado").
- Una capacidad no asignada no existe como clave; retirar una capacidad elimina su clave.
- Un slug de negocio no puede repetirse.

---

## NODO dispositivos_registrados

- Alcance: Ecosistema
- Fecha: 2026-10-08

### PROPOSITO

Registro de cada dispositivo vinculado a un negocio.

### CAMPOS OBLIGATORIOS

- identificador_dispositivo · unico
- negocio_id · slug existente en negocios_registrados
- tipo_dispositivo · valor dentro de: movil, tableta, terminal
- fecha_vinculacion · ISO 8601
- estado_dispositivo · valor dentro de: activo, inactivo, bloqueado

### CAMPOS OPCIONALES

- nombre_asignado · string
- ultima_conexion · ISO 8601

### VALIDACIONES

- negocio_id debe existir en negocios_registrados
- identificador_dispositivo no puede repetirse
- tipo_dispositivo debe pertenecer a la lista declarada
- estado_dispositivo debe pertenecer a la lista declarada

### AUTORIDAD DE ESCRITURA

Sistema al detectar la instalacion.

### AUTORIDAD DE LECTURA

Torre de Control · Torre de Monitoreo.

### CONTRATO ASOCIADO

CONTRATO DE DISPOSITIVO.

### REGLAS ESPECIFICAS

- Un dispositivo bloqueado no puede arrancar la aplicacion.
- Un dispositivo no puede vincularse a dos negocios.
- Un negocio no puede exceder dispositivos_maximos.

---

## NODO clientes_registrados

- Alcance: Ecosistema
- Fecha: 2026-10-08

### PROPOSITO

Registro del cliente contratante.

### CAMPOS OBLIGATORIOS

- nombre_responsable · string
- telefono · formato E.164
- negocios_asociados · lista no vacia
- contrato · objeto con: id_contrato, plan, monto, moneda, fecha_inicio, fecha_vencimiento, renovacion_automatica, dispositivos_maximos, estado, facturacion
- fecha_alta · ISO 8601
- activo · booleano

### CAMPOS OPCIONALES

- whatsapp · E.164
- correo · string
- rfc · string

### VALIDACIONES

- telefono cumple formato E.164
- negocios_asociados debe ser lista no vacia
- contrato debe estar vigente
- monto debe ser mayor a cero
- moneda debe ser codigo ISO 4217

### AUTORIDAD DE ESCRITURA

Torre de Control.

### AUTORIDAD DE LECTURA

Torre de Control · Intencion Fundadora.

### CONTRATO ASOCIADO

CONTRATO DE CLIENTE · CONTRATO DE CONTRATO COMERCIAL.

### REGLAS ESPECIFICAS

- Los datos del cliente nunca se replican a la RTDB Categoria.
- Los datos del cliente nunca se replican a la RTDB Negocio.
- Un cliente sin negocio no puede existir.
- Un cliente en estado baja no se reactiva.

---

## NODO bitacora_operaciones

- Alcance: Ecosistema
- Fecha: 2026-10-08

### PROPOSITO

Registro cronologico e inmutable de cada operacion escrita en Unidad Central.

### CAMPOS OBLIGATORIOS

- fecha_registro · ISO 8601
- tipo_operacion · valor declarado
- actor · identidad del actor
- entidad_afectada · identidad
- resultado · estado dentro de: exito, rechazo_autoridad, rechazo_validacion, falla_fuente, error_interno
- origen · interfaz desde la cual se origino

### CAMPOS OPCIONALES

- detalles · objeto con informacion adicional

### VALIDACIONES

- fecha_registro en ISO 8601
- tipo_operacion debe estar declarado
- actor debe existir
- resultado debe pertenecer a la lista declarada

### AUTORIDAD DE ESCRITURA

Sistema al procesar cualquier operacion.

### AUTORIDAD DE LECTURA

Torre de Control · Intencion Fundadora.

### CONTRATO ASOCIADO

CONTRATO DE ENTRADA DE BITACORA.

### REGLAS ESPECIFICAS

- Las entradas no se modifican.
- Las entradas no se borran.
- Toda operacion genera exactamente una entrada.

---

## REGLAS DE SEGURIDAD

- Alcance: Ecosistema
- Fecha: 2026-10-08

### Lectura publica

- terminos
- leyes
- reglas

### Escritura prohibida desde la aplicacion

- terminos
- leyes
- reglas
- bitacora_operaciones (solo sistema)

### Escritura autorizada

- Torre de Control: codigos_acceso, categorias_registradas, negocios_registrados, clientes_registrados
- Ecosistema ADI APP: proyectos_registrados
- Sistema: dispositivos_registrados, bitacora_operaciones

## REGLAS ESTRUCTURALES

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Los 10 nodos raiz existen desde el dia uno.
- Ningun nodo raiz adicional se crea sin autorizacion canonica de la Intencion Fundadora (clave "tomate" y sello "aprobado").
- Ningun nodo raiz puede eliminarse.
- Los nombres de nodos y campos siguen formato snake_case en minusculas.
