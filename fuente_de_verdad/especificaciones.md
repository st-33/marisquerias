# ESPECIFICACIONES

- Alcance: Ecosistema
- Fecha: 2026-10-08

## 1. CARPETAS

### <nombre_del_proyecto> (Contenedor Documental de Proyecto)

- Alcance: Aplicable: <nombre_del_proyecto>
- Fecha: 2026-10-08
- Proposito: Alojar el espacio documental exclusivo de materializacion del proyecto al que pertenece la Fuente que la contiene (ejemplo: `ecosistema_adi_app/` en el proyecto raiz, `marisquerias/` en la categoria marisquerias).
- Existencia: Se crea obligatoriamente en cada proyecto gobernado mediante instanciacion y renombrado del molde estructural neutro cuando se formaliza la orden de levantar el Aplicable. Prohibido crearlo de forma anticipada.
- Permiso de anidamiento: Unicamente permite las tres subcarpetas de materializacion: `manual_de_construccion`, `manual_de_diseno` y `planos`. Prohibido crear carpetas adicionales a este nivel.

#### manual_de_construccion

- Alcance: Aplicable: <nombre_del_proyecto>
- Fecha: 2026-10-08
- Proposito: Alojar las instrucciones y pasos ordenados para la construccion fisica y digital de la aplicacion del proyecto.
- Existencia: Obligatoria dentro del contenedor documental del proyecto.
- Permiso de anidamiento: Permitido anidamiento en subcarpetas por fase operativa conteniendo instrucciones estructuradas en archivos individuales.
- Archivos permitidos en la raiz: LEEME.md.
- Prohibido: Archivos sueltos que no sean instrucciones o el LEEME.md.

#### manual_de_diseno

- Alcance: Aplicable: <nombre_del_proyecto>
- Fecha: 2026-10-08
- Proposito: Alojar las instrucciones ordenadas para la construccion de la capa visual e interactiva de la aplicacion del proyecto.
- Existencia: Obligatoria dentro del contenedor documental del proyecto.
- Permiso de anidamiento: Permitido anidamiento en subcarpetas por fase operativa conteniendo instrucciones estructuradas en archivos individuales.
- Archivos permitidos en la raiz: LEEME.md.
- Prohibido: Archivos sueltos que no sean instrucciones o el LEEME.md.

#### planos

- Alcance: Aplicable: <nombre_del_proyecto>
- Fecha: 2026-10-08
- Proposito: Alojar las representaciones visuales y diagramas esquematicos del sistema generados en formato de imagen.
- Existencia: Obligatoria dentro del contenedor documental del proyecto.
- Permiso de anidamiento: Prohibido anidamiento de carpetas; solo contiene archivos de imagen.
- Nomenclatura: Nombres en minusculas, con guion bajo, sin espacios ni caracteres especiales.

## 2. ARCHIVOS GOBERNADOS DE LA FUENTE DE VERDAD

Todos los archivos base de la Fuente de Verdad residen exclusivamente en la raiz de `fuente_de_verdad/`. Cada archivo aloja conocimiento canonico y admite internamente bloques con alcances explicitos: `Alcance: Ecosistema`, `Alcance: Nicho: <nombre>`, `Alcance: Categoria: <nombre>` o `Alcance: Aplicable: <nombre>`, acompanados obligatoriamente del campo de fecha `Fecha: AAAA-MM-DD`.

### terminos.md

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Proposito: Contener la lista atomica de terminos del sistema con su definicion concisa.
- Existencia: Obligatoria.
- Permiso de estructura: Solo permite entradas de terminos estructuradas bajo la plantilla oficial, con campo de alcance y fecha obligatorios en cada entrada.

### especificaciones.md

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Proposito: Declarar las condiciones de existencia, permisos, limites y alcances de carpetas y archivos.
- Existencia: Obligatoria.
- Permiso de estructura: Dividido estrictamente en dos secciones: 1. Carpetas y 2. Archivos Gobernados de la Fuente de Verdad.

