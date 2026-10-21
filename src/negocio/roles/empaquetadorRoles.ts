/**
 * 📦 ENSAMBLADOR DE ROLES (Role Packer)
 * Proyecta los roles y módulos habilitados directamente desde EstadoEncendido (NPB 00)
 * almacenado en el store global de Zustand en O(1), sin suscripciones RTDB.
 */

import { useCallback, useMemo } from 'react';
import type { Database } from 'firebase/database';
import { RUTAS } from '@/sistema/rtdb/rutas/ruta_negocio';
import { useStore } from '../../sistema/store';

export type RolConfig = {
  habilitado: boolean;
  nombre: string;
  icono: string;
  ruta: string;
  modulos?: Record<string, boolean>;
};

export type RolesDisponibles = {
  mesero?: RolConfig;
  cocina?: RolConfig;
  admin?: RolConfig;
  mostrador?: RolConfig; // Para Venta en Crudo / POS
  inventario?: RolConfig;
  repart?: RolConfig;
};

export type TipoNegocio = 'restaurante' | 'tienda' | 'hibrido';

export type ConfiguracionNegocio = {
  tipo: TipoNegocio;
  proceso: 1 | 2; // 1 = Tiendas, 2 = Restaurantes
  roles: RolesDisponibles;
  features: Record<string, boolean>;
};

export type PropsEmpaquetadorRoles = {
  db?: Database;
  rutaNegocio?: string;
};

export function useEmpaquetadorRoles(_props?: PropsEmpaquetadorRoles) {
  const estadoEncendido = useStore((s) => s.estadoEncendido);
  const modulosBloqueados = useStore((s) => s.modulosBloqueados);

  const esModuloBloqueado = useMemo(() => {
    const normalizados = (modulosBloqueados || []).map((m) => m.toLowerCase().trim());
    return (rolKey: string, nombreRol: string): boolean => {
      const keysAComparar = [
        rolKey.toLowerCase(),
        nombreRol.toLowerCase(),
        rolKey === 'mostrador' ? 'caja' : '',
        rolKey === 'mostrador' ? 'pos' : '',
        rolKey === 'mostrador' ? 'venta_crudo' : '',
        rolKey === 'repart' ? 'reparto' : '',
        rolKey === 'repart' ? 'repartidor' : '',
      ].filter(Boolean);

      return normalizados.some((b) => keysAComparar.includes(b));
    };
  }, [modulosBloqueados]);

  const config = useMemo((): ConfiguracionNegocio => {
    const rolesActivos = estadoEncendido?.activos?.roles ?? estadoEncendido?.roles_activos ?? [];
    const capsActivas =
      estadoEncendido?.activos?.capacidades ?? estadoEncendido?.capacidades_activas ?? [];

    const hasRol = (rol: string) => rolesActivos.includes(rol as any);
    const hasCap = (cap: string) => capsActivas.includes(cap as any);

    const roles: RolesDisponibles = {
      mesero: {
        habilitado: hasRol('mesero'),
        nombre: 'Mesero',
        icono: 'restaurant',
        ruta: RUTAS.ROLES.MESERO,
      },
      cocina: {
        habilitado: hasRol('cocina'),
        nombre: 'Cocina',
        icono: 'flame',
        ruta: RUTAS.ROLES.COCINA,
      },
      mostrador: {
        habilitado: hasRol('mostrador') || hasCap('mostrador_y_pos'),
        nombre: 'Venta y Crudo',
        icono: 'cart',
        ruta: RUTAS.ROLES.VENTA_CRUDO,
      },
      admin: {
        habilitado: hasRol('administrador') || hasRol('admin'),
        nombre: 'Admin',
        icono: 'settings',
        ruta: RUTAS.ROLES.ADMIN,
        modulos: {
          dashboard: hasCap('metricas_y_cierres'),
          menu: hasCap('menu'),
          control_mesas: hasCap('control_mesas'),
          comanda_cocina: hasCap('comanda_cocina'),
          mostrador_y_pos: hasCap('mostrador_y_pos'),
          inventario: hasCap('inventario'),
          aparatos_conectados: hasCap('aparatos_conectados'),
          reparto_logistica: hasCap('reparto_logistica'),
          metricas_y_cierres: hasCap('metricas_y_cierres'),
          tickets_impresion: hasCap('tickets_impresion'),
        },
      },
      inventario: {
        habilitado: hasRol('inventario') || hasCap('inventario'),
        nombre: 'Inventario',
        icono: 'cube',
        ruta: RUTAS.ROLES.INVENTARIO,
      },
      repart: {
        habilitado: hasRol('repartidor') || hasRol('repart') || hasCap('reparto_logistica'),
        nombre: 'ADI-Repart',
        icono: 'bicycle',
        ruta: RUTAS.ROLES.REPARTIDOR,
      },
    };

    const features: Record<string, boolean> = {};
    for (const cap of capsActivas) {
      features[cap] = true;
    }

    return {
      tipo: 'restaurante',
      proceso: 2,
      roles,
      features,
    };
  }, [estadoEncendido]);

  const getRolesHabilitados = useCallback((): RolConfig[] => {
    if (!config) return [];

    return Object.entries(config.roles)
      .filter((entry): entry is [keyof RolesDisponibles, RolConfig] => {
        const [key, rol] = entry;
        if (!rol || rol.habilitado !== true) return false;
        if (esModuloBloqueado(key, rol.nombre)) return false;
        return true;
      })
      .map(([_, rol]) => rol);
  }, [config, esModuloBloqueado]);

  const isRolHabilitado = useCallback(
    (rolKey: keyof RolesDisponibles): boolean => {
      const rol = config?.roles[rolKey];
      if (!rol || rol.habilitado !== true) return false;
      if (esModuloBloqueado(rolKey, rol.nombre)) return false;
      return true;
    },
    [config, esModuloBloqueado]
  );

  const isModuloHabilitado = useCallback(
    (rolKey: keyof RolesDisponibles, moduloKey: string): boolean => {
      const rol = config?.roles[rolKey];
      if (!rol || !rol.habilitado) return false;
      return rol.modulos?.[moduloKey] !== false;
    },
    [config]
  );

  const isFeatureHabilitada = useCallback(
    (featureKey: string): boolean => {
      return config?.features[featureKey] === true;
    },
    [config]
  );

  return {
    config,
    loading: false,
    error: null,
    getRolesHabilitados,
    isRolHabilitado,
    isModuloHabilitado,
    isFeatureHabilitada,
    tipo: config.tipo,
    proceso: config.proceso,
  };
}
