/**
 * 📦 ENSAMBLADOR DE ROLES (Role Packer)
 * Sistema dinámico que activa/desactiva módulos según las features del negocio
 *
 * MODULARIDAD EXTREMA:
 * - Lee features desde Firebase
 * - Auto-configura la aplicación
 * - Permite hiper-personalización sin tocar código
 */

import type { Database } from 'firebase/database';
import { off, onValue, ref } from 'firebase/database';
import { useEffect, useState, useMemo } from 'react';
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

type PropsEmpaquetadorRoles = {
  db: Database;
  rutaNegocio: string;
};

export function useEmpaquetadorRoles({ db, rutaNegocio }: PropsEmpaquetadorRoles) {
  const [config, setConfig] = useState<ConfiguracionNegocio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!rutaNegocio) {
      console.log('[RolePacker] ❌ Sin rutaNegocio, no se cargarán roles');
      return;
    }

    console.log('[RolePacker] 🔍 Iniciando carga de roles desde:', rutaNegocio);

    const capacidadesRef = ref(db, `${rutaNegocio}/capacidades`);
    const rolesRef = ref(db, `${rutaNegocio}/roles`);
    const configRef = ref(db, `${rutaNegocio}/caracteristicas`);

    let ultimasCapacidades: Record<string, any> = {};
    let ultimosRoles: Record<string, any> = {};

    const sincronizarYProcesar = () => {
      const merged = {
        roles: ultimosRoles,
        capacidades: ultimasCapacidades,
        ...ultimasCapacidades,
      };
      procesarDatos(merged);
    };

    const cbRoles = onValue(rolesRef, (snapshot) => {
      try {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          ultimosRoles = val.roles ? val.roles : val;
          sincronizarYProcesar();
        }
      } catch (err: any) {
        console.error('[RolePacker] ❌ Error procesando roles:', err);
      }
    });

    const cbCapacidades = onValue(capacidadesRef, (snapshot) => {
      try {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          ultimasCapacidades = val.capacidades ? val.capacidades : val;
          sincronizarYProcesar();
        }
      } catch (err: any) {
        console.error('[RolePacker] ❌ Error procesando capacidades:', err);
      }
    });

    const cbConfig = onValue(
      configRef,
      (snapshot) => {
        try {
          const data = snapshot.val();
          if (data && typeof data === 'object') {
            if (data.roles) ultimosRoles = { ...data.roles, ...ultimosRoles };
            if (data.capacidades) {
              ultimasCapacidades = { ...data.capacidades, ...ultimasCapacidades };
            }
            procesarDatos(data);
          }
        } catch (err: any) {
          console.error('[RolePacker] ❌ Error procesando configuración:', err);
          setError(`Error al cargar configuración: ${err.message || 'Desconocido'}`);
          setLoading(false);
        }
      },
      (err: any) => {
        console.error('[RolePacker] ❌ Firebase error:', err);
        setError(`Error de Firebase: ${err.message || 'Desconocido'}`);
        setLoading(false);
      }
    );

    function procesarDatos(data: any) {
      console.log('[RolePacker] 🔎 Procesando datos:', Object.keys(data));

      // Determinar tipo de negocio
      const tipo: TipoNegocio = data.tipo || 'restaurante';
      const proceso = (tipo === 'tienda' ? 1 : 2) as 1 | 2;

      // Normalizar roles
      const rolesData = data.roles || {};
      const roles: RolesDisponibles = {};

      // Helper robusto para extraer configuración de rol
      const extraherRol = (
        key: string,
        fallbackKey: string | null,
        nombre: string,
        icono: string,
        ruta: string,
        forceEnabledByFeature?: boolean
      ): RolConfig | undefined => {
        const raw =
          rolesData[key] ??
          (fallbackKey ? rolesData[fallbackKey] : undefined) ??
          data[key] ??
          (fallbackKey ? data[fallbackKey] : undefined);

        if (raw === undefined && !forceEnabledByFeature) return undefined;

        const isTruthy = (v: any) => v === true || v === 'true' || v === 1 || v === '1';

        // Determinar si está habilitado
        let habilitado = false;
        if (forceEnabledByFeature) {
          habilitado = true;
        } else if (typeof raw === 'boolean') {
          habilitado = raw;
        } else if (typeof raw === 'object' && raw !== null) {
          habilitado =
            isTruthy(raw.habilitado) ||
            isTruthy(raw.enabled) ||
            isTruthy(raw.activo) ||
            Object.keys(raw).length > 0;
        } else {
          habilitado = isTruthy(raw);
        }

        // Casos especiales de deshabilitación explícita
        if (typeof raw === 'object' && raw !== null && raw.habilitado === false) habilitado = false;

        return {
          habilitado,
          nombre,
          icono,
          ruta,
          modulos: typeof raw === 'object' ? { ...raw } : {},
        };
      };

      // 1. MESERO
      roles.mesero = extraherRol('mesero', 'waiter', 'Mesero', 'restaurant', RUTAS.ROLES.MESERO);

      // 2. COCINA
      roles.cocina = extraherRol('cocina', 'kitchen', 'Cocina', 'flame', RUTAS.ROLES.COCINA);

      // 3. VENTA Y CRUDO (POS)
      const isVCrudoFeature = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
      const forceVentaCrudo =
        isVCrudoFeature(data.module_venta_crudo) ||
        isVCrudoFeature(data.features?.module_venta_crudo) ||
        isVCrudoFeature(data.capacidades?.mostrador_y_pos);

      roles.mostrador = extraherRol(
        'mostrador',
        'venta_crudo',
        'Venta y Crudo',
        'cart',
        RUTAS.ROLES.VENTA_CRUDO,
        forceVentaCrudo
      );

      // 4. ADMIN
      roles.admin = extraherRol('admin', null, 'Admin', 'settings', RUTAS.ROLES.ADMIN);
      if (roles.admin && typeof rolesData.admin === 'object') {
        roles.admin.modulos = {
          dashboard: rolesData.admin.dashboard !== false,
          menu: (rolesData.admin.menu ?? data.capacidades?.menu) !== false,
          control_mesas:
            (rolesData.admin.control_mesas ??
              rolesData.admin.mesas ??
              data.capacidades?.control_mesas) !== false,
          comanda_cocina:
            (rolesData.admin.comanda_cocina ??
              rolesData.admin.cocina ??
              data.capacidades?.comanda_cocina) !== false,
          mostrador_y_pos:
            (rolesData.admin.mostrador_y_pos ??
              rolesData.admin.mostrador ??
              data.capacidades?.mostrador_y_pos) !== false,
          inventario: (rolesData.admin.inventario ?? data.capacidades?.inventario) !== false,
          aparatos_conectados:
            (rolesData.admin.aparatos_conectados ??
              rolesData.admin.dispositivos ??
              data.capacidades?.aparatos_conectados) !== false,
          reparto_logistica:
            (rolesData.admin.reparto_logistica ??
              rolesData.admin.repart ??
              data.capacidades?.reparto_logistica) !== false,
          metricas_y_cierres:
            (rolesData.admin.metricas_y_cierres ??
              rolesData.admin.metricas ??
              rolesData.admin.dashboard ??
              data.capacidades?.metricas_y_cierres) !== false,
          tickets_impresion:
            (rolesData.admin.tickets_impresion ??
              rolesData.admin.tickets ??
              data.capacidades?.tickets_impresion) !== false,
        };
      }

      // 5. INVENTARIO
      roles.inventario = extraherRol(
        'inventario',
        'inventory',
        'Inventario',
        'cube',
        RUTAS.ROLES.INVENTARIO
      );

      // 6. REPARTIDOR
      roles.repart = extraherRol(
        'repart',
        'repartidor',
        'ADI-Repart',
        'bicycle',
        RUTAS.ROLES.REPARTIDOR
      );

      // Normalizar features globales
      const features: Record<string, boolean> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          features[key] = value;
        }
      });

      const configData: ConfiguracionNegocio = {
        tipo,
        proceso,
        roles,
        features,
      };

      console.log('[RolePacker] ✅ Configuración cargada:', {
        tipo,
        proceso,
        rolesHabilitados: Object.keys(roles).filter(
          (k) => roles[k as keyof RolesDisponibles]?.habilitado
        ),
        featuresCount: Object.keys(features).length,
      });

      setConfig(configData);
      setLoading(false);
    }

    return () => {
      console.log('[RolePacker] 🔌 Desuscribiendo de configuración');
      off(capacidadesRef, 'value', cbCapacidades as any);
      off(rolesRef, 'value', cbRoles as any);
      off(configRef, 'value', cbConfig as any);
    };
  }, [db, rutaNegocio]);

  /**
   * Obtener roles habilitados
   */
  const getRolesHabilitados = (): RolConfig[] => {
    if (!config) {
      console.warn('[RolePacker] ⚠️ getRolesHabilitados: No hay configuración cargada');
      // 🔥 CORRECCIÓN: Proporcionar roles por defecto si no hay configuración
      if (!loading) {
        // Fallback remoto debe existir, no usamos hardcodeo
        return [];
      }
      return [];
    }

    const roles = Object.entries(config.roles)
      .filter((entry): entry is [keyof RolesDisponibles, RolConfig] => {
        const [key, rol] = entry;
        if (!rol || rol.habilitado !== true) return false;
        if (esModuloBloqueado(key, rol.nombre)) return false;
        return true;
      })
      .map(([_, rol]) => rol);

    console.log(
      '[RolePacker] 🔍 getRolesHabilitados:',
      roles.map((r) => r.nombre)
    );
    return roles;
  };

  /**
   * Verificar si un rol está habilitado
   */
  const isRolHabilitado = (rolKey: keyof RolesDisponibles): boolean => {
    const rol = config?.roles[rolKey];
    if (!rol || rol.habilitado !== true) return false;
    if (esModuloBloqueado(rolKey, rol.nombre)) return false;
    return true;
  };

  /**
   * Verificar si un módulo de un rol está habilitado
   */
  const isModuloHabilitado = (rolKey: keyof RolesDisponibles, moduloKey: string): boolean => {
    const rol = config?.roles[rolKey];
    if (!rol || !rol.habilitado) return false;
    return rol.modulos?.[moduloKey] !== false;
  };

  /**
   * Verificar si una feature global está habilitada
   */
  const isFeatureHabilitada = (featureKey: string): boolean => {
    return config?.features[featureKey] === true;
  };

  return {
    config,
    loading,
    error,

    // Helpers
    getRolesHabilitados,
    isRolHabilitado,
    isModuloHabilitado,
    isFeatureHabilitada,

    // Datos directos
    tipo: config?.tipo || 'restaurante',
    proceso: config?.proceso || 2,
  };
}
