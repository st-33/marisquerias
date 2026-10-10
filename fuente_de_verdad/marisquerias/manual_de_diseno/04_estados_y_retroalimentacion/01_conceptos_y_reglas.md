# CONCEPTOS Y REGLAS: ESTADOS Y RETROALIMENTACION
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

## Los estados que toda pantalla debe cubrir

Ninguna pantalla está siempre "llena y funcionando". En la vida real de una
marisquería aparecen momentos donde no hay datos, algo falla o se está
esperando. Toda pantalla debe tener respuesta visual para cada uno de estos
estados:

- **Cargando:** se está trayendo información; se muestra una señal de espera
  clara para que nadie crea que la app se congeló.
- **Vacío:** no hay nada todavía porque nadie ha creado contenido (por ejemplo,
  un catálogo sin platos cargados).
- **Sin resultados:** se buscó algo y no se encontró nada que coincida.
- **Sin conexión:** el dispositivo no tiene red; se avisa que la comunicación
  está caída sin bloquear el trabajo local.
- **Error recuperable:** algo falló, pero se puede intentar de nuevo; se indica
  qué pasó y se ofrece la forma de reintentar.
- **Permiso insuficiente:** el usuario intentó algo que su rol no le permite; se
  explica con claridad, sin dejarlo a mitad de camino.
- **Éxito:** algo terminó bien (venta cerrada, pedido enviado); se confirma
  brevemente y de forma visible.
- **Pendiente:** algo está a la espera (un pedido en cola, una impresión por
  salir); se muestra que está en proceso, no que desapareció.

Cubrir estos estados evita pantallas "muertas" o en blanco que confundan al
personal en plena operación.

## Regla: nunca se pierde el contexto de una venta

El peor momento para mostrar un error es en medio de cobrar o armar una venta.
Si el problema aparece y borra todo lo que el usuario estaba haciendo, el
negocio pierde tiempo y dinero.

**Regla:** nunca se pierde el contexto de una venta para mostrar un error. Es
decir:

- Si algo falla durante una venta, el error se muestra **sin descartar** el
  carrito, la mesa o el total en curso.
- La información de la venta permanece intacta y visible, para que el usuario
  pueda resolver el problema y continuar donde estaba.
- Los avisos de error, sin conexión o permiso aparecen de forma que no tapan ni
  borran lo que se estaba vendiendo.

El contexto de la venta es sagrado: se protege por encima de cualquier mensaje.
