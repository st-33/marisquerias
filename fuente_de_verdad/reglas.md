# REGLAS

- Alcance: Ecosistema
- Fecha: 2026-10-08

## NOMENCLATURA Y ESCRITURA

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Obligatorio: Todo el contenido de la Fuente de Verdad debe estar escrito en idioma espanol.
- Obligatorio: Los nombres de archivos y carpetas deben coincidir con terminos registrados en la Fuente.
- Prohibido: El uso de terminos en idiomas extranjeros salvo siglas tecnicas indispensables registradas en terminos.md (ej. RTDB, APK, JSON).
- Obligatorio: Los nombres de carpetas y archivos de la Fuente de Verdad se escriben en minusculas con guion bajo como separador.
- Obligatorio: Los identificadores tecnicos y slugs de entidades usan guion bajo, salvo nombres de proyectos externos donde la plataforma exija guion medio.
- Obligatorio: La Fuente de Verdad reside en el directorio relativo `fuente_de_verdad/` dentro de la raiz de cada proyecto gobernado.
- Obligatorio: Los codigos de acceso siguen el formato PL{AAAA}-{NN}.
- Obligatorio: Los identificadores de nicho, categoria y aplicable siguen el formato de slug en minusculas con guion bajo.

## MODOS DE EXISTENCIA Y ESTRUCTURA DOCUMENTAL

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Obligatorio: Los 14 archivos gobernados de la Fuente de Verdad (terminos.md, especificaciones.md, formulas.md, plantillas.md, leyes.md, reglas.md, herencia.md, catalogo_nichos_y_categorias.md, diccionario.md, terminos_diseno.md, formulas_diseno.md, reglas_diseno.md, estructura_unidad_central.md, plantilla_estructural_categoria.md) deben existir en la raiz de `fuente_de_verdad/`.
- Obligatorio: Todo bloque de conocimiento gobernado dentro de los archivos de la Fuente debe declarar explicitamente su campo de alcance (`Alcance: Ecosistema`, `Alcance: Nicho: <nombre>`, `Alcance: Categoria: <nombre>` o `Alcance: Aplicable: <nombre>`).
- Obligatorio: Todo bloque de conocimiento, regla, ley, formula o especificacion modificado o incorporado debe portar el campo de fecha canónico (`Fecha: AAAA-MM-DD`).
- Prohibido: Crear carpetas adicionales dentro de `fuente_de_verdad/` para separar alcances. La clasificacion se realiza dentro de los mismos archivos gobernados.
- Prohibido: Introducir palabras estructurales en especificaciones, formulas, leyes, reglas, plantillas o instrucciones sin registro previo en terminos.md o diccionario.md.
- Obligatorio: Cada proyecto dispone de una carpeta documental que toma el nombre exacto de dicho proyecto (`<nombre_del_proyecto>/`) conteniendo exclusivamente `manual_de_construccion/`, `manual_de_diseno/` y `planos/`.
- Permitido: Crear subcarpetas e instrucciones dentro de `manual_de_construccion` segun la profundidad requerida por las fases de construccion.
- Permitido: Crear subcarpetas e instrucciones dentro de `manual_de_diseno` segun la profundidad requerida por las fases de diseno.
- Prohibido: Crear carpetas dentro del directorio `planos`; solo aloja archivos de imagen.

## GOBERNANZA Y JERARQUIA DE ALCANCES

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Obligatorio: La jerarquia de gobierno de la Fuente es estrictamente Ecosistema → Nicho → Categoria → Aplicable.
- Prohibido: Crear niveles jerarquicos o alcances fuera de los cuatro canónicos. La entidad operativa negocio no constituye un nivel jerarquico de la Fuente.
- Prohibido: Trasladar conocimiento exclusivo de una categoria o nicho al nivel general del Ecosistema sin justificacion formal de transversalidad y aprobacion fundadora.
- Prohibido: Modificar codigo fuente o construir aplicaciones durante la actividad del Mariscal Constructor de la Fuente. Su labor es exclusivamente documental y estructural.
- Obligatorio: El Ecosistema ADI APP debe utilizar el Proyecto Plantilla Base como molde tecnico neutral para derivar categorias y aplicaciones.
- Prohibido: Que una definicion o regla de nivel inferior modifique, invalide o contradiga a una definicion de nivel superior.
- Prohibido: El uso de archivos de firma independientes o mecanismos paralelos. La autorizacion de la Intencion Fundadora se rige exclusivamente por clave "tomate" y sello "aprobado".
- Prohibido: Crear el contenedor documental de un proyecto antes de que la Categoria padre este registrada en `catalogo_nichos_y_categorias.md` y se formalice la orden de levantar el Aplicable.
- Obligatorio: Todo contenedor documental de proyecto debe originarse a partir de la instanciacion del molde estructural neutro (`PLANTILLA ESTRUCTURAL DE CONTENEDOR DOCUMENTAL DE PROYECTO`), sustituyendo el nombre generico por el slug oficial del Aplicable a materializar.
- Obligatorio: El Mariscal del Proyecto opera con autoridad exclusiva dentro de `<nombre_del_proyecto>/` (manual_de_construccion, manual_de_diseno, planos) para la materialización del Aplicable.
- Permitido: El Mariscal del Proyecto tiene autorización para agregar términos, fórmulas y reglas en los archivos gobernados de la Fuente (terminos.md, formulas.md, reglas.md) exclusivamente bajo el alcance de su Nicho o Categoría (`Alcance: Nicho: <nombre>` o `Alcance: Categoria: <nombre>`), previa auditoría de no duplicidad y bajo estricto apego a la plantilla oficial.
- Prohibido: El Mariscal del Proyecto tiene prohibido modificar o eliminar bloques con `Alcance: Ecosistema`, alterar leyes o intervenir en categorías ajenas.
- Obligatorio: El Mariscal del Ecosistema custodia los 14 archivos de la Fuente, arbitra colisiones léxicas y supervisa los límites estructurales del contenedor, teniendo prohibido redactar código o instrucciones particulares de implementación del proyecto.

