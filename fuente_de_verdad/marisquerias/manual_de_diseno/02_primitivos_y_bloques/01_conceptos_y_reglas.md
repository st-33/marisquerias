# CONCEPTOS Y REGLAS: PRIMITIVOS Y BLOQUES
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

## Tres niveles: primitivo, bloque y componente

Para que el diseño sea consistente, se organiza en tres niveles de construcción,
de lo más pequeño a lo más completo:

- **Primitivo:** la pieza mínima, indivisible. Un botón, una etiqueta, un
  cuadro de texto, un color, un tamaño de letra. No se puede dividir más sin
  dejar de funcionar. Es el ladrillo de todo lo demás.
- **Bloque:** una agrupación funcional de primitivos que juntos cumplen una
  tarea. Por ejemplo, la tarjeta de un plato (foto + nombre + peso + precio) o
  la fila de una mesa (número + estado + cuenta). Tiene un propósito concreto.
- **Componente reutilizable:** un bloque ya pensado para usarse muchas veces en
  distintos lugares sin rediseñarlo. Se repite tal cual, cambiando solo su
  contenido, para que la app se sienta siempre igual.

La idea de fondo: no se construye cada pantalla desde cero, sino combinando
primitivos y bloques que ya existen y están aprobados.

## La relación entre los niveles

- Un **bloque** se arma con **primitivos**.
- Un **componente** es un **bloque** elevado a estándar reutilizable.
- Cada nivel hereda la disciplina del anterior: el mismo color semántico, el
  mismo espaciado, la misma forma de comunicar.

## Regla: todo botón declara qué hace

En una app de venta rápida no hay lugar para la ambigüedad. El usuario no debe
adivinar a qué lleva nada.

**Regla:** todo botón declara qué hace y nada parece interactivo sin producir
una consecuencia visible. Esto significa:

- Cada botón lleva una etiqueta clara de su acción: "Cobrar", "Enviar a
  cocina", "Cancelar", "Agregar al carrito".
- Nada se ve "presionable" si al tocarlo no va a pasar nada. Lo que no produce
  un efecto visible no debe aparentar ser interactivo.
- Toda acción produce una consecuencia que se ve de inmediato: un cambio en la
  pantalla, una confirmación, un movimiento a otra sección.

Así, el mesero en plena prisa puede confiar en que cada cosa que toca hizo
exactamente lo que decía.
