# HERENCIA Y PROTOCOLO DE GOBERNANZA

- Alcance: Ecosistema
- Fecha: 2026-10-08

## 1. JERARQUIA CANONICA DE LA FUENTE

La gobernanza, organizacion y transmision de autoridad de la Fuente de Verdad se rige estrictamente por cuatro niveles jerarquicos:

```text
ECOSISTEMA → NICHO → CATEGORIA → APLICABLE
```

1. **Ecosistema**: Nivel raiz de gobierno, infraestructura macro, leyes inmutables, contratos transversales y definiciones universales.
2. **Nicho**: Dominio amplio de industria o comercio (ejemplos: Gastronomia, Panaderias, Comercio Minorista). Agrupa categorias con caracteristicas operativas, regulatorias o funcionales afines.
3. **Categoria**: Giro comercial especifico dentro de un nicho (ejemplos: Marisquerias, Panaderia de Despacho, Verdulerias). Es la unidad funcional que origina y delimita las capacidades de su aplicacion digital.
4. **Aplicable**: Artefacto de software digital materializado (ejemplos: compilacion ejecutable, APK, paquete web). Las instalaciones fisicas, terminales o copias de un aplicable no constituyen un nivel de la Fuente.

La entidad operativa negocio (tenant o cliente) es una unidad de despliegue en tiempo de ejecucion en Unidad Central, NO un nivel jerarquico de conocimiento de la Fuente de Verdad.

## 2. SISTEMA DE ALCANCES Y GOBERNANZA UNIVERSAL

La clasificacion por niveles no fragmenta la Fuente en carpetas redundantes ni la encierra en silos. Todo bloque de conocimiento gobernado dentro de los 14 archivos raiz declara obligatoriamente su campo de alcance y su fecha:

- `Alcance: Ecosistema`
- `Alcance: Nicho: <nombre>`
- `Alcance: Categoria: <nombre>`
- `Alcance: Aplicable: <nombre>`
- `Fecha: AAAA-MM-DD`

### Significado e Impacto de cada Alcance:

1. **`Alcance: Ecosistema` (Universal y Transversal):**
   - **Influye en absolutamente todo el sistema**, sin excepcion. Todo lo que porta esta etiqueta tiene caracter de ley física o contrato universal dentro del Ecosistema ADI APP.
   - Aplica de forma obligatoria a todos los nichos, a todas las categorias, a todos los aplicables y a todos los mariscales, en dondequiera que esten operando.
   - Provee los cimientos inmutables: las 18 leyes, el gobierno macro de Unidad Central, el protocolo del ciclo diario, la bitacora de auditoria, el diccionario base y los terminos fundamentales del sistema.
   - Ningun elemento de alcance inferior puede anular, modificar, redefinir ni contradecir una pieza con `Alcance: Ecosistema`.

2. **`Alcance: Nicho: <nombre>` (Dominio de Industria):**
   - Influye y rige sobre **todas las categorias y proyectos que pertenezcan a ese nicho especifico** (ejemplo: `Alcance: Nicho: Gastronomia` influye en Marisquerias, Pizzerias, Taquerias, etc.).
   - Modela rasgos operativos comunes a una industria completa (ejemplo: gestion de comandas, control de mermas, tiempos de coccion/preparacion).
   - No afecta a nichos ajenos (una regla de Gastronomia no influye en Ferreterias ni en Panaderias si son nichos separados).

3. **`Alcance: Categoria: <nombre>` (Giro Comercial Particular):**
   - Influye exclusivamente en los aplicables y proyectos que se originen de ese giro comercial (ejemplo: `Alcance: Categoria: Marisquerias`).
   - Define el catalogo de capacidades requeridas (bascula para mariscos, mesa caliente, barra fria) y las formulas y terminos que solo tienen sentido en ese giro.

4. **`Alcance: Aplicable: <nombre>` (Materializacion Concreta):**
   - Exclusivo del artefacto digital o proyecto que se esta ensamblando (ejemplo: `Alcance: Aplicable: marisquerias_pos`).
   - Rige la construccion tecnica especifica documentada en el contenedor del proyecto (`manual_de_construccion`, `manual_de_diseno`, `planos`).

Ningun termino, regla, formula, plantilla o especificacion puede incorporarse a la Fuente sin estos campos explicitamente definidos.

## 3. PROCEDIMIENTO PARA INCORPORAR UN NUEVO NICHO

