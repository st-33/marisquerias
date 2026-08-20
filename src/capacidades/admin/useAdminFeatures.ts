// src/verticales/admin/logica/useAdminFeatures.ts
import type { Database } from 'firebase/database';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useStore, type AppStore } from '../../plataforma/core/store';
import { getRtdb } from '../../plataforma/core/firebase';
import { TenantRepository } from '../../plataforma/base/_persistencia/tenant.repo';
import type { TenantFeatures } from './useAdminLogic'; // reuse type
import { estaFeatureAdminHabilitada } from './menuSafety';

type UseAdminFeaturesProps = {
  db?: Database;
  tenantPath?: string;
};

/**
 * Hook that subscribes to the tenant's admin feature flags.
 * Returns the loaded features and a loading flag.
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
      const admin = data.roles?.admin;
      const normalized: TenantFeatures = {
        admin: (typeof admin === 'boolean' ? admin : true) !== false,
        admin_dashboard: (typeof admin === 'object' ? admin?.dashboard : undefined) !== false,
        admin_menu: (typeof admin === 'object' ? admin?.menu : undefined) !== false,
        admin_inventory: (typeof admin === 'object' ? admin?.inventario : undefined) !== false,
        admin_tables: (typeof admin === 'object' ? admin?.mesas : undefined) !== false,
        admin_devices: (typeof admin === 'object' ? admin?.dispositivos : undefined) !== false,
        admin_repart: (typeof admin === 'object' ? admin?.repart : undefined) !== false,
        admin_mostrador: (typeof admin === 'object' ? admin?.mostrador : undefined) !== false,
        admin_menu_add_category:
          (typeof admin === 'object' ? admin?.menu_add_category : undefined) !== false,

        // Master Flag (Priorize root level, fallback to admin level for backward compatibility)
        module_venta_crudo:
          (data?.module_venta_crudo ??
            (typeof admin === 'object' ? admin?.module_venta_crudo : undefined)) === true,
      };

      // Sub-flags Normalization with Master Gating
      const masterVentaCrudo = normalized.module_venta_crudo;
      normalized.fastbutton_venta_crudo =
        masterVentaCrudo &&
        (data?.fastbutton_venta_crudo ??
          (typeof admin === 'object' ? admin?.fastbutton_venta_crudo : undefined)) !== false;
      normalized.menu_editor_venta_crudo =
        masterVentaCrudo &&
        (data?.menu_editor_venta_crudo ??
          (typeof admin === 'object' ? admin?.menu_editor_venta_crudo : undefined)) !== false;

      setFeatures(normalized);
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
