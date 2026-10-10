# CONCEPTOS Y REGLAS: INVENTARIO, BASCULA Y DESPACHO POR PESO

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

## QUE HACE ESTE SUBSISTEMA

El corazon del negocio marisquero es vender marisco fresco por peso. El cliente senala el camaron o el pescado que quiere, el mostrador lo coloca en la bascula, el peso exacto se transmite al punto de venta y el precio se calcula multiplicando el peso por el precio por kilo (o por la unidad declarada).

## REGLAS EN LENGUAJE COMUN

- El precio por peso se calcula siempre a partir de la lectura real de la bascula, nunca de un peso inventado a mano.
- Si la bascula no esta disponible, la interfaz debe ofrecer entrada manual o cancelacion clara; jamás simular una lectura.
- El inventario es el registro de lo que hay (mariscos, insumos, productos); cada venta o elaboracion lo descuenta.
- La merma es la perdida natural (pescado que se deteriora); siempre se registra con su motivo para que el inventario refleje la existencia real.
- Nada se descuenta dos veces: la venta por peso descuenta la existencia en el mismo momento de cobrar.

## POR QUE IMPORTA

Una bascula mal leida significa cobrar de mas o de menos al cliente y perder el control del stock de marisco, que es el activo mas perecedero del negocio. Por eso este subsistema existe como contrato formal y no como una funcion suelta.
