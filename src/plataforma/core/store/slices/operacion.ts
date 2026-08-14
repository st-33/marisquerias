/**
 * 🏪 SLICE DE OPERACIÓN
 *
 * Datos operativos del negocio: mesas, pedidos, menú, drafts.
 *
 * REGLA DE ORO (DOGMA V2):
 * - Este slice es alimentado ÚNICAMENTE por listeners centralizados
 * - Los componentes NUNCA crean listeners, solo leen de aquí
 * - Las acciones escriben a Firebase, Firebase notifica, el listener actualiza el slice
 *
 * ARQUITECTURA:
 * ```
 * Firebase → Listener → Slice → Componentes
 *                         ↑
 *                     Acciones
 * ```
 */

import type { Database } from 'firebase/database';
import { off, onValue, ref, update } from 'firebase/database';
import type { StateCreator } from 'zustand';
import { logger } from '../../monitoring';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS BASE (Genéricos para multi-negocio)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mesa genérica (aplicable a restaurantes, hoteles, etc.)
 */
export interface MesaBase {
  id: string;
  estado: string; // 'libre' | 'ocupada' | etc. - el negocio define los estados
  pedidoActivoId?: string | null;
  updatedAt?: number;
  // Extensible por vertical
  [key: string]: any;
}

/**
 * Item de pedido genérico
 */
export interface ItemBase {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  estado: string; // 'nuevo' | 'en_preparacion' | 'listo' | etc.
  productId?: string;
  variantes?: Record<string, string[]>;
  variantLabels?: string[];
  notas?: string;
  startedAt?: number;
  inventoryDeducted?: boolean;
  [key: string]: any;
}

/**
 * Pedido genérico
 */
export interface PedidoBase {
  id: string;
  tipo: string; // 'mesa' | 'para_llevar' | 'delivery' | etc.
  mesaId?: string;
  estatus: string;
  items: Record<string, ItemBase>;
  totales?: {
    subtotal: number;
    total: number;
  };
  createdAt: number;
  updatedAt?: number;
  cerrado?: boolean;
  [key: string]: any;
}

/**
 * Categoría de menú genérica
 */
export interface CategoriaBase {
  id: string;
  nombre: string;
  orden?: number;
  enviarACocina?: boolean; // Por defecto true
  saltarPreparando?: boolean; // Por defecto false
  [key: string]: any;
}

/**
 * Producto de menú genérico
 */
export interface ProductoBase {
  id: string;
  nombre: string;
  precio: number;
  categoriaId?: string;
  disponible?: boolean;
  enviarACocina?: boolean;
  prepMin?: number;
  receta?: Record<string, any>;
  unidad?: 'pza' | 'kg' | string;
  [key: string]: any;
}

/**
 * Item en borrador (draft) - antes de enviar a cocina
 */
export interface DraftItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  productId?: string;
  variants?: Record<string, string[]>;
  [key: string]: any;
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTADO DEL SLICE
// ═══════════════════════════════════════════════════════════════════════════

export interface ContratoOperacion {
  // Datos crudos de Firebase (sincronizados)
  mesas: Record<string, MesaBase>;
  pedidos: Record<string, PedidoBase>;
  categorias: Record<string, CategoriaBase>;
  productos: Record<string, ProductoBase>;

  // Drafts por mesa (items pendientes de enviar)
  drafts: Record<string, DraftItem[]>;

  // Estado de conexión
  ventas: Record<string, any>;
  listenersActivos: boolean;
  ultimaActualizacion: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCIONES DEL SLICE
// ═══════════════════════════════════════════════════════════════════════════

export interface AccionesOperacion {
  // === INICIALIZACIÓN ===
  /**
   * Inicializa los listeners centralizados de Firebase
   * SOLO debe llamarse UNA vez al iniciar la app
   */
  inicializarOperacionListeners: (db: Database, tenantPath: string) => () => void;

  // === ACCIONES DE MESAS ===
  actualizarMesaLocal: (mesaId: string, data: Partial<MesaBase>) => void;
  actualizarMesa: (
    db: Database,
    tenantPath: string,
    mesaId: string,
    data: Partial<MesaBase>
  ) => Promise<void>;
  liberarMesa: (db: Database, tenantPath: string, mesaId: string) => Promise<void>;

  // === ACCIONES DE PEDIDOS ===
  actualizarPedidoLocal: (pedidoId: string, data: Partial<PedidoBase>) => void;
  actualizarItemLocal: (pedidoId: string, itemId: string, data: Partial<ItemBase>) => void;

  // === ACCIONES DE DRAFTS ===
  agregarDraft: (mesaId: string, item: Omit<DraftItem, 'id'>) => void;
  actualizarDraft: (mesaId: string, itemId: string, data: Partial<DraftItem>) => void;
  eliminarDraft: (mesaId: string, itemId: string) => void;
  limpiarDrafts: (mesaId: string) => void;

  // === SELECTORES DERIVADOS ===
  /**
   * Obtiene pedidos activos (no cerrados)
   */
  getPedidosActivos: () => Record<string, PedidoBase>;

