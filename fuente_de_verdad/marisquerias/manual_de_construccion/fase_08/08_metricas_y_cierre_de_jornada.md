# INSTRUCCION: METRICAS Y CIERRE DE JORNADA

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 08

## ORIGEN

- Terminos: VENTA POR ORDEN, JORNADA ACTIVA, CIERRE, METRICA, HISTORICO, PURGA.
- Formulas: comanda + cierre + pago = venta_por_orden.
- Codigo real inspeccionado: `src/capacidades/metricas/*`, `src/sistema/persistencia/registroVentas.repo.ts`, `src/sistema/ciclo_de_vida/*`.

## PASO 01: REGISTRO DE VENTAS DEL DIA

### ESPECIFICACION

- `src/capacidades/metricas/useRegistroVentasDelDia.ts` y `src/capacidades/metricas/useMetricasVentas.ts` registran y agregan las ventas de la jornada.
- `src/sistema/persistencia/registroVentas.repo.ts` y `SimpleSalesRepo.ts` persisten las ventas del dia.

## PASO 02: METRICAS DE VENTA

### ESPECIFICACION

- `src/capacidades/metricas/useLogicaMetricas.ts` compone las metricas de venta, alertas y predicciones para el tablero del administrador.
- `src/capacidades/metricas/metricasVendedores.ts` agrega metricas por vendedor.

## PASO 03: ALERTAS Y PREDICCIONES

### ESPECIFICACION

- `useAlertasInteligentes.ts` y `usePrediccionStock.ts` proveen alertas y predicciones de stock para el cierre y la reposicion.

## PASO 04: CICLO DE VIDA DEL NEGOCIO

### ESPECIFICACION

- `src/sistema/ciclo_de_vida/NegocioLifecycleController.ts` y `ensureNegocio.ts` gobiernan el arranque y cierre de la jornada del negocio.
- `src/sistema/ciclo_de_vida/useAppStateSync.ts` sincroniza el estado de la aplicacion con la jornada activa.

## PASO 05: CIERRE DE JORNADA

### ESPECIFICACION

- El cierre de jornada aplica la secuencia: cierre de la jornada activa, transferencia de ventas al historico y, verificada su integridad, purga de la jornada operativa.
