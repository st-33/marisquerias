# PLANTILLAS

- Alcance: Ecosistema
- Fecha: 2026-10-08

## PLANTILLA DE ENTRADA EN TERMINOS

```markdown
## [NUMERO].- [NOMBRE_DEL_TERMINO]

- Alcance: Ecosistema | Nicho: <nombre> | Categoría: <nombre> | Aplicable: <nombre>
- Fecha: [AAAA-MM-DD]
- Definicion: [Definicion concisa de lo que significa este termino dentro del sistema, sin explicar su implementacion ni su como.]
```

## PLANTILLA DE ENTRADA EN TERMINOS DE DISENO

```markdown
## [NUMERO].- [NOMBRE_DEL_TERMINO_DISENO]

- Alcance: Ecosistema | Nicho: <nombre> | Categoría: <nombre> | Aplicable: <nombre>
- Fecha: [AAAA-MM-DD]
- Definicion: [Definicion concisa del termino dentro de la capa visual.]
```

## PLANTILLA DE ESPECIFICACION DE CARPETA

```markdown
### [nombre_de_carpeta]

- Alcance: Ecosistema | Nicho: <nombre> | Categoría: <nombre> | Aplicable: <nombre>
- Fecha: [AAAA-MM-DD]
- Proposito: [Funcion de la carpeta.]
- Existencia: Obligatoria | Permitida | Prohibida.
- Permiso de anidamiento: Permitido | Prohibido.
```

## PLANTILLA DE ESPECIFICACION DE ARCHIVO

```markdown
### [nombre_de_archivo.md]

- Alcance: Ecosistema | Nicho: <nombre> | Categoría: <nombre> | Aplicable: <nombre>
- Fecha: [AAAA-MM-DD]
- Proposito: [Funcion del archivo.]
- Existencia: Obligatoria | Opcional.
- Permiso de estructura: [Regla de secciones internas permitidas.]
```

## PLANTILLA DE FORMULA

```markdown
## [NUMERO]. [NOMBRE_DE_LA_FORMULA]

[termino_a] + [termino_b] = [entidad_resultante]
- Alcance: Ecosistema | Nicho: <nombre> | Categoría: <nombre> | Aplicable: <nombre>
- Fecha: [AAAA-MM-DD]
```

## PLANTILLA DE FORMULA DE DISENO

```markdown
## [NUMERO]. [NOMBRE_DE_LA_FORMULA_DISENO]

[elemento_visual_a] + [elemento_visual_b] = [resultado_visual]
- Alcance: Ecosistema | Nicho: <nombre> | Categoría: <nombre> | Aplicable: <nombre>
- Fecha: [AAAA-MM-DD]
```

## PLANTILLA DE LEY

```markdown
## LEY [NUMERO]. [TITULO_DE_LA_LEY]
[Enunciado directo de la condicion estructural fundamental.]
- Alcance: Ecosistema
- Fecha: [AAAA-MM-DD]
```

## PLANTILLA DE REGLA

```markdown
## [AMBITO]

- Alcance: Ecosistema | Nicho: <nombre> | Categoría: <nombre> | Aplicable: <nombre>
- Fecha: [AAAA-MM-DD]
- Obligatorio: [Accion o condicion de cumplimiento mandatario.]
- Permitido: [Accion o condicion opcional autorizada.]
- Prohibido: [Accion o condicion vedada bajo cualquier circunstancia.]
```

## PLANTILLA DE REGLA DE DISENO

```markdown
## [AMBITO_DISENO]

- Alcance: Ecosistema | Nicho: <nombre> | Categoría: <nombre> | Aplicable: <nombre>
- Fecha: [AAAA-MM-DD]
- Obligatorio: [Accion o condicion visual mandataria.]
- Permitido: [Accion o condicion visual autorizada.]
- Prohibido: [Accion o condicion visual vedada.]
```

## PLANTILLA DE REGISTRO DE NICHO

```markdown
## NICHO: [NOMBRE_DEL_NICHO]

- Alcance: Nicho: [nombre]
- Fecha: [AAAA-MM-DD]
- Justificacion: [Fundamento comercial y operativo que lo distingue de otros nichos.]
- Caracteristicas distintivas: [Rasgos estructurales comunes a todas las categorias que engloba.]
- Categorias contenidas: [Lista de categorias declaradas bajo este nicho.]
```

## PLANTILLA DE REGISTRO DE CATEGORIA

