# INSTRUCCION: INVENTARIO Y DESPACHO POR PESO

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 05

## ORIGEN

- Terminos: INVENTARIO, EXISTENCIA, MERMA, BASCULA, DESPACHO POR PESO, MARISCO.
- Formulas: existencia - merma = existencia_ajustada; marisco + bascula + peso = despacho_por_peso.
- Reglas: DESPACHO POR PESO Y BASCULA.
- Codigo real: `src/capacidades/inventario/useInventario.ts`, `src/sistema/persistencia/inventario.repo.ts`, `src/sistema/servicios/ContratoHardware.ts`, `src/capacidades/pos/useMostradorPro.ts`.

## CONTRATO DE ENTRADA

- `useInventario({ db: Database; rutaNegocio: string })` es el cerebro de inventario.
- Unidad canonica de despacho: `coerceUnidad -> 'kg' | 'g' | 'l' | 'ml' | 'pza' | 'caja'`.

## PASO 01: PERSISTENCIA DE INVENTARIO

### ESPECIFICACION

- `inventario.repo.ts` y `contratos-inventario.ts` declaran el contrato de existencias bajo `{rutaNegocio}/inventario`.
- Existencia: `{ insumoId, cantidad, unidad, minimo? }`.

## PASO 02: AJUSTE DE EXISTENCIAS Y MERMA

### ESPECIFICACION

- `existencia - merma = existencia_ajustada`; la merma registra el motivo (deterioro o desecacion).
- `PanelInventario` registra el ajuste; ninguna merma queda sin motivo.

## PASO 03: CONTRATO DE BASCULA

### ESPECIFICACION

- `ContratoHardware` declara la interfaz de bascula:
  - `setScale({ address, name, unidadPorDefecto, precision, tara?, timeout? }): void`
  - `leerPeso({ aplicarTara?, esperarEstabilidad?, timeout? }): Promise<{ success, peso?, unidad?, message?, estable? }>`
  - `tararBascula(): Promise<{ success, peso?, unidad?, message? }>`
  - `hasScale(): boolean`

## PASO 04: DESPACHO POR PESO

### ESPECIFICACION

- Precio calculado `peso * precioPorUnidad`; la lectura muestra peso, unidad, estabilidad y error.
- `useMostradorPro()` gobierna el carrito y el cobro.
- Sin bascula disponible: la interfaz ofrece entrada manual o cancelacion explicita; nunca lectura simulada.

## PASO 05: DESCUENTO AUTOMATICO

### ESPECIFICACION

- El despacho descuenta la existencia en la misma operacion de venta.
- Con stock insuficiente, la venta se bloquea con retroalimentacion explicita.

## CONTRATO DE SALIDA

- Toda venta por peso queda trazable a una lectura validada de bascula; el inventario se ajusta de forma atomica con la venta; la merma siempre registra motivo.
