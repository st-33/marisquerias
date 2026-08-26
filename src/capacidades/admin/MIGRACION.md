# Huella local de migración — capacidad admin

**Fecha:** 2026-08-25 05:27 CST
**Registro consolidado:** `docs/desfragmentaciones/2026-08-25_desfragmentacion_metricas_datos_admin.md`

Cambios dentro de esta carpeta durante la desfragmentación del módulo Métricas y Datos:

- `analitica/usePrediccionStock.ts` **se movió** a
  `src/capacidades/metricas/analitica/usePrediccionStock.ts`
  (su único consumidor era el módulo Métricas y Datos).
- `useAlertasInteligentes.ts` **se movió** a
  `src/capacidades/metricas/analitica/useAlertasInteligentes.ts`
  (su único consumidor era el módulo Métricas y Datos).
- `index.ts` ya no reexporta esas dos piezas; el módulo las obtiene desde
  `capacidades/metricas`.
- `useAdminFeatures.ts` ahora es el **hogar del tipo `TenantFeatures`**
  (antes vivía en `capacidades/metricas/useAdminLogic.ts`, generando un ciclo de tipos).

Lo que permanece aquí es la capacidad admin **compartida** entre los módulos del rol
Administrador: `useAdminFeatures`, `usePuenteAccionesFlotantes` y `menuSafety`.

## Anexo — desfragmentación del módulo Menú (2026-08-26)

- `useAdminTools.ts` fue **eliminado** (sin consumidores; herramienta de reparación
  obsoleta con mapeos de IDs heredados). Su trazabilidad queda en
  `docs/desfragmentaciones/2026-08-26_desfragmentacion_menu_admin.md`. Se retiró su
  export del barril `index.ts`.
