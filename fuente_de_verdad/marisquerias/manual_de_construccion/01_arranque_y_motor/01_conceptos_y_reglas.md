# CONCEPTOS Y REGLAS: ARRANQUE Y MOTOR
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

## Qué hace el aplicativo al encenderse

Cuando alguien abre el sistema en un teléfono, una tableta o una caja, lo primero que ocurre es un "arranque" que prepara todo lo necesario antes de mostrar cualquier pantalla de trabajo. Ese arranque se encarga de tres cosas, en orden:

1. **Validar el acceso.** El sistema comprueba quién es la persona que quiere entrar y si tiene permiso para hacerlo. Nadie puede operar sin haberse identificado correctamente.

2. **Identificar el dispositivo.** Cada equipo que usa el negocio (la caja del mostrador, la tableta de cocina, el teléfono del repartidor) se reconoce a sí mismo para saber desde dónde se está trabajando. Eso evita confusiones sobre qué equipo está haciendo qué.

3. **Leer la configuración del negocio.** El sistema carga los datos de "cómo trabaja este local": qué mesas existen, qué menú está vigente, qué impuestos o precios se aplican, qué turnos hay. Sin esa configuración cargada, no se puede trabajar de forma segura.

## El motor de reglas

El "motor de reglas" es el árbitro de la operación. Imagínalo como un juez que decide, en cada momento, si un pedido puede pasar de un estado al siguiente o no.

Un pedido siempre avanza por pasos que tienen un orden lógico. Por ejemplo, una comanda no puede marcarse como "entregada" si todavía no pasó por cocina, y un pedido no puede cobrarse dos veces. El motor de reglas es quien valida cada uno de esos movimientos:

- **Solo permite transiciones válidas.** Si alguien intenta saltarse un paso o hacer un cambio que no corresponde, el motor lo rechaza.
- **Mantiene el orden del negocio.** Garantiza que lo que ocurre en la pantalla corresponda a lo que realmente pasa en el salón, en cocina o en mostrador.
- **Evita errores y duplicados.** Nadie puede marcar dos veces lo mismo ni cerrar algo que todavía está abierto.

En lenguaje común: el motor de reglas es el guardián de que cada pedido avance paso a paso, sin atajos ni saltos que rompan el negocio.

## La regla de la sesión y la identidad

Existe una regla que se cumple siempre, sin excepciones:

> **Ninguna pantalla de trabajo se muestra antes de tener sesión e identidad resuelta.**

Esto quiere decir que el sistema primero resuelve dos cosas:

- **La sesión:** que haya alguien realmente conectado y autorizado.
- **La identidad:** que se sepa con certeza quién es esa persona y qué rol cumple.

Solo cuando ambas están resueltas, se muestran las pantallas de operación. Antes de eso, solo puede verse lo mínimo necesario para identificarse (por ejemplo, la pantalla de acceso). De esta forma, nadie opera de forma anónima y cada acción queda asociada a una persona y a un rol concretos.
