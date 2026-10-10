# ENSAMBLAJE Y PASOS: IMPRESION TERMICA ESC/POS
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

## PASO 01: Contrato de impresion
### ESPECIFICACION
- Se ensambla el contrato `setPrinter`, `loadPersistedConfig`, `getPrinter`, `hasPrinter` e `imprimir*` que devuelven `PrintResult = { success, message, jobId? }` (ver §1 de `02_contratos_y_tipos.md`).
- `imprimirComanda`, `imprimirCuenta`, `imprimirTicketVenta`, `imprimirPrueba` comparten el mismo resultado tipado.
- `success:false` implica `message` accionable, nunca una excepcion lanzada a la capa de negocio.

## PASO 02: Adaptadores de transporte
### ESPECIFICACION
- Se ensambla `AdaptadorBluetooth` como unica via de emision de bytes al dispositivo termico.
- La configuracion de impresora persiste via `loadPersistedConfig` y se recupera en arranque sin bloquear.
- Sin impresora (`hasPrinter() === false`), la venta no se detiene: el ticket se enruta a cola para reintento.

## PASO 03: Cola y DespachadorCola
### ESPECIFICACION
- Se ensambla `DespachadorCola` con TTL 48 horas, arranque no bloqueante y claim por instancia (`_lockedBy === idInstancia`).
- `onChildAdded` escucha trabajos nuevos; el garbage collector elimina expirados sin tocar recientes.
- Cada reintento incrementa `attempts`; nunca se descarta un trabajo pendiente sin confirmacion.

## PASO 04: Formateo y construccion de trama
### ESPECIFICACION
- Se ensambla `TicketFormatter` (partida -> ticket) y `ConstructorEscPos` segun `esc_pos/02_contrato_bytes_control.md`.
- Todo ticket inicia con `INIT` y `CODEPAGE_437` antes de texto; el corte usa `CUT_FULL` (`GS V 0`) o `CUT_PARTIAL` (`GS V 1`); cajon usa `OPEN_DRAWER`.
- Una partida de cocina puede derivar ticket con destinatario de area; una venta cobrada porta ticket si hay impresora.

## PASO 05: Persistencia de tickets
### ESPECIFICACION
- Se ensambla `tickets.repo` para registrar el resultado `exito`/`fallo` de cada trabajo tras el corte.
- El estado `SpoolStatus` (`pendiente_aprobacion -> pendiente_impresion -> impresion_enviada -> exito | fallo`) se refleja en la cola.
- El flujo `partida -> TicketFormatter -> print_queue -> ConstructorEscPos -> AdaptadorBluetooth -> corte -> estado -> tickets.repo` se respeta sin salto.
