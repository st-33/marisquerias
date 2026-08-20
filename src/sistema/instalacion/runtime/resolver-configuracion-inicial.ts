import { get, ref } from 'firebase/database';
import type { Database } from 'firebase/database';

export interface ConfiguracionInicial {
  caracteristicas: any;
  dispositivoConfig: {
    rolActivo: string | null;
    rolesPermitidos: string[];
    modulosPermitidos: Record<string, boolean>;
    estado: 'activo' | 'bloqueado' | 'mantenimiento' | 'reemplazado';
    nivelOperativo?: 'admin' | 'segundo_al_mando' | 'operador' | 'consulta';
    puedeCambiarRol: boolean;
    alias?: string;
    reemplazaADeviceId?: string;
    reemplazadoPorDeviceId?: string;
  };
}

/**
 * Obtiene del tenant las características generales y la configuración particular
 * de este dispositivo (roles asignados, módulos habilitados, estado, nivel operativo y herencia de roles).
 */
export async function resolverConfiguracionInicial(
  db: Database,
  tenantPath: string,
  deviceIdADI: string
): Promise<ConfiguracionInicial> {
  const caracteristicasRef = ref(db, `${tenantPath}/caracteristicas`);
  const featuresRef = ref(db, `${tenantPath}/features`);
  const deviceRef = ref(db, `${tenantPath}/dispositivos_autorizados/${deviceIdADI}`);

  const [caractSnap, featSnap, deviceSnap] = await Promise.all([
    get(caracteristicasRef),
    get(featuresRef),
    get(deviceRef),
  ]);

  let caracteristicas = caractSnap.exists() ? caractSnap.val() : null;
  if (!caracteristicas && featSnap.exists()) {
    caracteristicas = { roles: featSnap.val() };
  }

  // Fallback si no hay configuración cargada en el tenant
  if (!caracteristicas) {
    caracteristicas = {
      roles: {
        mesero: true,
        cocina: true,
        admin: {
          dashboard: true,
          menu: true,
          inventario: true,
        },
      },
    };
  }

  let rolActivo: string | null = null;
  let rolesPermitidos: string[] = [];
  let modulosPermitidos: Record<string, boolean> = {};
  let estado: 'activo' | 'bloqueado' | 'mantenimiento' | 'reemplazado' = 'activo';
  let nivelOperativo: 'admin' | 'segundo_al_mando' | 'operador' | 'consulta' = 'operador';
  let puedeCambiarRol = true;
  let alias: string | undefined;
  let reemplazaADeviceId: string | undefined;
  let reemplazadoPorDeviceId: string | undefined;

  if (deviceSnap.exists()) {
    const deviceData = deviceSnap.val();
    rolActivo = deviceData.rolActivo || deviceData.rolAsignado || null;
    estado = deviceData.estado || 'activo';
    alias = deviceData.alias;
    nivelOperativo = deviceData.nivelOperativo || 'operador';
    puedeCambiarRol = deviceData.puedeCambiarRol !== undefined ? deviceData.puedeCambiarRol : true;
    reemplazaADeviceId = deviceData.reemplazaADeviceId;
    reemplazadoPorDeviceId = deviceData.reemplazadoPorDeviceId;

    if (deviceData.rolesPermitidos) {
      if (Array.isArray(deviceData.rolesPermitidos)) {
        rolesPermitidos = deviceData.rolesPermitidos;
      } else if (typeof deviceData.rolesPermitidos === 'object') {
        rolesPermitidos = Object.keys(deviceData.rolesPermitidos).filter(
          (r) => deviceData.rolesPermitidos[r] === true
        );
      }
    }

    if (deviceData.modulosPermitidos) {
      if (Array.isArray(deviceData.modulosPermitidos)) {
        const modulosArray = deviceData.modulosPermitidos as string[];
        modulosPermitidos = modulosArray.reduce<Record<string, boolean>>(
          (acc: Record<string, boolean>, m: string) => {
            acc[m] = true;
            return acc;
          },
          {}
        );
      } else if (typeof deviceData.modulosPermitidos === 'object') {
        modulosPermitidos = deviceData.modulosPermitidos;
      }
    }
  }

  // Si el dispositivo no tiene roles configurados explícitamente en RTDB,
  // hereda todos los roles habilitados a nivel de características globales del tenant
  if (rolesPermitidos.length === 0 && caracteristicas.roles) {
    const rolesConfig = caracteristicas.roles;

    const esHabilitado = (val: any) =>
      val === true || val?.habilitado === true || typeof val === 'object';

    if (esHabilitado(rolesConfig.mesero)) rolesPermitidos.push('mesero');
    if (esHabilitado(rolesConfig.cocina)) rolesPermitidos.push('cocina');
    if (esHabilitado(rolesConfig.admin)) rolesPermitidos.push('admin');
    if (esHabilitado(rolesConfig.mostrador) || esHabilitado(rolesConfig.venta_crudo)) {
      rolesPermitidos.push('mostrador');
    }
    if (esHabilitado(rolesConfig.inventario)) rolesPermitidos.push('inventario');
    if (esHabilitado(rolesConfig.repart)) rolesPermitidos.push('repart');
  }

  return {
    caracteristicas,
    dispositivoConfig: {
      rolActivo,
      rolesPermitidos,
      modulosPermitidos,
      estado,
      nivelOperativo,
      puedeCambiarRol,
      alias,
      reemplazaADeviceId,
      reemplazadoPorDeviceId,
    },
  };
}
