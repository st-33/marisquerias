# ENSAMBLAJE Y PASOS: METRICAS Y CIERRES
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

## PASO 01: Registro de ventas
### ESPECIFICACION
- Se ensambla `useRegistroVentasDelDia` que persiste en `registroVentas.repo.ts` y `SimpleSalesRepo.ts` bajo `{rutaNegocio}/ventas`.
- La tabla offline `historial_ventas` registra `negocio_id, tipo, fecha, timestamp, total, metodo_pago, datos_json, sincronizado` (ver §2 de `02_contratos_y_tipos.md`).
- `sincronizado` solo se confirma tras validacion integra del remoto.

## PASO 02: Metricas del tablero
### ESPECIFICACION
- Se ensambla `useLogicaMetricas({ db, rutaNegocio }): MetricasPanel` y `useMetricasVentas` sobre `DateFilter = 'hoy | ayer | hace3dias | semana | mes | todo'`.
- `MetricasPanel` consolida resumen de ventas, alertas y predicciones sin mutar datos fuente.
- El panel escribe solo lectura; no altera `historial_ventas` ni las ventas del dia.

## PASO 03: Alertas y predicciones
### ESPECIFICACION
- Se ensamblan alertas derivadas de las metricas del dia, sin reintentar escrituras ni descartar registros pendientes.
- Las predicciones se calculan sobre datos consolidados (transferidos), no sobre jornada operativa viva.
- Una alerta no bloquea la operacion del salon ni el registro de ventas.

## PASO 04: Ciclo de vida del cierre
### ESPECIFICACION
- Se ensambla la secuencia invariante: 1) cierre de jornada activa, 2) transferencia al historico, 3) verificacion de integridad, 4) purga de jornada operativa.
- Transferencia y purga nunca son simultaneas; la purga solo ocurre tras verificacion integra.
- El flujo `ventas_del_dia -> useLogicaMetricas -> alertas/predicciones -> cierre -> transferencia -> historial_ventas -> verificacion -> purga` se respeta.

## PASO 05: Verificacion de integridad
### ESPECIFICACION
- Se ensambla la verificacion que compara el historico transferido con la jornada antes de purgar.
- Cualquier inconsistencia detiene la purga y reporta el cierre como incompleto.
- Tras purga, la jornada operativa queda vacia y el historico permanece inmutable.
