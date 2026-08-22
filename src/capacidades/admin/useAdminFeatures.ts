// src/verticales/admin/logica/useAdminFeatures.ts
import type { Database } from 'firebase/database';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore, type AppStore } from '../../sistema/store';
import { getRtdb } from '../../sistema/firebase';
import { TenantRepository, type Caracteristicas } from '../../sistema/persistencia/tenant.repo';
import type { TenantFeatures } from '../metricas/useAdminLogic';
import { estaFeatureAdminHabilitada } from './menuSafety';

type UseAdminFeaturesProps = {
  db?: Database;
  tenantPath?: string;
};

/**
 * Normaliza la configuración administrativa de `caracteristicas`.
 * El flag padre `roles.admin` tiene precedencia sobre todos sus módulos hijos.
 */
export function normalizarFeaturesAdmin(data: Caracteristicas): TenantFeatures {
  const admin = data?.roles?.admin;
  const adminRoleEnabled = admin !== false;
  const adminConfig = typeof admin === 'object' && admin !== null ? admin : undefined;

  const moduleVentaCrudo = (data?.module_venta_crudo ?? adminConfig?.module_venta_crudo) === true;

  const normalized: TenantFeatures = {
    admin: adminRoleEnabled,
    admin_dashboard: adminRoleEnabled && adminConfig?.dashboard !== false,
    admin_menu: adminRoleEnabled && adminConfig?.menu !== false,
    admin_inventory: adminRoleEnabled && adminConfig?.inventario !== false,
    admin_tables: adminRoleEnabled && adminConfig?.mesas !== false,
    admin_devices: adminRoleEnabled && adminConfig?.dispositivos !== false,
    admin_repart: adminRoleEnabled && adminConfig?.repart !== false,
    admin_mostrador: adminRoleEnabled && adminConfig?.mostrador !== false,
    admin_menu_add_category: adminRoleEnabled && adminConfig?.menu_add_category !== false,
    module_venta_crudo: adminRoleEnabled && moduleVentaCrudo,
  };

  const masterVentaCrudo = normalized.module_venta_crudo;
  normalized.fastbutton_venta_crudo =
    masterVentaCrudo &&
    (data?.fastbutton_venta_crudo ?? adminConfig?.fastbutton_venta_crudo) !== false;
  normalized.menu_editor_venta_crudo =
    masterVentaCrudo &&
    (data?.menu_editor_venta_crudo ?? adminConfig?.menu_editor_venta_crudo) !== false;

  return normalized;
}

/**
 * Hook que suscribe los flags administrativos del tenant.
 * La fuente de autoridad es `tenantPath/caracteristicas/roles/admin`.
 */
export function useAdminFeatures(props?: UseAdminFeaturesProps) {
  const storeTenantPath = useStore((s) => s.sesion.tenantPath) || '';
  const ds = useStore((s: AppStore) => s.dataSources);

  const tenantPath = props?.tenantPath !== undefined ? props.tenantPath : storeTenantPath;

  const db = useMemo(() => {
    if (props?.db) return props.db;
    return getRtdb(ds?.operacionUrl || undefined);
  }, [props?.db, ds?.operacionUrl]);

  const [features, setFeatures] = useState<TenantFeatures>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantPath) return;
    const tenantRepo = new TenantRepository(db, tenantPath);
    const unsub = tenantRepo.suscribirCaracteristicas((data) => {
      setFeatures(normalizarFeaturesAdmin(data));
      setLoading(false);
    });

    return unsub;
  }, [db, tenantPath]);

  const isEnabled = useCallback(
    (feature: keyof TenantFeatures) => estaFeatureAdminHabilitada(features, feature),
    [features]
  );

  return { features, loading, isEnabled };
}
