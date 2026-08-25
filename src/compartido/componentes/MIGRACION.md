# Huella local de migración — compartido/componentes

**Fecha:** 2026-08-25 05:27 CST
**Registro consolidado:** `docs/desfragmentaciones/2026-08-25_desfragmentacion_metricas_datos_admin.md`

La carpeta `charts/` que existía aquí fue absorbida por el módulo Métricas y Datos
(rol Administrador), porque su único consumidor era la pantalla de ese módulo:

- `SalesLineChart.tsx` → `src/ui/roles/administrador/metricas/graficas/GraficaVentasTiempo.tsx`
- `SalesDistributionPieChart.tsx` → `src/ui/roles/administrador/metricas/graficas/GraficaDistribucionVentas.tsx`
- `TopProductsBarChart.tsx` → `src/ui/roles/administrador/metricas/graficas/GraficaTopProductos.tsx`

Eliminados por no tener ningún consumidor en el proyecto:

- `ChartCard.tsx` (la pantalla usaba su propio contenedor de gráfica).
- `chartTheme.ts` (constantes sin uso).

Si una futura gráfica vuelve a ser compartida por varios módulos, su hogar correcto
será de nuevo esta zona `compartido/`.