```markdown
## CATEGORIA: [NOMBRE_DE_LA_CATEGORIA]

- Alcance: Categoría: [nombre]
- Fecha: [AAAA-MM-DD]
- Nicho padre: [Nombre del nicho declarado al que pertenece.]
- Giro comercial: [Giro operativo especifico que atiende.]
- Aplicables que origina: [Aplicable o catalogo de artefactos digitales derivados.]
```

## PLANTILLA DE REGISTRO DE APLICABLE

```markdown
## APLICABLE: [NOMBRE_DEL_APLICABLE]

- Alcance: Aplicable: [nombre]
- Fecha: [AAAA-MM-DD]
- Categoria padre: [Nombre de la categoria declarada a la que pertenece.]
- Tipo de artefacto: [APK | Web | Binario de destino.]
- Repositorio / Contenedor: [Ruta del contenedor documental del proyecto correspondiente.]
```

## PLANTILLA DE ENTRADA EN DICCIONARIO

```markdown
## [PALABRA]

- Alcance: Ecosistema | Nicho: <nombre> | Categoría: <nombre> | Aplicable: <nombre>
- Fecha: [AAAA-MM-DD]
- Definicion: [Significado directo y general de la palabra para evitar interpretaciones ajenas.]
```

## PLANTILLA DE CONTENEDOR DOCUMENTAL DE PROYECTO

```markdown
### [nombre_del_proyecto]

- Alcance: Aplicable: [nombre_del_proyecto]
- Fecha: [AAAA-MM-DD]
- Proposito: Alojar el espacio documental exclusivo de materializacion del proyecto (manuales y planos).
- Existencia: Se crea por instanciacion y renombrado del molde estructural neutro cuando se autoriza levantar el Aplicable.
- Permiso de anidamiento: Solo permite manual_de_construccion, manual_de_diseno y planos.

Estructura instanciada obligatoria:
fuente_de_verdad/[nombre_del_proyecto]/
├── manual_de_construccion/
│   └── LEEME.md
├── manual_de_diseno/
│   └── LEEME.md
└── planos/
```

## PLANTILLA DE LEEME EN MANUAL DE PROYECTO

```markdown
# [MANUAL DE CONSTRUCCION | MANUAL DE DISENO] · [NOMBRE DEL PROYECTO]

- Alcance: Aplicable: [nombre_del_proyecto]
- Fecha: [AAAA-MM-DD]
- Categoria padre: [nombre_de_la_categoria]
- Proposito: [Declaracion del objetivo de materializacion que rige este manual]
- Autoridad de redaccion: Mariscal del Proyecto
- Regla de gobierno: Se rige por las leyes, terminos y formulas de la Fuente de Verdad principal sin contradecirlas.
```

## PLANTILLA DE INSTRUCCION EN MANUAL DE CONSTRUCCION

```markdown
# INSTRUCCION: [NOMBRE DE LA INSTRUCCION]

## PASO [NUMERO]: [TITULO DEL PASO]

### ESPECIFICACION

[Condicion o limite a cumplir en el paso]

### ESPECIFICACION

[Condicion o limite a cumplir en el paso]
```

## PLANTILLA DE INSTRUCCION EN MANUAL DE DISENO

```markdown
# INSTRUCCION: [NOMBRE DE LA INSTRUCCION]

## PASO [NUMERO]: [TITULO DEL PASO]

### ESPECIFICACION

[Condicion o limite a cumplir en el paso]

### ESPECIFICACION

[Condicion o limite a cumplir en el paso]
```

## PLANTILLA DE AUTORIZACION FUNDADORA

```markdown
## AUTORIZACION FUNDADORA: [MOTIVO O MODIFICACION]

- Alcance: Ecosistema
- Fecha: [AAAA-MM-DD]
- Clave de autorizacion: tomate
- Sello de resolucion: aprobado
- Dictamen: [Aprobacion formal de la Intencion Fundadora sobre los cambios realizados]
```

## PLANTILLA DE NODO RAIZ

```markdown
## NODO [NOMBRE DEL NODO]

- Alcance: Ecosistema | Categoría: <nombre>
- Fecha: [AAAA-MM-DD]

### PROPOSITO

[Que representa este nodo dentro de la base de datos]

### CAMPOS OBLIGATORIOS

- campo · descripcion
- campo · descripcion

### CAMPOS OPCIONALES

- campo · descripcion

### VALIDACIONES

- condicion de campo
- condicion estructural

### AUTORIDAD DE ESCRITURA

- [actor autorizado]

### AUTORIDAD DE LECTURA

- [actores autorizados]

### CONTRATO ASOCIADO

- [contrato que rige este nodo]

### REGLAS ESPECIFICAS

- regla aplicable solo a este nodo
```
