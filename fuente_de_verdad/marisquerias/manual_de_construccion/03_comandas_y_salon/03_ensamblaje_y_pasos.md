# ENSAMBLAJE Y PASOS: COMANDAS Y SALON
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

## PASO 01: Ciclo de vida de la comanda
### ESPECIFICACION
- Se ensambla el ciclo sobre `OrderStatus` (`creado -> enviado_cocina -> en_preparacion -> listo_para_entregar -> entregado -> cerrado`) sin saltar estados.
- La normalización `toOrderCanonical` mapea legados (`abierto`, `enviada_cocina`, `preparando`, `lista`) al estado canónico (ver §2 de `02_contratos_y_tipos.md`).
- `isOrderActive` y `isItemBillable` rigen qué operación puede moverse y qué partida es facturable.

## PASO 02: Ciclo de la partida (item)
### ESPECIFICACION
- Se ensambla el ciclo de `ItemStatus` (`nuevo -> en_preparacion -> listo -> entregado`) con `toItemCanonical` normalizando `en_cocina/preparando -> en_preparacion` y `lista -> listo`.
- `ItemPendiente` es el borrador del mesero; `ItemPedido` es de solo lectura en UI: el estado lo mueve el núcleo (`02_contratos_y_tipos.md` §3).
- Toda transición de partida pasa por el núcleo; la UI nunca escribe `estado` directamente.

## PASO 03: Estado de mesa
### ESPECIFICACION
- Se ensambla `TableState` (`libre -> ocupada -> cuenta`) sin saltos: una mesa no pasa de `libre` a `cuenta` sin `ocupada`.
- `MesaConLayout` extiende `Mesa` con `posX`, `posY` y `shape: 'square' | 'round'`, manteniendo el layout del salón.
- La pertenencia de una comanda a mesa es estable mientras dure el ciclo; no se reasigna una mesa con comanda viva.

## PASO 04: Borrador del mesero
### ESPECIFICACION
- Se ensambla el borrador como `ItemPendiente` persistido en SQLite `drafts.repo` antes de enviarse a cocina (ver subsistema 10).
- Los ítems del borrador conservan `precioBase`, `deltaPrecio`, `preparacion` y `prepMinutos` sin pérdida de variantes.
- Un borrador no modifica inventario ni comanda hasta `procesarPedido`.

## PASO 05: Envio a cocina (SincronizadorCocina/KDS)
### ESPECIFICACION
- Se ensambla `SincronizadorCocina` que entrega la orden al KDS (`kds/02_contrato_kds.md`), convirtiendo partidas a `ItemCocina`/`OrdenCocina`.
- El motor KDS (`KitchenQueueEngine`, umbral 15 min) no se conecta a Firebase directamente; recibe ordenes por socket LAN o DB local.
- La orden se marca urgente cuando `tiempoTranscurrido > urgentThresholdMs`, elevando presentación sin romper FIFO.

## PASO 06: Moderacion y descuento por receta
### ESPECIFICACION
- Se ensambla `ModeradorComandas` que arbitra transiciones de comanda y partida segun los invariantes.
- El descuento de inventario ocurre por receta al elaborar cada partida (`02_contratos_y_tipos.md` §3), no al crear el borrador.
- Tras `entregado`, la comanda pasa a `cuenta/cerrado` y queda lista para la capa de impresión (subsistema 06) sin descuento adicional.
