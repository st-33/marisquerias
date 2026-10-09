# INSTRUCCION: INVENTARIO Y DESPACHO POR PESO

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 05

## ORIGEN

- Terminos: INVENTARIO, EXISTENCIA, MERMA, BASCULA, DESPACHO POR PESO, MARISCO.
- Formulas: (existencia - merma = existencia_ajustada) y (marisco + bascula + peso = despacho_por_peso).
- Reglas: DESPACHO POR PESO Y BASCULA (rubro en reglas.md).
- Codigo real inspeccionado: `src/capacidades/inventario/*`, `src/sistema/persistencia/inventario.repo.ts`, `src/capacidades/pos/useMostradorPro.ts`, `src/capacidades/mostrador/useVentaCrudoAdmin.ts`.

## PASO 01: PERSISTENCIA DE INVENTARIO

### ESPECIFICACION

- `src/sistema/persistencia/inventario.repo.ts` y `contratos-inventario.ts` declaran el contrato de existencias de insumos, mariscos y productos.
- `src/capacidades/inventario/useInventario.ts` expone la logica de gestion y consulta de inventario.

## PASO 02: AJUSTE DE EXISTENCIAS Y MERMA

### ESPECIFICACION

- La merma se registra para ajustar la existencia real del insumo (deterioro o desecacion del marisco).
- El panel `PanelInventario` permite registrar el ajuste de existencias.

## PASO 03: LECTURA DE BASCULA

### ESPECIFICACION

- La bascula es un dispositivo de hardware (`TipoDispositivo: 'bascula'`) que transmite el peso del marisco al punto de venta.
- La lectura se expresa en la unidad de peso declarada y se valida antes del cobro.

## PASO 04: DESPACHO POR PESO

### ESPECIFICACION

- En la modalidad de venta por peso el precio se calcula a partir del peso registrado por la bascula y no por unidad.
- `useVentaCrudoAdmin` y `useMostradorPro` gobiernan el flujo de venta por peso en mostrador.

## PASO 05: DESCUENTO AUTOMATICO

### ESPECIFICACION

- El despacho por peso descuenta la existencia correspondiente del inventario en la misma operacion de venta.
