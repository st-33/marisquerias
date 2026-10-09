# INSTRUCCION: COMANDAS Y ELABORACION

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 03

## ORIGEN

- Terminos: COMANDAL, PARTIDA, MESA, COCINA, TICKET, VENTA POR ORDEN.
- Formulas: (producto + variante + cantidad = partida) y (partida + partida = comanda).
- Reglas: COMANDAS Y ELABORACION (rubro en reglas.md).
- Codigo real inspeccionado: `src/logica/dominio/status.ts`, `src/roles/logica/mesero/*`, `src/roles/logica/cocina/*`, `src/sistema/servicios/ModeradorComandas.ts`.

## PASO 01: CICLO DE VIDA DE LA COMANDAL

### ESPECIFICACION

- La comanda transita por los estados canonicos: creado -> enviado_cocina -> en_preparacion -> listo_para_entregar -> entregado -> cerrado.
- `src/logica/dominio/status.ts` declara el tipo `OrderStatus` y su mapeo canonico (normaliza estados legacy a los canonicos).

## PASO 02: CICLO DE VIDA DE LA PARTIDA

### ESPECIFICACION

- La partida es la unidad indivisible de la comanda y transita por los estados: nuevo -> en_preparacion -> listo -> entregado.
- `ItemStatus` declara este ciclo; `isItemBillable` determina si una partida es facturable (en_preparacion, listo o entregado).

## PASO 03: MESA Y SUS ESTADOS

### ESPECIFICACION

- La mesa transita de forma secuencial por los estados: libre -> ocupada -> cuenta.
- `TableState` declara este ciclo; la capacidad de mesas se gobierna bajo la feature `restaurante.mesas`.

## PASO 04: ENVIO A COCINA

### ESPECIFICACION

- `src/roles/logica/mesero/procesarPedido.ts` procesa la comanda del mesero y dispara su envio a cocina.
- `src/capacidades/cocina/SincronizadorCocina.ts` sincroniza las partidas hacia la vista de cocina (KDS).

## PASO 05: MODERACION DE COMANDAS

### ESPECIFICACION

- `src/sistema/servicios/ModeradorComandas.ts` arbitra la transicion de estados de comandas y partidas asegurando que solo transiten por la cadena declarada.

## PASO 06: DESCUENTO DE INVENTARIO POR RECETA

### ESPECIFICACION

- `src/roles/logica/mesero/descontarInventario.ts` descuenta los insumos del inventario a partir de la receta del producto al elaborar cada partida.
