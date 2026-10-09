# INSTRUCCION: REPARTO Y LOGISTICA

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 07

## ORIGEN

- Terminos: REPARTO, REPARTIDOR, VENTA POR ORDEN, DESTINO.
- Formulas: venta_por_orden + destino_externo = reparto.
- Reglas: REPARTO A DOMICILIO (rubro en reglas.md).
- Codigo real inspeccionado: `src/capacidades/reparto/*`, `src/capacidades/logistica/*`, `src/sistema/persistencia/reparto.repo.ts`, `src/motor/motor-logistico.ts`.

## PASO 01: PERSISTENCIA DE REPARTO

### ESPECIFICACION

- `src/sistema/persistencia/reparto.repo.ts` y `reparto-ajustes.repo.ts` declaran el contrato de pedidos y ajustes de reparto.
- `src/capacidades/reparto/useGestionReparto.ts` expone la logica de gestion del reparto.

## PASO 02: VALIDACION DE AJUSTES

### ESPECIFICACION

- `src/capacidades/reparto/validarAjustes.ts` valida los ajustes de reparto antes de aplicarlos.
- Todo reparto registra un destino externo al negocio antes de su despacho.

## PASO 03: MOTOR LOGISTICO

### ESPECIFICACION

- `src/motor/motor-logistico.ts` y `src/motor/nucleo/*` implementan el motor de transiciones de los pedidos logisticos.
- Los actores autorizados del motor son: negocio, sistema, automatizacion, central y repartidor.

## PASO 04: INTEGRACION CON PEDIDOS

### ESPECIFICACION

- `src/capacidades/logistica/IntegracionLogisticaPedido.ts` vincula el pedido con el evento logistico.
- `src/capacidades/logistica/useSincronizarPedidosLogistica.ts` sincroniza los pedidos hacia el flujo logistico.

## PASO 05: AISLAMIENTO DE REPARTO

### ESPECIFICACION

- El reparto a domicilio no se mezcla con la operacion de mostrador o mesa; cada venta queda diferenciada por su modalidad.
