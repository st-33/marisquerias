// src/verticales/admin/logica/useAdminLogic.ts
import type { Database } from 'firebase/database';
import { useState } from 'react';
import { TenantRepository } from '../../../sistema/persistencia';
import { useAdminFeatures } from './useAdminFeatures';
import { useAdminMetrics } from './useAdminMetrics';

// ==================== TIPOS ====================
export type TenantFeatures = {
  admin?: boolean;
  admin_dashboard?: boolean;
  admin_menu?: boolean;
  admin_inventory?: boolean;
  admin_tables?: boolean;
  admin_devices?: boolean;
  admin_repart?: boolean;
  admin_mostrador?: boolean;
  admin_menu_add_category?: boolean;
  // 🔥 NUEVOS FLAGS CRÍTICOS
  module_venta_crudo?: boolean; // Si false, oculta todo lo relacionado a Venta y Crudo
  fastbutton_venta_crudo?: boolean; // Acceso desde el menú radial
  menu_editor_venta_crudo?: boolean; // Opciones en el editor de menú
  inventory_v2?: boolean; // Si false, usa el sistema legacy ("retacado") o modo compatibilidad
};

export type DateFilter = 'hoy' | 'ayer' | 'hace3dias' | 'semana' | 'mes' | 'todo';

export type DashboardMetrics = {
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
 * Central hook that composes admin feature flags and dashboard metrics.
 * It delegates feature loading to `useAdminFeatures` and metric calculation to `useAdminMetrics`.
 */
export function useAdminLogic({ db, tenantPath }: { db: Database; tenantPath: string }) {
  // Load feature flags
  const { features, loading: featuresLoading } = useAdminFeatures({ db, tenantPath });

  // Date filter state (local to this hook)
  const [dateFilter, setDateFilter] = useState<DateFilter>('hoy');

  // Load metrics based on the selected date filter
  const includeVentaCrudo = features?.module_venta_crudo === true;
  const { metrics, loading: metricsLoading } = useAdminMetrics({ dateFilter, includeVentaCrudo });

  const loading = featuresLoading || metricsLoading;

  // Action to toggle a feature flag
  const toggleFeature = async (feature: keyof TenantFeatures, enabled: boolean) => {
    const tenantRepo = new TenantRepository(db, tenantPath);
    const featureKey = feature.replace('admin_', '');
    await tenantRepo.actualizarCaracteristicasAdmin({ [featureKey]: enabled } as any);
  };

  // Refresh metrics (no‑op because metrics hook updates automatically)
  const refreshMetrics = async () => {
    // Trigger a state update to force re‑render if needed
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