Ante una instruccion operativa de la forma:
`"Agregar nuevo Nicho: <Nombre_del_Nicho>"` (ejemplo: *"Agregar nuevo Nicho: Panaderías"*),
el Mariscal Constructor debe ejecutar de manera autonoma el siguiente procedimiento:

### Paso 1: Revision previa y no duplicidad
- Verificar en `catalogo_nichos_y_categorias.md` que el nicho no este registrado previamente ni exista bajo un sinonimo comercial.
- Auditar `terminos.md` y `diccionario.md` para constatar que el concepto no entre en conflicto con nichos o terminos existentes.

### Paso 2: Determinacion de conocimiento reutilizable
- Analizar que infraestructura macro del Ecosistema ya cubre las necesidades del nuevo nicho: leyes universales, gobierno de Unidad Central, autenticacion, ciclo diario y bitacora.
- No duplicar leyes, reglas de sistema ni terminos base del Ecosistema. Todo lo que el Ecosistema ya resuelve permanece en `Alcance: Ecosistema`.

### Paso 3: Aislamiento del conocimiento propio del Nicho
- Identificar que rasgos operativos son exclusivos de este nicho y transversales a todas sus categorias (ejemplo para Panaderías: gestion de recetas, horneado por lotes, pesaje de harina, mermas de produccion).
- Definir que estos elementos tendran obligatoriamente `Alcance: Nicho: <nombre>`.

### Paso 4: Identificacion de nuevos terminos
- Si el nicho introduce vocabulario tecnico o comercial no existente en la Fuente, redactar cada nuevo termino siguiendo la plantilla oficial con `Alcance: Nicho: <nombre>`, `Fecha: AAAA-MM-DD` y registrarlo en `terminos.md`.
- No inventar terminos en formulas o reglas sin haberlos registrado primero en `terminos.md`.

### Paso 5: Proyeccion de Categorias del Nicho
- Definir y listar que categorias preliminares pertenecen o perteneceran a este nicho (ejemplo para Panaderías: Despacho Tradicional, Panaderia Industrial, Reposteria Fina).

### Paso 6: Elementos que NO deben copiarse
- Prohibido copiar archivos completos de la Fuente.
- Prohibido crear carpetas en `fuente_de_verdad/` para el nicho.
- Prohibido crear bases de datos nuevas; el nicho se gobernara bajo la Unidad Central existente.

### Paso 7: Modificacion y registro de archivos
1. **`catalogo_nichos_y_categorias.md`**: Modificar agregando el bloque oficial del nicho:
   - `## NICHO: <NOMBRE>`
   - `- Alcance: Nicho: <nombre>`
   - `- Fecha: [AAAA-MM-DD]`
   - `- Justificacion: ...`
   - `- Caracteristicas distintivas: ...`
   - `- Categorias contenidas: ...`
2. **`terminos.md`**: Agregar los terminos especificos del nicho numerados y fechados.
3. **`formulas.md`** y **`reglas.md`**: Agregar formulas o reglas exclusivas del nicho si aplican, con `Alcance: Nicho: <nombre>` y `Fecha: [AAAA-MM-DD]`.
4. **`estructura_unidad_central.md`**: Registrar en el subnodo de catalogos o proyectos si se requiere habilitar el slug del nicho.

### Paso 8: Fechado y trazabilidad
- Todo bloque agregado debe registrar la fecha exacta de su incorporacion (`Fecha: AAAA-MM-DD`).

---

## 4. PROCEDIMIENTO PARA INCORPORAR UNA NUEVA CATEGORIA

Ante una instruccion operativa de la forma:
`"Agregar nueva Categoria: <Nombre_de_la_Categoria> en Nicho: <Nombre_del_Nicho>"`:

### Paso 1: Validacion de filiacion y no duplicidad
- Comprobar que el Nicho padre este registrado formalmente en `catalogo_nichos_y_categorias.md`.
- Verificar que la categoria no exista previamente.

### Paso 2: Determinacion de conocimiento reutilizable
- Reutilizar todos los terminos y capacidades provistos por el Ecosistema y por el Nicho padre.
- La categoria hereda el marco de su nicho pero no redefine ninguna ley ni termino superior.

### Paso 3: Identificacion del giro comercial y capacidades
- Delimitar el giro comercial exacto (ejemplo: Marisquerias, Taquerias, Panaderia de Despacho).
- Especificar la aplicacion de la plantilla estructural (`plantilla_estructural_categoria.md`) determinando las capacidades requeridas (inventario, bascula, comandas, etc.).