### formulas.md

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Proposito: Establecer las ecuaciones exactas de combinacion entre entidades utilizando exclusivamente identificadores registrados en terminos.md.
- Existencia: Obligatoria.
- Permiso de estructura: Solo permite igualdades directas entre terminos y entidades, con declaracion explicita de alcance y fecha.

### plantillas.md

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Proposito: Alojar los moldes base reutilizables que definen la forma de los documentos y estructuras del sistema.
- Existencia: Obligatoria.
- Permiso de estructura: Solo bloques de formato estandarizado con campo de fecha y alcance sin datos particulares de ejecucion. Prohibida la inclusion de plantillas de archivos de firma sueltos.

### leyes.md

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Proposito: Registrar las condiciones estructurales fundamentales dictadas por la Intencion Fundadora.
- Existencia: Obligatoria.
- Permiso de estructura: Enunciados directos numerados con alcance y fecha obligatorios.

### reglas.md

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Proposito: Detallar lo permitido, lo obligatorio y lo prohibido derivado de las leyes para cada ambito y alcance.
- Existencia: Obligatoria.
- Permiso de estructura: Clasificacion por rubro bajo los campos: Obligatorio, Permitido, Prohibido, con alcance y fecha por cada ambito.

### herencia.md

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Proposito: Establecer los criterios de transmision de contexto, la jerarquia canónica de 4 niveles (Ecosistema → Nicho → Categoria → Aplicable), los protocolos formales para incorporar nuevos nichos y categorias, y los roles de los mariscales.
- Existencia: Obligatoria.
- Permiso de estructura: Articulado de gobierno, jerarquia, procedimientos de incorporacion y clasificacion de alcances con fecha.

### catalogo_nichos_y_categorias.md

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Proposito: Registrar el inventario oficial y trazable de todos los nichos y categorias reconocidos en el Ecosistema, detallando su justificacion, caracteristicas y relaciones de pertenencia.
- Existencia: Obligatoria.
- Permiso de estructura: Registros estructurados bajo las plantillas oficiales de nicho y categoria con alcance y fecha.

### diccionario.md

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Proposito: Registrar palabras de uso general para evitar ambiguedades de interpretacion en cualquier nivel.
- Existencia: Obligatoria.
- Permiso de estructura: Lista alfabetica de palabra, alcance, fecha y definicion concisa. Prohibido duplicar terminos arquitectonicos reservados de terminos.md.

### terminos_diseno.md

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Proposito: Contener la lista atomica de terminos de la capa visual e interactiva.
- Existencia: Obligatoria.
- Permiso de estructura: Entradas de terminos de diseno estructuradas bajo su plantilla oficial con campo de alcance y fecha.

### formulas_diseno.md

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Proposito: Establecer las ecuaciones exactas de combinacion entre entidades visuales usando exclusivamente identificadores registrados en terminos_diseno.md.
- Existencia: Obligatoria.
- Permiso de estructura: Solo igualdades directas entre terminos de diseno con declaracion explicita de alcance y fecha.

### reglas_diseno.md

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Proposito: Detallar lo permitido, lo obligatorio y lo prohibido en el ambito visual e interactivo.
- Existencia: Obligatoria.
- Permiso de estructura: Clasificacion por rubro bajo los campos: Obligatorio, Permitido, Prohibido, con alcance y fecha por cada ambito.

### estructura_unidad_central.md

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Proposito: Declarar la estructura canonica de la RTDB Unidad Central: nodos, campos, validaciones, autoridades y ciclos de vida.
- Existencia: Obligatoria.
- Permiso de estructura: Declaraciones de nodos siguiendo la plantilla de nodo raiz con alcance y fecha.

### plantilla_estructural_categoria.md

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Proposito: Declarar el modelo rector de plantilla estructural de categoria, sus capacidades y la regla de derivacion hacia la estructura del aplicable.
- Existencia: Obligatoria.
- Permiso de estructura: Declaraciones de proposito, estructura, derivacion, capacidades y principios de existencia real con alcance y fecha.
