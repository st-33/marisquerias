# CONCEPTOS Y REGLAS: IMPRESION TERMICA ESC/POS

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

## QUE HACE ESTE SUBSISTEMA

Cuando una comanda sale hacia cocina o una venta se cobra, el sistema emite un ticket en una impresora termica. Este subsistema define como se forman los tickets y como viajan los comandos de impresion hacia la impresora fisica, incluyendo el corte del papel y la apertura del cajon de efectivo.

## REGLAS EN LENGUAJE COMUN

- Toda partida enviada a cocina puede producir un ticket destinado a su area correspondiente.
- Toda venta cobrada produce un ticket con detalle, total y modalidad (por orden o por peso).
- Si la impresora falla (papel atascado o sin papel), la impresion no se pierde: queda en una cola y se reintenta hasta lograr emitirla.
- Los tickets de prueba permiten verificar que la impresora esta bien configurada antes de usarla en la operacion.

## POR QUE IMPORTA

Sin ticket no hay comprobante, y sin comprobante se pierde la trazabilidad de la venta y de la comanda. La impresion es parte del flujo de cobro, no un extra.
