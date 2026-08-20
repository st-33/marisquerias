/**
 * 🏛️ STORE CENTRALIZADO UNIFICADO ADI
 *
 * DOGMA V2: UN SOLO STORE, UN SOLO PUNTO DE VERDAD.
 */

import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { getRtdb } from '../firebase';
import { logger } from '../monitoreo';
import {
  registerTenantCleanup,
  registerTenantScopedStateReset,
  registerTenantStateReset,
  resetTenantLifecycle,
  switchTenantLifecycle,
} from '../ciclo_de_vida/TenantLifecycleController';
import { createDataSourcesSlice, type DataSourcesSlice } from './slices/dataSources';
import { createHardwareSlice, type HardwareSlice } from './slices/hardware';
import { createInventoryV2Slice, type InventoryV2Slice } from './slices/inventoryV2';
import { createNegocioSlice, type NegocioSlice } from './slices/negocio';
import { createOperacionSlice, type OperacionSlice } from './slices/operacion';
import {
  createSesionSlice,
  type SesionSlice,
  storage,
  SESION_STORAGE_KEY,
  ESTADO_SESION_INICIAL,
  getTenantStorageKey,
} from './slices/sesion';
import { createUISlice, ESTADO_INICIAL_UI, type UISlice } from './slices/ui';
import { ESTADO_INICIAL_NEGOCIO } from './slices/negocio';
import { ESTADO_INICIAL_DATA_SOURCES } from './slices/dataSources';
import { ESTADO_INICIAL_HARDWARE } from './slices/hardware';
import { ESTADO_INICIAL_OPERACION } from './slices/operacion';
import { ESTADO_INICIAL_INVENTORY_V2 } from './slices/inventoryV2';

// Import local para uso interno en selectores
import type { ItemBase, PedidoBase } from './slices/operacion';

import type { TipoDispositivo } from '../../sistema/tipos/contratos';

// Tipos centralizados
export * from '../../sistema/tipos/contratos';
export type {
  CategoriaBase,
  DraftItem,
  ItemBase,
  MesaBase,
  PedidoBase,
  ProductoBase,
} from './slices/operacion';

// ...

export type AppStore = SesionSlice &
  NegocioSlice &
  UISlice &
  DataSourcesSlice &
  HardwareSlice &
  OperacionSlice &
  InventoryV2Slice;

export const useStore = create<AppStore>()(
  subscribeWithSelector((...args) => ({
    ...createSesionSlice(...args),
    ...createNegocioSlice(...args),
    ...createUISlice(...args),
    ...createDataSourcesSlice(...args),
    ...createHardwareSlice(...args),
    ...createOperacionSlice(...args),
    ...createInventoryV2Slice(...args),
  }))
);

const resetTenantScopedSlices = () => {
  useStore.setState({
    negocio: ESTADO_INICIAL_NEGOCIO,
    ui: ESTADO_INICIAL_UI,
    dataSources: ESTADO_INICIAL_DATA_SOURCES,
    hardware: ESTADO_INICIAL_HARDWARE,
    ...ESTADO_INICIAL_OPERACION,
    ...ESTADO_INICIAL_INVENTORY_V2,
  });
};