### Paso 4: Registro de terminos de categoria
- Si el giro requiere terminos exclusivos, registrarlos en `terminos.md` con `Alcance: Categoria: <nombre>` y `Fecha: [AAAA-MM-DD]`.

### Paso 5: Modificacion y registro de archivos
1. **`catalogo_nichos_y_categorias.md`**: Registrar la categoria bajo la plantilla oficial enlazada a su nicho padre.
2. **`terminos.md`**: Registrar los terminos exclusivos del giro.
3. **`formulas.md`** y **`reglas.md`**: Registrar las formulas de composicion de la categoria (ej. `categoria + plantilla_estructural_de_categoria + capacidad = aplicable`) y sus reglas operativas particulares.

---

---

## 5. PROCEDIMIENTO PARA LEVANTAR UN NUEVO APLICABLE A PARTIR DE UNA CATEGORIA

El Aplicable representa la materializacion digital concreta de una Categoría (ejemplo: binario compilado, APK, paquete web). No se asume su existencia ni se crea su contenedor documental antes de que exista la Categoría y se formalice la orden de construcción.

Ante la instrucción de levantar un nuevo Aplicable, se ejecuta de forma rigurosa el siguiente procedimiento:

### Paso 1: Verificacion de Filiacion de Categoria
- Comprobar en `catalogo_nichos_y_categorias.md` que la Categoría padre esté registrada formalmente, con sus capacidades y giro comercial delimitados.
- Si la Categoría no existe, el Aplicable no puede levantarse; debe incorporarse primero la Categoría según el procedimiento del apartado 4.

### Paso 2: Determinacion del Identificador del Proyecto
- Definir el slug oficial del nuevo proyecto aplicable en minusculas con guion bajo (ejemplo: `marisquerias_pos`, `ecosistema_adi_app`).
- El identificador del proyecto no puede duplicar proyectos previamente registrados.

### Paso 3: Instanciacion del Contenedor Documental de Proyecto
- La Fuente de Verdad proporciona la estructura neutra gobernada (`PLANTILLA ESTRUCTURAL DE CONTENEDOR DOCUMENTAL DE PROYECTO`).
- En la raíz de `fuente_de_verdad/` del repositorio asignado al proyecto, se instancía dicha plantilla sustituyendo el nombre genérico por el nombre exacto del nuevo proyecto (`<nombre_del_proyecto>/`).
- El contenedor instanciado contiene estrictamente los tres pilares documentales de materialización:
  1. `manual_de_construccion/`: Con su archivo inicial `LEEME.md` estructurado según la plantilla oficial.
  2. `manual_de_diseno/`: Con su archivo inicial `LEEME.md` estructurado según la plantilla oficial.
  3. `planos/`: Directorio plano destinado exclusivamente a imágenes y diagramas esquemáticos (sin subcarpetas).
- Queda vedada la creación de cualquier otra carpeta o archivo suelto dentro del contenedor documental.

### Paso 4: Registro Oficial en la Fuente
- Registrar el nuevo Aplicable en `catalogo_nichos_y_categorias.md` bajo la sección de su Categoría padre, utilizando la plantilla oficial de registro de aplicable:
  - `## APLICABLE: <NOMBRE_DEL_APLICABLE>`
  - `- Alcance: Aplicable: <nombre_del_proyecto>`
  - `- Fecha: [AAAA-MM-DD]`
  - `- Categoria padre: <nombre_de_la_categoria>`
  - `- Tipo de artefacto: [APK | Web | Binario]`
  - `- Repositorio / Contenedor: <ruta_relativa_del_contenedor>`

### Paso 5: Separacion Estricta de Responsabilidades entre Mariscales

La construcción y gobernanza del Aplicable se divide de forma estricta entre dos autoridades que no se solapan:

1. **Responsabilidades del Mariscal del Ecosistema (Constructor de la Fuente):**
   - Posee la autoridad de gobierno sobre la Fuente de Verdad principal.
   - Audita, cuestiona y verifica que la base teórica (los 14 archivos gobernados) sea sólida y provea todas las leyes, términos, capacidades y reglas necesarias para el Aplicable.
   - Supervisa que la instanciación del contenedor documental del proyecto respete la plantilla oficial y los límites de anidamiento.
   - Protege la Fuente contra la contaminación: si el proyecto utiliza frameworks específicos (React Native, Flutter, Electron, Firebase Client), esa información técnica pertenece al proyecto y NO a la Fuente general.
   - Evalúa formalmente cualquier propuesta de promoción de conocimiento transversal que el proyecto descubra.
   - No redacta código fuente ni escribe las instrucciones particulares de construcción física del proyecto.

