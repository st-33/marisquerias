# INSTRUCCION: IMPRESION Y TICKETS

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 06

## ORIGEN

- Terminos: IMPRESORA TERMICA, TICKET, PARTIDA, COCINA.
- Formulas: partida + impresora_termica = ticket_cocina.
- Reglas: IMPRESION Y TICKETS.
- Codigo real: `src/sistema/impresion/fierros/*`, `src/sistema/servicios/ContratoHardware.ts`, `src/sistema/persistencia/tickets.repo.ts`.

## CONTRATO DE ENTRADA

- `ContratoHardware` define la interfaz de impresion y bascula (abstraccion total).
- `PrintResult = { success: boolean; message: string; jobId?: string }`.

## PASO 01: CONTRATO DE IMPRESORA

### ESPECIFICACION

- Metodos del contrato:
  - `setPrinter(address, name): Promise<void> | void`
  - `loadPersistedConfig(): Promise<void>`
  - `getPrinter(): { address: string | null; name: string | null }`
  - `hasPrinter(): boolean`
  - `imprimirComanda(pedido, opciones?): Promise<PrintResult>`
  - `imprimirCuenta(pedido, opciones?): Promise<PrintResult>`
  - `imprimirTicketVenta(venta): Promise<PrintResult>`
  - `imprimirPrueba(mensaje?): Promise<PrintResult>`

## PASO 02: ADAPTADORES DE PROTOCOLO

### ESPECIFICACION

- `AdaptadorBluetooth.ts` y `AdaptadorEscPos.ts` implementan los protocolos bluetooth-classic/bluetooth-le y ESC/POS.
- `IControladorFierros` y `tipos.ts` declaran el contrato del controlador.

## PASO 03: COLA Y DESPACHO

### ESPECIFICACION

- `DespachadorCola.ts` encola trabajos de impresion y los despacha con TTL de 48 horas y arranque no bloqueante.
- Estados de spool: `pendiente_aprobacion` -> `pendiente_impresion` -> `impresion_enviada` -> `exito` | `fallo`.

## PASO 04: HUB GLOBAL

### ESPECIFICACION

- `GestorHub.tsx` expone `GestorHubGlobal` montado en el layout raiz.
- `EstadoHub.ts` mantiene el estado del hub; `ServicioFierros` es singleton (`servicioFierros`).

## PASO 05: FORMATEO Y PERSISTENCIA

### ESPECIFICACION

- `TicketFormatter.ts` formatea cabecera, detalle, total y modalidad (orden o peso).
- `tickets.repo.ts` persiste tickets bajo `{rutaNegocio}/tickets` para consulta y reimpresion.

## CONTRATO DE SALIDA

- Toda partida de cocina puede derivar un ticket con destinatario de area; toda venta cobrada porta ticket si la impresora esta disponible; `PrintResult.success` falso implica mensaje de error por el que reintentar.