registerTenantScopedStateReset(resetTenantScopedSlices);
registerTenantStateReset(() => {
  resetTenantScopedSlices();
  useStore.setState({
    sesion: ESTADO_SESION_INICIAL,
    estadoInstalacion: 'SIN_VINCULO',
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SELECTORES Y HOOKS (Compatibilidad y Comodidad)
// ═══════════════════════════════════════════════════════════════════════════

// Sesión
export const useSesion = () => useStore((s) => s.sesion);
export const useEstaAutenticado = () =>
  useStore((s) => !!s.sesion.access_code && !!s.sesion.tenantId);

// Negocio
export const useFeatures = () => useStore((s) => s.negocio.features);
export const useNegocioConfig = () => useStore((s) => s.negocio.configuracion);

// UI
export const useUI = () => useStore((s) => s.ui);
export const useFabConfigs = () => useStore((s) => s.ui.fabConfigs);
export const useFabForRoute = (pathname: string) => useStore((s) => s.ui.fabConfigs[pathname]);

// Data Sources
export const useDataSources = () => useStore((s) => s.dataSources);

// Hardware
export const useHardware = () => useStore((s) => s.hardware);
export const useDispositivoPreferido = (tipo: TipoDispositivo) =>
  useStore((s) => {
    const id = s.hardware.preferidos[tipo];
    return id ? s.hardware.dispositivos[id] : null;
  });

const EMPTY_DRAFTS: any[] = [];

// Operación (Mesas, Pedidos, Menú)
export const useMesas = () => useStore((s) => s.mesas);
export const usePedidos = () => useStore((s) => s.pedidos);
export const useCategorias = () => useStore((s) => s.categorias);
export const useProductos = () => useStore((s) => s.productos);
export const useDrafts = (mesaId: string | null) =>
  useStore((s) => (mesaId ? s.drafts[mesaId] || EMPTY_DRAFTS : EMPTY_DRAFTS));

// Inventory V2
export const useVentas = () => useStore((s) => s.ventas);
export const useMissingAssignments = () => useStore((s) => s.missingAssignments);
export const useInventoryCatalog = () => useStore((s) => s.catalog);
export const useInventoryAreas = () => useStore((s) => s.areas);
export const useInventorySections = () => useStore((s) => s.sections);

// ═══════════════════════════════════════════════════════════════════════════
// SELECTORES QUIRÚRGICOS DE PEDIDOS
// Estos selectores extraen datos ESPECÍFICOS del store.
// Son la columna vertebral del pipeline Mesero → Cocina.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🎯 usePedido - Selector de Pedido Individual
 *
 * Extrae UN SOLO pedido del store por su ID.
 * Es la forma correcta de obtener datos de un pedido específico.
 *
 * @param pedidoId - ID único del pedido (ej: "PED-20260112-001")
 * @returns El objeto PedidoBase completo, o null si no existe
 *
 * @example
 * const pedido = usePedido("PED-20260112-001");
 * console.log(pedido?.estatus); // "enviado_cocina"
 */
export const usePedido = (pedidoId?: string | null): PedidoBase | null =>
  useStore((s) => {
    if (!pedidoId) return null;
    return s.pedidos[pedidoId] ?? null;
  });

/**
 * 🎯 useItemsPedido - Selector de Items de Pedido
 *
 * Extrae EXCLUSIVAMENTE los items de un pedido específico.
 * Es crítico para el renderizado de órdenes en el rol Mesero y Cocina.
 *
 * @param pedidoId - ID único del pedido
 * @returns Record<string, ItemBase> con los items, o {} si el pedido no existe
 *
 * @example
 * const items = useItemsPedido("PED-20260112-001");
 * Object.entries(items).forEach(([id, item]) => {
 *   console.log(item.nombre, item.precio);
 * });
 */
const EMPTY_ITEMS: Record<string, ItemBase> = {};

export const useItemsPedido = (pedidoId?: string | null): Record<string, ItemBase> =>
  useStore((s) => {
    if (!pedidoId) return EMPTY_ITEMS;
    const pedido = s.pedidos[pedidoId];
    if (!pedido || !pedido.items) return EMPTY_ITEMS;
    return pedido.items;
  });

// ═══════════════════════════════════════════════════════════════════════════
// ALIASES DE COMPATIBILIDAD (para código legacy)
// ═══════════════════════════════════════════════════════════════════════════
export const useInventoryV2Store = useStore;
export const useOperacionStore = useStore;
export const useInventoryV2Listeners = (_isReady?: boolean) => {}; // STUB
export const useOperacionListeners = (_isReady?: boolean) => {}; // STUB

// ═══════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN Y PERSISTENCIA
// ═══════════════════════════════════════════════════════════════════════════

export async function cargarEstadoPersistido() {
  const store = useStore.getState();
  try {
    const rawSesion =
      (await storage.getItem(SESION_STORAGE_KEY)) || (await storage.getItem('sesion'));
    if (rawSesion) {
      const sesion = JSON.parse(rawSesion);
      await store.setSession(sesion);
      logger.info('STORE', '✅ Sesión persistida cargada en store central');

      // Validar vinculación del dispositivo en el arranque
      try {
        const { getRtdb } = await import('../firebase');
        const { EnsambladorInstalacion } = await import('../instalacion');
        const db = getRtdb();
        const ensamblador = new EnsambladorInstalacion(db);
        const dispositivo = await ensamblador.obtenerVinculacionLocal();

        if (dispositivo) {
          await ensamblador.enviarHeartbeat(dispositivo);
          logger.info('STORE', '✅ Dispositivo reconocido y validado remotamente en arranque');
        } else {
          logger.warn('STORE', '⚠️ Dispositivo no vinculado o bloqueado. Limpiando sesión.');
          await store.clearSession();
        }
      } catch (deviceError) {
        logger.error('STORE', '❌ Error al validar dispositivo en arranque', deviceError as Error);
      }
    }
    const featuresKey = getTenantStorageKey(store.sesion.tenantPath, 'negocio', 'features');
    const rawFeatures =
      (featuresKey ? await storage.getItem(featuresKey) : null) ||
      (await storage.getItem('features'));
    if (rawFeatures) {
      const features = JSON.parse(rawFeatures);
      store.setFeatures(features);
      logger.info('STORE', '✅ Features persistidas cargadas en store central');
    }
  } catch (error) {
    logger.error('STORE', '❌ Error al cargar sesión/features persistidas', error as Error);
  }
  await Promise.all([store.loadDataSources(), store.loadHardware()]);
}

export async function limpiarEstadoPersistido() {
  resetTenantLifecycle('persisted_state_cleanup');
  await storage.multiRemove([
    SESION_STORAGE_KEY,
    'sesion',
    'features',
    'hardware_dispositivos',
    'hardware_preferidos',
    'dataSources',
  ]);
}

/**
 * 🔌 Hook Maestro de Listeners
 * Centraliza TODAS las suscripciones a Firebase siguiendo el Dogma V2.
 */
export function useAppListeners(isAppReady: boolean) {
  const tenantPath = useStore((s) => s.sesion.tenantPath);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isAppReady || !tenantPath) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      return;
    }

    const generation = switchTenantLifecycle(tenantPath);
    const db = getRtdb();
    const store = useStore.getState();
    const operacionCleanup = store.inicializarOperacionListeners(db, tenantPath);
    const inventoryCleanup = store.inicializarInventoryV2Listeners(db, tenantPath);
    let cleaned = false;

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      operacionCleanup();
      inventoryCleanup();
      logger.info('LISTENERS', '🔌 Suscripciones centralizadas desconectadas', {
        tenantPath,
        generation,
      });
    };

    const unregister = registerTenantCleanup(tenantPath, cleanup);
    cleanupRef.current = () => {
      unregister();
      cleanup();
    };

    logger.info('LISTENERS', '🔌 Suscripciones centralizadas activas', {
      tenantPath,
      generation,
    });

    return () => {
      unregister();
      cleanup();
      if (cleanupRef.current) cleanupRef.current = null;
    };
  }, [isAppReady, tenantPath]);
}

// La inicialización se maneja vía hooks como useAppListeners
