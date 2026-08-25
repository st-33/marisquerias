/**
 * 🧠 HOOK: useLogicaMetricas
 * Lógica de composición del módulo Métricas y Datos (rol Administrador).
 * Delegaciones:
 *  - Carga de feature flags → useAdminFeatures (capacidad admin compartida)
 *  - Cálculo de métricas de ventas → useMetricasVentas
 *  - Estado local → filtro de período de fechas
 *
 * Historial: antes `useAdminLogic.ts` en `src/capacidades/metricas`
 * (comentario anterior apuntaba a `src/verticales/admin/logica/useAdminLogic.ts`).
 * El tipo `TenantFeatures` se trasladó a `useAdminFeatures.ts` para romper el
 * ciclo de tipos entre capacidades/admin y capacidades/metricas.
 */

import type { Database } from 'firebase/database';
import { useState } from 'react';
import { TenantRepository } from '../../sistema/persistencia';
import { useAdminFeatures, type TenantFeatures } from '../admin/useAdminFeatures';
import { useMetricasVentas } from './useMetricasVentas';

export type DateFilter = 'hoy' | 'ayer' | 'hace3dias' | 'semana' | 'mes' | 'todo';

export type MetricasPanel = {
  ventasHoy: number;
  ventasHoyRestaurante?: number;
  ventasHoyVentaCrudo?: number;
  ventasSemana: number;
  ventasMes: number;
  ordenesActivas: number;
  productosEstrella: { id: string; nombre: string; ventas: number }[];
  mesasOcupadas: number;
  mesasTotal: number;
  itemsBajoStock: number;
  ventasPorHora: { label: string; total: number }[];
  ventasPorCategoria: { categoria: string; total: number }[];
  ventasFiltradas: number;
  ordenesFiltradas: number;
  ventasFiltradasRestaurante?: number;
  ordenesFiltradasRestaurante?: number;
  ventasFiltradasVentaCrudo?: number;
  ordenesFiltradasVentaCrudo?: number;
};

/**
 * Hook central del módulo: compone los feature flags administrativos,
 * el cálculo de métricas y el filtro de período en una sola interfaz.
 */
export function useLogicaMetricas({ db, tenantPath }: { db: Database; tenantPath: string }) {
  // Carga de feature flags (responsabilidad compartida de la capacidad admin)
  const { features, loading: featuresLoading } = useAdminFeatures({ db, tenantPath });

  // Filtro de período (estado local del módulo)
  const [dateFilter, setDateFilter] = useState<DateFilter>('hoy');

  // Cálculo de métricas según el período seleccionado
  const includeVentaCrudo = features?.module_venta_crudo === true;
  const { metrics, loading: metricsLoading } = useMetricasVentas({ dateFilter, includeVentaCrudo });

  const loading = featuresLoading || metricsLoading;

  // Acción para activar o desactivar un flag del tenant
  const toggleFeature = async (feature: keyof TenantFeatures, enabled: boolean) => {
    const tenantRepo = new TenantRepository(db, tenantPath);
    const featureKey = feature.replace('admin_', '');
    await tenantRepo.actualizarCaracteristicasAdmin({ [featureKey]: enabled } as any);
  };

  // Refrescar métricas (no-op real: el hook reacciona solo al store)
  const refreshMetrics = async () => {
    setDateFilter((prev) => prev);
  };

  const setDateFilterAction = (filter: DateFilter) => {
    setDateFilter(filter);
  };

  return {
    features,
    metrics,
    loading,
    error: null,
    actions: { toggleFeature, refreshMetrics, setDateFilter: setDateFilterAction },
    dateFilter,
    hasFeature: (feature: keyof TenantFeatures) => features[feature] === true,
  };
}