## INCORPORACION DE NUEVOS NICHOS, CATEGORIAS Y CONOCIMIENTO

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Obligatorio: Antes de incorporar un nuevo Nicho, el Mariscal Constructor debe auditar la Fuente existente para identificar capacidades reutilizables y descartar duplicidades operativas.
- Obligatorio: Todo nuevo Nicho debe registrarse en `catalogo_nichos_y_categorias.md` utilizando la plantilla oficial de registro de nicho, indicando justificacion, caracteristicas distintivas, fecha y categorias proyectadas.
- Obligatorio: Toda nueva Categoria debe asociarse a un Nicho padre preexistente y registrarse formalmente en `catalogo_nichos_y_categorias.md` con su giro comercial y aplicables originados.
- Obligatorio: Todo nuevo termino tecnico o de negocio requerido por un nuevo nicho o categoria debe registrarse previamente en `terminos.md` con su alcance respectivo antes de ser usado en formulas, reglas o especificaciones.
- Prohibido: Crear una nueva base de datos para un nuevo nicho. Los nichos comparten el gobierno macro de Unidad Central y las categorias operan en su Firebase correspondiente.
- Obligatorio: Si un conocimiento originado en un proyecto demuestra utilidad transversal para otros nichos o categorias, debe registrarse la justificacion de promocion hacia el Ecosistema antes de incorporarlo en la Fuente general.

## OPERACION DE BASES DE DATOS Y FLUJO TRANSACCIONAL

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Obligatorio: La Torre de Control es la unica entidad autorizada para escribir en la RTDB de gobierno (Unidad Central).
- Obligatorio: La verificacion de recepcion integra debe completarse antes de autorizar la purga de la jornada operativa.
- Prohibido: Ejecutar transferencia y purga de forma simultanea.
- Prohibido: La aplicacion del giro comercial escribe directamente en la RTDB de gobierno (Unidad Central).
- Prohibido: La aplicacion del giro comercial escribe directamente en la RTDB de categoria fuera de los protocolos autorizados.
- Prohibido: La Torre de Monitoreo almacena estado de forma independiente.
- Prohibido: Crear bases de datos adicionales a las declaradas en la Fuente de Verdad.
- Obligatorio: La estructura de Unidad Central se declara en `estructura_unidad_central.md` antes de construirse.
- Prohibido: Crear nodos raiz adicionales a los declarados en la Fuente de Verdad.
- Prohibido: Modificar la estructura de Unidad Central desde la aplicacion.
- Obligatorio: Las estructuras de una categoria y su aplicable deben representar existencia real en correspondencia con sus capacidades asignadas.
- Prohibido: Mantener estructuras vacias con valores booleanos `false` unicamente para indicar capacidades no habilitadas; los booleanos se reservan para estados binarios legitimos del dato.

## NOMENCLATURA Y ESCRITURA DEL GIRO

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Obligatorio: Todo identificador tecnico del giro se escribe en minúsculas con guion bajo como separador.
- Obligatorio: Los roles operativos se declaran en minúsculas: mesero, cocina, mostrador, administrador, repartidor.
- Prohibido: Usar terminos extranjeros para nombrar entidades del giro salvo siglas tecnicas registradas (KDS, POS, APK, JSON, RTDB).

## COMANDAS Y ELABORACION

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Obligatorio: Toda partida enviada a cocina registra su estado dentro de la cadena declarada de avance.
- Obligatorio: El descuento de inventario se realiza unicamente a partir de la receta registrada del producto.
- Prohibido: Descontar inventario sobre un producto sin receta o sin variante definida.
- Obligatorio: Una mesa transita de forma secuencial por los estados libre, ocupada y cuenta.

## DESPACHO POR PESO Y BASCULA

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Obligatorio: El cobro por peso se calcula a partir de la lectura transmitida por la bascula.
- Prohibido: Registrar un peso por peso manual sin validacion de la bascula cuando el producto se vende por peso.
- Obligatorio: La lectura de la bascula se expresa en la unidad de peso declarada para el producto.

## REPARTO A DOMICILIO

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Obligatorio: Todo reparto registra un destino externo al negocio antes de su despacho.
- Prohibido: Mezclar reparto a domicilio con operacion de mostrador o de mesa sin una venta diferenciada.

## IMPRESION Y TICKETS

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Obligatorio: Todo ticket de cocina se deriva de una partida y porta su destinatario de area.
- Obligatorio: Todo ticket de venta porta el detalle, el total y la modalidad de venta (orden o peso).
- Prohibido: Registrar una venta cobrada sin su ticket cuando la impresora esta disponible.
