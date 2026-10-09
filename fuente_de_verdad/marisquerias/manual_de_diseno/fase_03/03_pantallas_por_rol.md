# INSTRUCCION: PANTALLAS POR ROL

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 03

## ORIGEN

- Terminos: PANTALLA, ROL OPERATIVO, CARRITO, KPI, MESA, PARTIDA, MOSTRADOR, COCINA, REPARTO.
- Formulas: pantalla + ruta = unidad_navegable; rol_operativo + pantalla = capacidad_habilitada.
- Reglas: CONSISTENCIA VISUAL (rubro en reglas_diseno.md).
- Fuente real: `DESIGN.md` seccion 7 y `src/ui/pantallas/*`, `src/ui/roles/*`.

## PASO 01: SHELL COMPARTIDO

### ESPECIFICACION

- El shell incluye cabecera breve con nombre de pantalla, contexto operativo y senal de conectividad.
- La navegacion no oculta una venta o comanda en curso sin advertencia.

## PASO 02: PANTALLA DE ADMINISTRADOR

### ESPECIFICACION

- Inicia con resumen de ventas y alertas que conduzcan a una accion.
- Los modulos Menu, Inventario, Mesas, Dispositivos y Reparto aparecen como entradas claras con estado breve.

## PASO 03: PANTALLA DE MOSTRADOR

### ESPECIFICACION

- Se divide en seleccion, detalle de venta y cierre; el carrito permanece visible y el total queda anclado.
- Para productos por peso, la lectura muestra peso, unidad, estabilidad y error; sin bascula se ofrece entrada manual o cancelacion explicita, nunca una lectura simulada.

## PASO 04: PANTALLA DE MESERO

### ESPECIFICACION

- Comienza por la mesa y termina en comanda enviada o cuenta solicitada.
- Las mesas comunican estado (libre, ocupada, pendiente, cuenta solicitada, bloqueada) con texto y senal visual.

## PASO 05: PANTALLA DE COCINA (KDS)

### ESPECIFICACION

- Prioriza lectura a distancia; cada comanda muestra numero, mesa o canal, tiempo transcurrido y lineas agrupadas.
- Los estados avanzan de forma inequivoca: recibida -> en preparacion -> lista -> entregada.

## PASO 06: PANTALLA DE REPARTO

### ESPECIFICACION

- Trata el estado de entrega como secuencia de trabajo: pendiente, asignado, en camino, entregado, incidencia.
- Las acciones destructivas o irreversibles solicitan confirmacion y explican el efecto.
