# INSTRUCCION: METRICAS Y CIERRE DE JORNADA

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 08

## ORIGEN

- Terminos: VENTA POR ORDEN, JORNADA ACTIVA, CIERRE, METRICA, HISTORICO, PURGA.
- Formulas: comanda + cierre + pago = venta_por_orden.
- Codigo real: `src/capacidades/metricas/*`, `src/sistema/persistencia/registroVentas.repo.ts`, `src/sistema/ciclo_de_vida/*`.

## CONTRATO DE TIPOS (FIRMAS REALES)

```typescript
type DateFilter = 'hoy' | 'ayer' | 'hace3dias' | 'semana' | 'mes' | 'todo';

type MetricasPanel = { /* resumen de ventas, alertas y predicciones */ };
```

## PASO 01: REGISTRO DE VENTAS DEL DIA

### ESPECIFICACION

- `useRegistroVentasDelDia` y `useMetricasVentas` registran y agregan las ventas de la jornada.
- `registroVentas.repo.ts` y `SimpleSalesRepo.ts` persisten bajo `{rutaNegocio}/ventas`.

## PASO 02: METRICAS DE VENTA

### ESPECIFICACION

- `useLogicaMetricas({ db, rutaNegocio })` compone `MetricasPanel` con resumen, alertas y predicciones.
- `DateFilter` limita el periodo: `hoy`, `ayer`, `hace3dias`, `semana`, `mes`, `todo`.
- `metricasVendedores.ts` agrega metricas por vendedor.

## PASO 03: ALERTAS Y PREDICCIONES

### ESPECIFICACION

- `useAlertasInteligentes` y `usePrediccionStock` proveen alertas y predicciones de reposicion.

## PASO 04: CICLO DE VIDA DEL NEGOCIO

### ESPECIFICACION

- `NegocioLifecycleController.ts` y `ensureNegocio.ts` gobiernan arranque y cierre de jornada.
- `useAppStateSync.ts` sincroniza el estado de la aplicacion con la jornada activa.

## PASO 05: CIERRE DE JORNADA

### ESPECIFICACION

- Secuencia obligatoria: cierre de jornada activa -> transferencia al historico -> verificacion de integridad -> purga de jornada operativa.
- La purga se autoriza solo tras verificacion integra (regla Ecosistema); transferencia y purga nunca simultaneas.

## CONTRATO DE SALIDA

- Al cierre, las ventas del dia quedan transferidas y verificadas; la purga ocurre solo con verificacion integra; el tablero refleja metricas por periodo filtrable.
