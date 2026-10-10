# ENSAMBLAJE Y PASOS: MOSTRADOR Y VENTA EN CRUDO
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

## PASO 01: Persistencia de la venta
### ESPECIFICACION
- Se ensambla la persistencia sobre `SimpleSalesRepo` y RTDB `{rutaNegocio}/ventas` (ver §4 de `02_contratos_y_tipos.md`).
- La venta queda en `ventas_offline` con `syncStatus: 'pending'` hasta confirmacion remota (subsistema 10).
- Nada se pierde sin red: el registro pendiente se drena en reconexion.

## PASO 02: Carrito del mostrador
### ESPECIFICACION
- Se ensambla `useMostradorPro` cuyo carrito acumula `ItemPendiente` con precio por unidad o por peso.
- El carrito permanece visible mientras se agregan productos; el total anclado queda en zona de alcance.
- El total anclado es la suma de partidas; por peso usa `peso * precioPorUnidad`.

## PASO 03: Lectura de bascula en el mostrador
### ESPECIFICACION
- Se ensambla la lectura de peso (subsistema 05) dentro del mostrador: muestra peso, unidad, estabilidad y error.
- Sin bascula se usa entrada manual o cancelacion explicita; nunca una lectura simulada.
- El peso ausente bloquea el cobro por peso con retroalimentacion explicita, sin propagar excepcion.

## PASO 04: Cobro por peso u orden
### ESPECIFICACION
- Se ensambla `useVentaCrudoAdmin` que gobierna el flujo de venta por peso desde administracion, y la venta cruda que liquida sin comanda de salon.
- El despacho descuenta inventario en la misma operacion de venta (atomico, subsistema 05).
- `resolverDeviceIdADI` vincula la identidad del dispositivo al mostrador antes de registrar la venta.

## PASO 05: Emision de ticket
### ESPECIFICACION
- Se ensambla la emision de ticket por cada venta cobrada, delegando a la capa de impresion (subsistema 06).
- Una venta en crudo por peso no genera comanda de salon ni pasa por el ciclo de cocina.
- El flujo `bascula -> useMostradorPro(carrito) -> cobro -> SimpleSalesRepo/RTDB ventas -> ticket` se respeta en ese orden.
