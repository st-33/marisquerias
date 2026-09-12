// src/verticales/admin/logica/useAdminFeatures.ts
import type { Database } from 'firebase/database';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore, type AppStore } from '../../sistema/store';
import { getRtdb } from '../../sistema/firebase';
import { NegocioRepository, type Caracteristicas } from '../../sistema/persistencia/negocio.repo';
import { estaFeatureAdminHabilitada } from './menuSafety';
import { estaCapacidadHabilitadaPorCentral } from '../../sistema/central/useCentralConfig';
import type { CentralConfiguracion, CentralEstado } from '../../sistema/store/slices/central';

/**
 * Contrato de feature flags administrativos del negocio.
 * Hogar de este tipo: aquí (capacidad admin compartida). Antes vivía en
 * `capacidades/metricas/useAdminLogic.ts`, lo que generaba un ciclo de tipos
 * entre `capacidades/admin` y `capacidades/metricas`.
 */
export type NegocioFeatures = {
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
};

type UseAdminFeaturesProps = {
  db?: Database;
  rutaNegocio?: string;
};

/**
 * Normaliza la configuración administrativa de `caracteristicas`.
 * El flag padre `roles.admin` tiene precedencia sobre todos sus módulos hijos.
 * Si Central desactiva una capacidad estructural (ej: reparto: false o mostrador: false),
 * la UI oculta los módulos correspondientes automáticamente.
 */
export function normalizarFeaturesAdmin(
  data: Caracteristicas,
  centralConfig?: CentralConfiguracion | null,
  centralEstado?: CentralEstado | null
): NegocioFeatures {
  const admin = data?.roles?.admin;
  const adminRoleEnabled = admin !== false;
  const adminConfig = typeof admin === 'object' && admin !== null ? admin : undefined;

  const moduleVentaCrudo = (data?.module_venta_crudo ?? adminConfig?.module_venta_crudo) === true;

  const repartoPermitidoPorCentral = estaCapacidadHabilitadaPorCentral(
    centralConfig,
    centralEstado,
    'reparto'
  );
  const mostradorPermitidoPorCentral = estaCapacidadHabilitadaPorCentral(
    centralConfig,
    centralEstado,
    'mostrador'
  );

  const normalized: NegocioFeatures = {
    admin: adminRoleEnabled,
    admin_dashboard: adminRoleEnabled && adminConfig?.dashboard !== false,
    admin_menu: adminRoleEnabled && adminConfig?.menu !== false,
    admin_inventory: adminRoleEnabled && adminConfig?.inventario !== false,
    admin_tables: adminRoleEnabled && adminConfig?.mesas !== false,
    admin_devices: adminRoleEnabled && adminConfig?.dispositivos !== false,
    admin_repart: adminRoleEnabled && adminConfig?.repart !== false && repartoPermitidoPorCentral,
    admin_mostrador: adminRoleEnabled && adminConfig?.mostrador !== false && mostradorPermitidoPorCentral,
    admin_menu_add_category: adminRoleEnabled && adminConfig?.menu_add_category !== false,
    module_venta_crudo: adminRoleEnabled && moduleVentaCrudo && mostradorPermitidoPorCentral,
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
 * Hook que suscribe los flags administrativos del negocio.
 * La fuente de autoridad es `rutaNegocio/caracteristicas/roles/admin`.
 */
export function useAdminFeatures(props?: UseAdminFeaturesProps) {
  const storeRutaNegocio = useStore((s) => s.sesion.ruta_negocio || s.sesion.rutaNegocio) || '';
  const ds = useStore((s: AppStore) => s.dataSources);
  const centralConfig = useStore((s) => s.central?.configuracion);
  const centralEstado = useStore((s) => s.central?.estado);

  const rutaNegocio = props?.rutaNegocio !== undefined ? props.rutaNegocio : storeRutaNegocio;

  const db = useMemo(() => {
    if (props?.db) return props.db;
    return getRtdb(ds?.operacionUrl || undefined);
  }, [props?.db, ds?.operacionUrl]);

  const [rawCaracteristicas, setRawCaracteristicas] = useState<Caracteristicas>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rutaNegocio) return;
    const negocioRepo = new NegocioRepository(db, rutaNegocio);
    const unsub = negocioRepo.suscribirCaracteristicas((data) => {
      setRawCaracteristicas(data);
      setLoading(false);
    });

    return unsub;
  }, [db, rutaNegocio]);

  const features = useMemo(
    () => normalizarFeaturesAdmin(rawCaracteristicas, centralConfig, centralEstado),
    [rawCaracteristicas, centralConfig, centralEstado]
  );

  const isEnabled = useCallback(
    (feature: keyof NegocioFeatures) => estaFeatureAdminHabilitada(features, feature),
    [features]
  );

  return { features, loading, isEnabled };
}