2. **Responsabilidades del Mariscal del Proyecto (Ejecutor / Materializador):**
   - Posee la autoridad operativa DENTRO de la carpeta `<nombre_del_proyecto>/` para materializar el Aplicable (`manual_de_construccion`, `manual_de_diseno`, `planos`).
   - **Autoridad en la Fuente de Verdad para su alcance:** Cuando el desarrollo del proyecto o los requerimientos del usuario exigen nuevos conceptos, el Mariscal del Proyecto tiene autoridad para **agregar nuevos términos, fórmulas o reglas** en la Fuente de Verdad ([terminos.md](file:///home/st/Escritorio/ecosistema_adi_app/fuente_de_verdad/terminos.md), [formulas.md](file:///home/st/Escritorio/ecosistema_adi_app/fuente_de_verdad/formulas.md), [reglas.md](file:///home/st/Escritorio/ecosistema_adi_app/fuente_de_verdad/reglas.md)), bajo las siguientes condiciones inmutables:
     1. Debe auditar previamente que el concepto no exista ya en el Ecosistema o en su Nicho padre para evitar duplicidades.
     2. Debe etiquetarlo obligatoriamente con su alcance estricto: `Alcance: Nicho: <nombre>` o `Alcance: Categoria: <nombre>`, acompanado de su fecha `Fecha: [AAAA-MM-DD]`.
     3. Debe respetar con rigor la plantilla oficial de entrada y verificar que no rompa la sincronía léxica con ninguna ley ni fórmula existente.
   - **Límites inmutables:** Tiene terminantemente prohibido modificar, redefinir o eliminar bloques con `Alcance: Ecosistema`, alterar leyes ([leyes.md](file:///home/st/Escritorio/ecosistema_adi_app/fuente_de_verdad/leyes.md)) o invadir categorías ajenas.

---

## 6. CLASIFICACION Y PROMOCION DE CONOCIMIENTO (FUENTE VS PROYECTO)

Para determinar si una pieza de informacion pertenece a la Fuente de Verdad o unicamente al proyecto:

1. **Pertenencia a la Fuente**:
   - Todo concepto teorico, ley, regla de gobernanza, especificacion de estructura, formula de combinacion, termino lexico o plantilla reutilizable pertenece a la Fuente de Verdad principal.
   - Si una categoria requiere un termino propio (ej. pesaje en bascula para marisquerias), ese termino pertenece a la Fuente de Verdad bajo `Alcance: Categoria: <nombre>` para que quede en el inventario oficial reutilizable.
2. **Pertenencia al Proyecto**:
   - Toda instruccion de instalacion de dependencias de codigo, configuracion de build, paso a paso de compilacion, archivo de diseno SVG/PNG particular o plano pertenece al contenedor del proyecto (`manual_de_construccion`, `manual_de_diseno`, `planos`).
3. **Criterio de Promocion**:
   - Si una solucion descubierta en un proyecto resulta aplicable a multiples categorias o nichos, no se promueve arbitrariamente: el Mariscal Constructor debe registrar la justificacion formal de transversalidad, asignarle `Alcance: Nicho: <nombre>` o `Alcance: Ecosistema`, asignarle fecha y someterla a la autorizacion fundadora mediante clave "tomate" y sello "aprobado".

---

## 7. MATRIZ DE AUTORIDAD DE LOS MARISCALES

| Ambito / Accion | Mariscal del Ecosistema (Constructor) | Mariscal del Proyecto (Ejecutor) |
| :--- | :--- | :--- |
| Modificar leyes universales ([leyes.md](file:///home/st/Escritorio/ecosistema_adi_app/fuente_de_verdad/leyes.md)) | **Autoridad Exclusiva** | **Prohibido** |
| Modificar bloques con `Alcance: Ecosistema` | **Autoridad Exclusiva** | **Prohibido** |
| Agregar términos/fórmulas/reglas de su Nicho o Categoría | Supervisión de no duplicidad | **Autorizado** (bajo plantilla y alcance) |
| Modificar términos/reglas de categorías ajenas | **Prohibido** (salvo arbitraje) | **Prohibido** |
| Autorizar derivación de un nuevo Aplicable | **Autoridad Exclusiva** | No Aplica |
| Instanciar y renombrar plantilla de contenedor | **Autoridad Exclusiva** | No Aplica |
| Redactar instrucciones en `manual_de_construccion` | Supervisión de límites | **Autoridad Exclusiva** |
| Redactar instrucciones en `manual_de_diseno` | Supervisión de consistencia | **Autoridad Exclusiva** |
| Agregar imágenes en `planos` | Supervisión de nomenclatura | **Autoridad Exclusiva** |
| Modificar código fuente / Compilar aplicación | **Prohibido** | **Autoridad Exclusiva** |
| Proponer promoción a nivel Ecosistema | Evaluación y dictamen | Formulación de propuesta |

## 8. REGLAS FUNDAMENTALES DE TRANSMISION DE HERENCIA

1. La Fuente superior transmite contexto y autoridad a los niveles inferiores: `Ecosistema → Nicho → Categoria → Aplicable`.
2. Un nivel inferior reconoce la autoridad del nivel superior, pero nunca lo modifica, redefine ni contradice.
3. Una categoria puede reutilizar piezas heredadas de su nicho o del Ecosistema, pero no puede imponer sus terminos a categorias hermanas ni a nichos ajenos.

---

## 9. PROTOCOLO DE CONSTRUCCION HIBRIDA Y FILTRO DE COMPATIBILIDAD (MODO DIABLO)

Cuando un Mariscal recibe la instrucción de construir o ampliar un Aplicable, ejecuta en paralelo el siguiente ciclo operativo continuo:

### 1. Ingestion y Auditoria de Materiales en la Fuente
- El Mariscal consulta la Fuente de Verdad para tomar los bloques ya aprobados:
  - Cimientos universales con `Alcance: Ecosistema` (leyes, contratos de gobierno, ciclo diario).
  - Bloques de industria con `Alcance: Nicho: <nombre>` (procesos de negocio comunes).
  - Bloques de giro con `Alcance: Categoria: <nombre>` (capacidades y vocabulario del ramo).
  - Vocabulario y semántica en [diccionario.md](file:///home/st/Escritorio/ecosistema_adi_app/fuente_de_verdad/diccionario.md).

### 2. Deteccion de Necesidad y Creacion de Piezas Nuevas
- Si el requerimiento del usuario exige un concepto, regla o fórmula que aún no existe en la Fuente:
  1. **Auditoria previa:** Verifica que no esté ya resuelto bajo otro nombre en el Ecosistema o en el Nicho.
  2. **Definicion canonica:** Redacta la nueva pieza respetando estrictamente la plantilla oficial correspondiente en [plantillas.md](file:///home/st/Escritorio/ecosistema_adi_app/fuente_de_verdad/plantillas.md).
  3. **Etiquetado de Alcance y Fecha:** Le asigna su alcance preciso (`Alcance: Nicho: <nombre>` o `Alcance: Categoria: <nombre>`) y `Fecha: [AAAA-MM-DD]`.

### 3. El Filtro Diablo de Compatibilidad Inmediata
- **Regla de Rechazo Inmediato:** Toda pieza nueva se audita en caliente contra el resto de la Fuente:
  - ¿Introduce un token no definido en fórmulas? → **Va para atrás.**
  - ¿Contradice alguna ley o regla universal de `Alcance: Ecosistema`? → **Va para atrás.**
  - ¿Genera duplicidad semántica con un término existente? → **Va para atrás.**
- Solo cuando la pieza demuestra compatibilidad y sincronía total con la arquitectura preexistente, se asienta de manera definitiva en el archivo correspondiente de la Fuente ([terminos.md](file:///home/st/Escritorio/ecosistema_adi_app/fuente_de_verdad/terminos.md), [formulas.md](file:///home/st/Escritorio/ecosistema_adi_app/fuente_de_verdad/formulas.md) o [reglas.md](file:///home/st/Escritorio/ecosistema_adi_app/fuente_de_verdad/reglas.md)).

### 4. Ensamble en el Contenedor de Proyecto
- Con las piezas debidamente registradas y validadas en la Fuente, el Mariscal del Proyecto acude a su contenedor (`<nombre_del_proyecto>/`) y redacta las instrucciones paso a paso en su `manual_de_construccion/` o `manual_de_diseno/`, enlazando los términos y fórmulas canónicas para guiar el desarrollo del código sin ambigüedades.
