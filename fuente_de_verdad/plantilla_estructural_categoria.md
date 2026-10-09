# ESPECIFICACION · PLANTILLA ESTRUCTURAL DE CATEGORIA Y CAPACIDADES

- Alcance: Ecosistema
- Fecha: 2026-10-08

## 1. Proposito

- Alcance: Ecosistema
- Fecha: 2026-10-08

Una categoria representa un giro comercial especifico dentro de un nicho.

La categoria define la estructura completa que puede tener el aplicable correspondiente a ese giro comercial.

La estructura de la categoria funciona como plantilla de origen para los aplicables que se originan de ella.

La categoria no representa un aplicable individual compilado, sino el modelo estructural del giro.

## 2. Plantilla estructural

- Alcance: Ecosistema
- Fecha: 2026-10-08

La plantilla de una categoria contiene la estructura completa disponible para el giro comercial correspondiente.

La estructura puede representarse mediante un esquema formal (como JSON o definiciones de tipos) definido por la especificacion correspondiente.

El esquema representa la estructura de la plantilla; no constituye por si mismo el aplicable materializado.

La plantilla debe contener unicamente estructuras que realmente pertenezcan al giro comercial definido por la categoria.

## 3. Derivacion del aplicable

- Alcance: Ecosistema
- Fecha: 2026-10-08

Un aplicable pertenece a una categoria y se deriva de la plantilla estructural de esa categoria.

La configuracion del aplicable determina que partes de la plantilla le pertenecen realmente.

La derivacion no consiste en conservar todos los nodos de la plantilla y asignarles valores `true` o `false`.

Cuando una capacidad no pertenece al aplicable, la estructura correspondiente no existe en el resultado derivado.

Cuando una capacidad pertenece al aplicable, la estructura correspondiente existe de forma efectiva.

Por tanto:

```text
PLANTILLA DE CATEGORIA
        ↓
seleccion de capacidades aplicables
        ↓
estructura derivada
        ↓
APLICABLE
```

## 4. Capacidades

- Alcance: Ecosistema
- Fecha: 2026-10-08

Una capacidad representa una posibilidad funcional que la categoria puede ofrecer y que puede incorporarse o no a un aplicable de esa categoria.

La categoria determina que capacidades pueden existir dentro de su giro comercial.

El aplicable unicamente puede recibir capacidades contempladas por su categoria.

Una capacidad no debe introducir por si misma una estructura ajena a la plantilla de la categoria.

## 5. Estructura resultante

- Alcance: Ecosistema
- Fecha: 2026-10-08

La estructura resultante del aplicable debe corresponder unicamente a las capacidades que realmente existen para ese artefacto.

Por tanto, la ausencia de una capacidad se representa mediante la ausencia de la estructura correspondiente.

El uso de valores booleanos como `true` o `false` no sustituye esta regla estructural.

Los valores booleanos solamente deben utilizarse cuando el dato representado sea realmente un estado binario legitimo y no una forma de ocultar una estructura que no pertenece al aplicable.

## 6. Relacion entre categoria, capacidad y aplicable

- Alcance: Ecosistema
- Fecha: 2026-10-08

La relacion estructural queda expresada asi:

```text
CATEGORIA
    ↓
define capacidades posibles
    ↓
PLANTILLA ESTRUCTURAL
    ↓
seleccion de capacidades
    ↓
ESTRUCTURA DEL APLICABLE
```

Un aplicable no puede adquirir una capacidad que su categoria no contempla.

Un aplicable puede utilizar solamente las estructuras correspondientes a las capacidades que le fueron asignadas.

## 7. Principio de existencia real

- Alcance: Ecosistema
- Fecha: 2026-10-08

Los nodos de la estructura del aplicable no deben existir unicamente para representar posibilidades hipoteticas.

Si una estructura pertenece realmente al aplicable, existe.

Si no pertenece al aplicable y no es necesaria para representar otro estado valido, no debe conservarse como estructura vacia unicamente para indicar `false`.

La estructura debe representar aquello que realmente existe.

## 8. Relacion con la Unidad Central

- Alcance: Ecosistema
- Fecha: 2026-10-08

La Unidad Central gobierna a nivel macro el catalogo de categorias y sus capacidades permitidas.

La categoria proporciona el universo de capacidades y estructura aplicable.

La configuracion del aplicable determina las capacidades que le corresponden dentro de ese universo.

La aplicacion materializada utiliza la estructura resultante.

La Unidad Central no interviene en la operacion diaria interna del aplicable.

## 9. Regla de derivacion

- Alcance: Ecosistema
- Fecha: 2026-10-08

La estructura de un aplicable se obtiene a partir de:

```text
categoria + plantilla_estructural_de_categoria + capacidad = aplicable
```

Esta relacion describe una derivacion estructural directa.

## 10. Regla de correspondencia

- Alcance: Ecosistema
- Fecha: 2026-10-08

Toda estructura incorporada a un aplicable debe poder relacionarse con una estructura existente en la plantilla de su categoria o con una estructura explicitamente permitida por la especificacion de esa categoria.

No se deben introducir estructuras arbitrarias en un aplicable mediante configuracion externa.

## 11. Separacion de niveles

- Alcance: Ecosistema
- Fecha: 2026-10-08

La plantilla de categoria pertenece al nivel de definicion del giro comercial.

La estructura derivada pertenece al aplicable concreto.

La Fuente de Verdad principal define las reglas generales que permiten esta derivacion.

Las especificaciones particulares de una categoria pertenecen al alcance correspondiente de esa categoria (`Alcance: Categoria: <nombre>`) y no deben confundirse con la especificacion general del Ecosistema.

## 12. Principio final

- Alcance: Ecosistema
- Fecha: 2026-10-08

La configuracion no debe simular existencia.

La estructura debe representar existencia real.

Cuando una capacidad existe para el aplicable, su estructura existe.

Cuando una capacidad no existe para el aplicable, su estructura se omite.
