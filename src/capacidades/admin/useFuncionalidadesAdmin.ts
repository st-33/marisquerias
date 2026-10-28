import type { Database } from 'firebase/database';
import { useCallback, useMemo } from 'react';
import { useStore } from '../../sistema/store';
import { estaFeatureAdminHabilitada } from './seguridadMenu';

export type Caracteristicas = Record<string, any>;

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

export function useFuncionalidadesAdmin(_props?: UseFuncionalidadesAdminProps) {
  const estadoEncendido = useStore((s) => s.estadoEncendido);

  const features = useMemo((): NegocioFeatures => {
    const roles = estadoEncendido?.activos?.roles ?? estadoEncendido?.roles_activos ?? [];
    const caps =
      estadoEncendido?.activos?.capacidades ?? estadoEncendido?.capacidades_activas ?? [];

    const adminRoleEnabled = roles.includes('administrador') || roles.includes('admin' as any);
    const hasCap = (cap: string) => caps.includes(cap as any);

    const menuHabilitado = adminRoleEnabled && hasCap('menu');
    const controlMesasHabilitado = adminRoleEnabled && hasCap('control_mesas');
    const comandaCocinaHabilitada = adminRoleEnabled && hasCap('comanda_cocina');
    const mostradorYPosHabilitado = adminRoleEnabled && hasCap('mostrador_y_pos');
    const inventarioHabilitado = adminRoleEnabled && hasCap('inventario');
    const aparatosConectadosHabilitados = adminRoleEnabled && hasCap('aparatos_conectados');
    const repartoLogisticaHabilitado = adminRoleEnabled && hasCap('reparto_logistica');
    const metricasYCierresHabilitadas = adminRoleEnabled && hasCap('metricas_y_cierres');
    const ticketsImpresionHabilitado = adminRoleEnabled && hasCap('tickets_impresion');

    return {
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
      admin_menu_add_category: menuHabilitado,
      module_venta_crudo: mostradorYPosHabilitado,
      fastbutton_venta_crudo: mostradorYPosHabilitado,
      menu_editor_venta_crudo: mostradorYPosHabilitado,
    };
  }, [estadoEncendido]);

  const isEnabled = useCallback(
    (feature: keyof NegocioFeatures) => estaFeatureAdminHabilitada(features, feature),
    [features]
  );

  return { features, loading: false, isEnabled };
}

export const useAdminFeatures = useFuncionalidadesAdmin;
export type { UseAdminFeaturesProps };
