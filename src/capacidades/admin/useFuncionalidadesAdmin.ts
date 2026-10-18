// src/verticales/admin/logica/useAdminFeatures.ts
import type { Database } from 'firebase/database';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore, type AppStore } from '../../sistema/store';
import { getRtdb } from '../../sistema/firebase';
import {
  NegocioRepository,
  type Caracteristicas,
} from '../../sistema/persistencia/negocio.repositorio';
import { estaFeatureAdminHabilitada } from './seguridadMenu';

/**
 * Contrato de feature flags administrativos del negocio.
 * Hogar de este tipo: aquí (capacidad admin compartida). Antes vivía en
 * `capacidades/metricas/useAdminLogic.ts`, lo que generaba un ciclo de tipos
 * entre `capacidades/admin` y `capacidades/metricas`.
 */
export type NegocioFeatures = {
  // 8 Capacidades Canónicas del Giro
  menu?: boolean;
  control_mesas?: boolean;
  comanda_cocina?: boolean;
  mostrador_y_pos?: boolean;
  inventario?: boolean;
  aparatos_conectados?: boolean;
  reparto_logistica?: boolean;
  metricas_y_cierres?: boolean;
  tickets_impresion?: boolean;

  // Módulos y flags administrativos
  admin?: boolean;
  admin_dashboard?: boolean;
  admin_menu?: boolean;
  admin_inventory?: boolean;
  admin_tables?: boolean;
  admin_devices?: boolean;
  admin_repart?: boolean;
  admin_mostrador?: boolean;
  admin_tickets?: boolean;
  admin_menu_add_category?: boolean;
  module_venta_crudo?: boolean;
  fastbutton_venta_crudo?: boolean;
  menu_editor_venta_crudo?: boolean;
};

type UseAdminFeaturesProps = {
  db?: Database;
  rutaNegocio?: string;
};

/**
 * Normaliza la configuración administrativa de `caracteristicas`.
 * El flag padre `roles.admin` tiene precedencia sobre todos sus módulos hijos.
 * Reconoce las 9 capacidades canónicas del Ecosistema gobernando sus módulos respectivos.
 */
export function normalizarFeaturesAdmin(data: Caracteristicas): NegocioFeatures {
  const admin = data?.roles?.admin;
  const adminRoleEnabled = admin !== false;
  const adminConfig =
    typeof admin === 'object' && admin !== null ? (admin as Record<string, any>) : undefined;

  const caps = (data as any)?.capacidades || {};

  const menuHabilitado = adminRoleEnabled && (caps.menu ?? adminConfig?.menu) !== false;
  const controlMesasHabilitado =
    adminRoleEnabled &&
    (caps.control_mesas ?? adminConfig?.control_mesas ?? adminConfig?.mesas) !== false;
  const comandaCocinaHabilitada =
    adminRoleEnabled &&
    (caps.comanda_cocina ?? adminConfig?.comanda_cocina ?? (data?.roles as any)?.cocina) !== false;
  const moduleVentaCrudo = (data?.module_venta_crudo ?? adminConfig?.module_venta_crudo) === true;
  const mostradorYPosHabilitado =
    adminRoleEnabled &&
    (caps.mostrador_y_pos ??
      adminConfig?.mostrador_y_pos ??
      adminConfig?.mostrador ??
      moduleVentaCrudo) !== false;
  const inventarioHabilitado =
    adminRoleEnabled && (caps.inventario ?? adminConfig?.inventario) !== false;
  const aparatosConectadosHabilitados =
    adminRoleEnabled &&
    (caps.aparatos_conectados ?? adminConfig?.aparatos_conectados ?? adminConfig?.dispositivos) !==
      false;
  const repartoLogisticaHabilitado =
    adminRoleEnabled &&
    (caps.reparto_logistica ?? adminConfig?.reparto_logistica ?? adminConfig?.repart) !== false;
  const metricasYCierresHabilitadas =
    adminRoleEnabled &&
    (caps.metricas_y_cierres ??
      adminConfig?.metricas_y_cierres ??
      adminConfig?.metricas ??
      adminConfig?.dashboard) !== false;
  const ticketsImpresionHabilitado =
    adminRoleEnabled &&
    (caps.tickets_impresion ?? adminConfig?.tickets_impresion ?? adminConfig?.tickets) !== false;

  const normalized: NegocioFeatures = {
    // 9 Canónicas
    menu: menuHabilitado,
    control_mesas: controlMesasHabilitado,
    comanda_cocina: comandaCocinaHabilitada,
    mostrador_y_pos: mostradorYPosHabilitado,
    inventario: inventarioHabilitado,
    aparatos_conectados: aparatosConectadosHabilitados,
    reparto_logistica: repartoLogisticaHabilitado,
    metricas_y_cierres: metricasYCierresHabilitadas,
    tickets_impresion: ticketsImpresionHabilitado,

    // Compatibilidad Admin
    admin: adminRoleEnabled,
    admin_dashboard: metricasYCierresHabilitadas,
    admin_menu: menuHabilitado,
    admin_inventory: inventarioHabilitado,
    admin_tables: controlMesasHabilitado,
    admin_devices: aparatosConectadosHabilitados,
    admin_repart: repartoLogisticaHabilitado,
    admin_mostrador: mostradorYPosHabilitado,
    admin_tickets: ticketsImpresionHabilitado,
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
 * Hook que suscribe los flags administrativos del negocio.
 * La fuente de autoridad es `rutaNegocio/caracteristicas/roles/admin`.
 */
export type UseFuncionalidadesAdminProps = UseAdminFeaturesProps;

export function useFuncionalidadesAdmin(props?: UseFuncionalidadesAdminProps) {
  const storeRutaNegocio = useStore((s) => s.sesion.ruta_negocio || s.sesion.rutaNegocio) || '';
  const ds = useStore((s: AppStore) => s.dataSources);

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

  const features = useMemo(() => normalizarFeaturesAdmin(rawCaracteristicas), [rawCaracteristicas]);

  const isEnabled = useCallback(
    (feature: keyof NegocioFeatures) => estaFeatureAdminHabilitada(features, feature),
    [features]
  );

  return { features, loading, isEnabled };
}

export const useAdminFeatures = useFuncionalidadesAdmin;
export type { UseAdminFeaturesProps };