  /**
   * Obtiene la configuración de una categoría
   */
  getCategoriaConfig: (categoriaId: string) => CategoriaBase | null;

  /**
   * Obtiene la categoría de un producto
   */
  getCategoriaDeProducto: (productoId: string) => CategoriaBase | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTADO INICIAL
// ═══════════════════════════════════════════════════════════════════════════

export const ESTADO_INICIAL_OPERACION: ContratoOperacion = {
  mesas: {},
  pedidos: {},
  categorias: {},
  productos: {},
  drafts: {},
  ventas: {},
  listenersActivos: false,
  ultimaActualizacion: null,
};

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTACIÓN DEL SLICE
// ═══════════════════════════════════════════════════════════════════════════

export type OperacionSlice = ContratoOperacion & AccionesOperacion;

export const createOperacionSlice: StateCreator<OperacionSlice, [], [], OperacionSlice> = (
  set,
  get
) => ({
  // Estado inicial
  ...ESTADO_INICIAL_OPERACION,

  // ─────────────────────────────────────────────────────────────────────────
  // INICIALIZACIÓN DE LISTENERS
  // ─────────────────────────────────────────────────────────────────────────
  inicializarOperacionListeners: (db: Database, tenantPath: string) => {
    if (get().listenersActivos) {
      logger.warn('STORE', 'Listeners ya activos, ignorando inicialización duplicada');
      return () => {};
    }

    logger.info('STORE', '🔌 Inicializando listeners centralizados', { tenantPath });

    const cleanupFunctions: (() => void)[] = [];

    // 1. MESAS - Un solo listener para todas las mesas
    const mesasRef = ref(db, `${tenantPath}/mesas`);
    const mesasCallback = onValue(mesasRef, (snap) => {
      const data = snap.val() || {};
      const mesasFiltradas: Record<string, MesaBase> = {};
      const INVALID_IDS = new Set(['estado', 'undefined', 'null']);

      Object.entries(data).forEach(([id, mesa]) => {
        if (!INVALID_IDS.has(id.toLowerCase()) && mesa && typeof mesa === 'object') {
          mesasFiltradas[id] = { id, ...(mesa as any) };
        }
      });

      const count = Object.keys(mesasFiltradas).length;
      if (count > 0) logger.debug('STORE', `📋 ${count} mesas`);
      set({ mesas: mesasFiltradas, ultimaActualizacion: Date.now() });
    });
    cleanupFunctions.push(() => off(mesasRef, 'value', mesasCallback as any));

    // 2. PEDIDOS - Un solo listener para todos los pedidos
    const pedidosRef = ref(db, `${tenantPath}/pedidos`);
    const pedidosCallback = onValue(pedidosRef, (snap) => {
      const data = snap.val() || {};
      const pedidos: Record<string, PedidoBase> = {};

      Object.entries(data).forEach(([id, pedido]) => {
        if (pedido && typeof pedido === 'object') {
          pedidos[id] = { id, ...(pedido as any) };
        }
      });

      const count = Object.keys(pedidos).length;
      if (count > 0) logger.debug('STORE', `📦 ${count} pedidos`);
      set({ pedidos, ultimaActualizacion: Date.now() });
    });
    cleanupFunctions.push(() => off(pedidosRef, 'value', pedidosCallback as any));

    // 3. MENÚ (Categorías) - Un solo listener
    const categoriasRef = ref(db, `${tenantPath}/menu/categorias`);
    const categoriasCallback = onValue(categoriasRef, (snap) => {
      const data = snap.val() || {};
      const categorias: Record<string, CategoriaBase> = {};

      Object.entries(data).forEach(([id, cat]) => {
        if (cat && typeof cat === 'object') {
          categorias[id] = { id, ...(cat as any) };
        }
      });

      const count = Object.keys(categorias).length;
      if (count > 0) logger.debug('STORE', `📂 ${count} categorías`);
      set({ categorias, ultimaActualizacion: Date.now() });
    });
    cleanupFunctions.push(() => off(categoriasRef, 'value', categoriasCallback as any));

    // 4. MENÚ (Productos) - Un solo listener
    const productosRef = ref(db, `${tenantPath}/menu/productos`);
    const productosCallback = onValue(productosRef, (snap) => {
      const data = snap.val() || {};
      const productos: Record<string, ProductoBase> = {};

      Object.entries(data).forEach(([id, prod]) => {
        if (prod && typeof prod === 'object') {
          productos[id] = { id, ...(prod as any) };
        }
      });

      const count = Object.keys(productos).length;
      if (count > 0) logger.debug('STORE', `🍽️ ${count} productos`);
      set({ productos, ultimaActualizacion: Date.now() });
    });
    cleanupFunctions.push(() => off(productosRef, 'value', productosCallback as any));

    // 5. VENTAS - Listener para métricas
    const ventasRef = ref(db, `${tenantPath}/ventas`);
    const ventasCallback = onValue(ventasRef, (snap) => {
      const data = snap.val() || {};
      set({ ventas: data, ultimaActualizacion: Date.now() });
    });
    cleanupFunctions.push(() => off(ventasRef, 'value', ventasCallback as any));

    set({ listenersActivos: true });
    logger.info('STORE', '✅ Listeners centralizados activos (5 total)');

    // Retornar función de cleanup
    return () => {
      logger.info('STORE', '🔌 Desconectando listeners centralizados');
      cleanupFunctions.forEach((cleanup) => cleanup());
      set({
        listenersActivos: false,
        mesas: {},
        pedidos: {},
        categorias: {},
        productos: {},
        ventas: {},
      });
    };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ACCIONES DE MESAS
  // ─────────────────────────────────────────────────────────────────────────
  actualizarMesaLocal: (mesaId, data) => {
    set((state) => ({
      mesas: {
        ...state.mesas,
        [mesaId]: { ...state.mesas[mesaId], ...data },
      },
    }));
  },

  actualizarMesa: async (db, tenantPath, mesaId, data) => {
    const now = Date.now();
    const payload = { ...data, updatedAt: now };

    // Optimistic update
    get().actualizarMesaLocal(mesaId, payload);

    // Write to Firebase
    try {
      await update(ref(db, `${tenantPath}/mesas/${mesaId}`), payload);
    } catch (error) {
      logger.error('STORE', 'Error actualizando mesa', error as Error);
      // TODO: Rollback optimistic update on error
      throw error;
    }
  },

  liberarMesa: async (db, tenantPath, mesaId) => {
    const now = Date.now();
    const payload = { estado: 'libre', pedidoActivoId: null, updatedAt: now };

    // Optimistic update
    get().actualizarMesaLocal(mesaId, payload);

    // Write to Firebase
    try {
      await update(ref(db, `${tenantPath}/mesas/${mesaId}`), payload);
    } catch (error) {
      logger.error('STORE', 'Error liberando mesa', error as Error);
      throw error;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ACCIONES DE PEDIDOS
  // ─────────────────────────────────────────────────────────────────────────
  actualizarPedidoLocal: (pedidoId, data) => {
    set((state) => ({
      pedidos: {
        ...state.pedidos,
        [pedidoId]: { ...state.pedidos[pedidoId], ...data },
      },
    }));
  },

  actualizarItemLocal: (pedidoId, itemId, data) => {
    set((state) => {
      const pedido = state.pedidos[pedidoId];
      if (!pedido) return state;

      return {
        pedidos: {
          ...state.pedidos,
          [pedidoId]: {
            ...pedido,
            items: {
              ...pedido.items,
              [itemId]: { ...pedido.items[itemId], ...data },
            },
          },
        },
      };
    });
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ACCIONES DE DRAFTS
  // ─────────────────────────────────────────────────────────────────────────
  agregarDraft: (mesaId, item) => {
    const id = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newItem = {
      id,
      name: item.name,
      price: item.price,
      qty: item.qty,
      productId: item.productId,
      variants: item.variants,
    } as DraftItem;

    set((state) => ({
      drafts: {
        ...state.drafts,
        [mesaId]: [...(state.drafts[mesaId] || []), newItem],
      },
    }));
  },

  actualizarDraft: (mesaId, itemId, data) => {
    set((state) => ({
      drafts: {
        ...state.drafts,
        [mesaId]: (state.drafts[mesaId] || []).map((item) =>
          item.id === itemId ? { ...item, ...data } : item
        ),
      },
    }));
  },

  eliminarDraft: (mesaId, itemId) => {
    set((state) => ({
      drafts: {
        ...state.drafts,
        [mesaId]: (state.drafts[mesaId] || []).filter((item) => item.id !== itemId),
      },
    }));
  },

  limpiarDrafts: (mesaId) => {
    set((state) => ({
      drafts: {
        ...state.drafts,
        [mesaId]: [],
      },
    }));
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SELECTORES DERIVADOS
  // ─────────────────────────────────────────────────────────────────────────
  getPedidosActivos: () => {
    const { pedidos } = get();
    const activos: Record<string, PedidoBase> = {};

    Object.entries(pedidos).forEach(([id, pedido]) => {
      if (!pedido.cerrado) {
        activos[id] = pedido;
      }
    });

    return activos;
  },

  getCategoriaConfig: (categoriaId) => {
    return get().categorias[categoriaId] || null;
  },

  getCategoriaDeProducto: (productoId) => {
    const producto = get().productos[productoId];
    if (!producto?.categoriaId) return null;
    return get().categorias[producto.categoriaId] || null;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS DE SELECCIÓN (Para usar en componentes)
// ═══════════════════════════════════════════════════════════════════════════

// Estos hooks serán creados después de integrar el slice al store principal
// Por ahora, documentamos la API esperada:
//
// export const useMesas = () => useStore((s) => s.mesas);
// export const useMesa = (id: string) => useStore((s) => s.mesas[id]);
// export const usePedidos = () => useStore((s) => s.pedidos);
// export const usePedido = (id: string) => useStore((s) => s.pedidos[id]);
// export const usePedidosActivos = () => useStore((s) => s.getPedidosActivos());
// export const useCategorias = () => useStore((s) => s.categorias);
// export const useProductos = () => useStore((s) => s.productos);
// export const useDrafts = (mesaId: string) => useStore((s) => s.drafts[mesaId] || []);
