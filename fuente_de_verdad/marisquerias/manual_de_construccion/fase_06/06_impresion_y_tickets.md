# INSTRUCCION: IMPRESION Y TICKETS

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 06

## ORIGEN

- Terminos: IMPRESORA TERMICA, TICKET, PARTIDA, COCINA.
- Formulas: partida + impresora_termica = ticket_cocina.
- Reglas: IMPRESION Y TICKETS (rubro en reglas.md).
- Codigo real inspeccionado: `src/sistema/impresion/fierros/*`, `src/sistema/servicios/TicketFormatter.ts`, `src/sistema/persistencia/tickets.repo.ts`.

## PASO 01: ABSTRACTIÓN DE DISPOSITIVOS DE IMPRESION

### ESPECIFICACION

- `src/sistema/impresion/fierros/contratos/IControladorFierros.ts` y `tipos.ts` declaran el contrato del controlador de impresion.
- Los adaptadores `AdaptadorBluetooth.ts` y `AdaptadorEscPos.ts` implementan los protocolos de conexion bluetooth y ESC/POS.

## PASO 02: COLA Y DESPACHO DE IMPRESION

### ESPECIFICACION

- `src/sistema/impresion/fierros/cola/DespachadorCola.ts` encola los trabajos de impresion y los despacha con tolerancia a expiracion.
- `src/sistema/impresion/fierros/estado/EstadoHub.ts` mantiene el estado del hub de impresion.

## PASO 03: HUB GLOBAL DE IMPRESION

### ESPECIFICACION

- `src/sistema/impresion/fierros/hub/GestorHub.tsx` expone `GestorHubGlobal` que se monta en el layout raiz para orquestar los dispositivos.

## PASO 04: FORMATEO DE TICKET

### ESPECIFICACION

- `src/sistema/servicios/TicketFormatter.ts` formatea el contenido del ticket: cabecera, detalle, total y modalidad de venta (orden o peso).
- Todo ticket de cocina deriva de una partida y porta su destinatario de area.

## PASO 05: PERSISTENCIA DE TICKETS

### ESPECIFICACION

- `src/sistema/persistencia/tickets.repo.ts` registra los tickets emitidos para su consulta y reimpresion.
