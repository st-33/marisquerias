# CONTRATOS Y TIPOS: METRICAS Y CIERRES

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 09_metricas_y_cierres

## 1. FIRMAS

```typescript
type DateFilter = 'hoy' | 'ayer' | 'hace3dias' | 'semana' | 'mes' | 'todo';

type MetricasPanel = {
  // resumen de ventas, alertas y predicciones del tablero
};

useLogicaMetricas({ db: Database; rutaNegocio: string }): MetricasPanel;
useMetricasVentas({ ... }): MetricasVentas;
useRegistroVentasDelDia({ ... }): RegistroVentas;
```

## 2. PERSISTENCIA

- `registroVentas.repo.ts` y `SimpleSalesRepo.ts` persisten bajo `{rutaNegocio}/ventas`.
- Tabla offline `historial_ventas`: `negocio_id, tipo, fecha, timestamp, total, metodo_pago, datos_json, sincronizado`.

## 3. SECUENCIA DE CIERRE (INVARIANTE ECOSISTEMA)

1. cierre de jornada activa
2. transferencia al historico
3. verificacion de integridad
4. purga de jornada operativa

- Transferencia y purga nunca simultaneas; purga solo tras verificacion integra.

## 4. FLUJO

ventas_del_dia -> useLogicaMetricas(MetricasPanel) -> alertas/predicciones -> cierre -> transferencia -> historial_ventas -> verificacion -> purga
