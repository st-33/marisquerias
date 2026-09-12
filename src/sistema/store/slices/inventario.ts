import type { Database } from 'firebase/database';
import { off, onValue, ref, update } from 'firebase/database';
import type { StateCreator } from 'zustand';
import type {
  InventoryAreaV2,
  InventoryItemV2,
  InventorySectionV2,
} from '../../persistencia/inventario.repo';
import { OfflinePrintFallback } from '../../servicios/OfflinePrintFallback';
import { SQLiteStorageAdapter } from '../../offline/storage/SQLiteStorageAdapter';
import { validar_ruta_negocio } from '../../rtdb/rutas/ruta_negocio';
import { assertValidRutaNegocio, sanitizeRtdbPayload } from '../../rtdb/guards';

export interface ContratoInventoryV2 {
  catalog: Record<string, InventoryItemV2>;
  sections: Record<string, InventorySectionV2>;
  areas: Record<string, InventoryAreaV2>;
  missingAssignments: Record<string, any>;
  inventoryListenersActivos: boolean;
  ultimaActualizacion: number | null;
  normalizing: boolean;
}

export type PrediccionPlatillo = {
  productoId: string;
  productoNombre: string;
  cantidadPosible: number;
  ingredienteLimitante: string;
  stockSuficiente: boolean;
};

export interface AccionesInventoryV2 {
  inicializarInventoryV2Listeners: (db: Database, rutaNegocio: string) => () => void;

  seedPresets: (db: Database, rutaNegocio: string) => Promise<void>;

  normalizarItemsSinContenedor: (
    db: Database,
    rutaNegocio: string,
    areas: Record<string, InventoryAreaV2>
  ) => Promise<void>;

  crearItem: (
    db: Database,
    rutaNegocio: string,
    item: Omit<InventoryItemV2, 'id' | 'updatedAt'>
  ) => Promise<string>;

  crearArea: (
    db: Database,
    rutaNegocio: string,
    area: Omit<InventoryAreaV2, 'id' | 'updatedAt'>
  ) => Promise<string>;

  crearContenedor: (
    db: Database,
    rutaNegocio: string,
    contenedor: Omit<InventoryAreaV2, 'id' | 'updatedAt' | 'stock'> & {
      stock?: Record<string, number>;
    }
  ) => Promise<string>;

  crearItemEnContenedor: (params: {
    db: Database;
    rutaNegocio: string;
    containerId: string;
    item: Omit<InventoryItemV2, 'id' | 'updatedAt'>;
    initialQty?: number;
  }) => Promise<string>;

  crearItemEnSeccion: (params: {
    db: Database;
    rutaNegocio: string;
    sectionId: 'alimentos' | 'losa_cristaleria' | 'otros';
    item: Omit<InventoryItemV2, 'id' | 'updatedAt'>;
    initialQty?: number;
  }) => Promise<string>;

  ajustarStockDelta: (params: {
    db: Database;
    rutaNegocio: string;
    containerId: string;
    itemId: string;
    delta: number;
    usuario?: string;
    razon?: string;
    allowNegative?: boolean;
  }) => Promise<void>;

  ajustarStockDeltaSeccion: (params: {
    db: Database;
    rutaNegocio: string;
    sectionId: 'alimentos' | 'losa_cristaleria' | 'otros';
    itemId: string;
    delta: number;
    usuario?: string;
    razon?: string;
    allowNegative?: boolean;
  }) => Promise<void>;

  // === SELECTORES DERIVADOS ===
  getPredicciones: (productos: Record<string, any>) => PrediccionPlatillo[];
}

export const ESTADO_INICIAL_INVENTORY_V2: ContratoInventoryV2 = {
  catalog: {},
  sections: {},
  areas: {},
  missingAssignments: {},
  inventoryListenersActivos: false,
  ultimaActualizacion: null,
  normalizing: false,
};

export type InventoryV2Slice = ContratoInventoryV2 & AccionesInventoryV2;

export const createInventoryV2Slice: StateCreator<InventoryV2Slice, [], [], InventoryV2Slice> = (
  set,
  getState
) => ({
  ...ESTADO_INICIAL_INVENTORY_V2,

  inicializarInventoryV2Listeners: (db: Database, rutaNegocio: string) => {
    if (!validar_ruta_negocio(rutaNegocio)) {
      return () => {};
    }

    if (getState().inventoryListenersActivos) {
      return () => {};
    }

    const cleanupFunctions: (() => void)[] = [];

    const catalogRef = ref(db, `${rutaNegocio}/inventario/catalog`);
    const catalogCb = onValue(catalogRef, (snap) => {
      const raw = snap.val() || {};
      const next: Record<string, InventoryItemV2> = {};
      Object.entries(raw).forEach(([id, v]) => {
        if (v && typeof v === 'object') {
          next[id] = { id, ...(v as any) };
        }
      });
      set({ catalog: next, ultimaActualizacion: Date.now() });
    });
    cleanupFunctions.push(() => off(catalogRef, 'value', catalogCb as any));

    const sectionsRef = ref(db, `${rutaNegocio}/inventario/sections`);
    const sectionsCb = onValue(sectionsRef, (snap) => {
      const raw = snap.val() || {};
      const next: Record<string, InventorySectionV2> = {};
      Object.entries(raw).forEach(([id, v]) => {
        if (v && typeof v === 'object') {
          next[id] = { id, ...(v as any) };
        }
      });
      set({ sections: next, ultimaActualizacion: Date.now() });
    });
    cleanupFunctions.push(() => off(sectionsRef, 'value', sectionsCb as any));

    const areasRef = ref(db, `${rutaNegocio}/inventario/areas`);
    const areasCb = onValue(areasRef, (snap) => {
      const raw = snap.val() || {};
      const next: Record<string, InventoryAreaV2> = {};
      Object.entries(raw).forEach(([id, v]) => {
        if (v && typeof v === 'object') {
          next[id] = { id, ...(v as any) };
        }
      });
      set({ areas: next, ultimaActualizacion: Date.now() });

      if (!getState().normalizing) {
        void getState().normalizarItemsSinContenedor(db, rutaNegocio, next);
      }
    });
    cleanupFunctions.push(() => off(areasRef, 'value', areasCb as any));

    const missingRef = ref(db, `${rutaNegocio}/inventario/missing_area_assignments`);
    const missingCb = onValue(missingRef, (snap) => {
      set({ missingAssignments: snap.val() || {}, ultimaActualizacion: Date.now() });
    });
    cleanupFunctions.push(() => off(missingRef, 'value', missingCb as any));

    set({ inventoryListenersActivos: true });

    let cleaned = false;
    return () => {
      if (cleaned) return;
      cleaned = true;
      cleanupFunctions.forEach((fn) => fn());
      set({ ...ESTADO_INICIAL_INVENTORY_V2 });
    };
  },

  async crearItem(db, rutaNegocio, item) {
    assertValidRutaNegocio(rutaNegocio);
    const { push, ref: rtdbRef, set: rtdbSet } = await import('firebase/database');
    const r = rtdbRef(db, `${rutaNegocio}/inventario/catalog`);
    const newRef = push(r);
    await rtdbSet(newRef, sanitizeRtdbPayload({ ...item, updatedAt: Date.now() }));
    return newRef.key as string;
  },

  async crearArea(db, rutaNegocio, area) {
    assertValidRutaNegocio(rutaNegocio);
    const { push, ref: rtdbRef, set: rtdbSet } = await import('firebase/database');
    const r = rtdbRef(db, `${rutaNegocio}/inventario/areas`);
    const newRef = push(r);
    await rtdbSet(newRef, sanitizeRtdbPayload({ ...area, updatedAt: Date.now() }));
    return newRef.key as string;
  },

  async crearContenedor(db, rutaNegocio, contenedor) {
    assertValidRutaNegocio(rutaNegocio);
    const { push, ref: rtdbRef, set: rtdbSet } = await import('firebase/database');
    const r = rtdbRef(db, `${rutaNegocio}/inventario/areas`);
    const newRef = push(r);
    await rtdbSet(
      newRef,
      sanitizeRtdbPayload({ ...contenedor, stock: contenedor.stock || {}, updatedAt: Date.now() })
    );
    return newRef.key as string;
  },

  async crearItemEnContenedor(params) {
    const { db, rutaNegocio, containerId, item, initialQty = 0 } = params;
    assertValidRutaNegocio(rutaNegocio);
    const { push, ref: rtdbRef } = await import('firebase/database');

    const catalogRef = rtdbRef(db, `${rutaNegocio}/inventario/catalog`);
    const newRef = push(catalogRef);
    const itemId = newRef.key as string;
    const now = Date.now();

    const updates: Record<string, any> = {};
    updates[`${rutaNegocio}/inventario/catalog/${itemId}`] = sanitizeRtdbPayload({
      ...item,
      updatedAt: now,
    });
    updates[`${rutaNegocio}/inventario/areas/${containerId}/stock/${itemId}`] = Number(
      initialQty || 0
    );
    updates[`${rutaNegocio}/inventario/areas/${containerId}/updatedAt`] = now;

    await update(rtdbRef(db), sanitizeRtdbPayload(updates));
    return itemId;
  },

  async crearItemEnSeccion(params) {
    const { db, rutaNegocio, sectionId, item, initialQty = 0 } = params;
    assertValidRutaNegocio(rutaNegocio);
    const { push, ref: rtdbRef } = await import('firebase/database');

    const catalogRef = rtdbRef(db, `${rutaNegocio}/inventario/catalog`);
    const newRef = push(catalogRef);
    const itemId = newRef.key as string;
    const now = Date.now();

    const updates: Record<string, any> = {};
    updates[`${rutaNegocio}/inventario/catalog/${itemId}`] = sanitizeRtdbPayload({
      ...item,
      updatedAt: now,
    });
    updates[`${rutaNegocio}/inventario/sections/${sectionId}/stock/${itemId}`] = Number(
      initialQty || 0
    );
    updates[`${rutaNegocio}/inventario/sections/${sectionId}/updatedAt`] = now;

    await update(rtdbRef(db), sanitizeRtdbPayload(updates));
    return itemId;
  },

  async seedPresets(db, rutaNegocio) {
    assertValidRutaNegocio(rutaNegocio);
    const { get, ref: rtdbRef } = await import('firebase/database');

    const [catSnap, areasSnap, sectionsSnap] = await Promise.all([
      get(rtdbRef(db, `${rutaNegocio}/inventario/catalog`)),
      get(rtdbRef(db, `${rutaNegocio}/inventario/areas`)),
      get(rtdbRef(db, `${rutaNegocio}/inventario/sections`)),
    ]);

    const hasCatalog = catSnap.exists() && Object.keys(catSnap.val() || {}).length > 0;
    const hasAreas = areasSnap.exists() && Object.keys(areasSnap.val() || {}).length > 0;
    const hasSections = sectionsSnap.exists() && Object.keys(sectionsSnap.val() || {}).length > 0;

    if (hasCatalog || hasAreas || hasSections) {
      return;
    }

    const now = Date.now();
    const updates: Record<string, any> = {};
    const niche = (getState() as any).sesion?.niche;
    const hubId = niche === 'venta_crudo' ? 'venta_crudo' : 'restaurante';

    updates[`${rutaNegocio}/inventario/sections/alimentos`] = {
      nombre: 'Alimentos / Consumibles',
      icon: '🍲',
      stock: {},
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/sections/losa_cristaleria`] = {
      nombre: 'Losa / Cristalería',
      icon: '🍽️',
      stock: {},
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/sections/otros`] = {
      nombre: 'Otros',
      icon: '📦',
      stock: {},
      updatedAt: now,
    };

    const itemIds = {
      alimentos: {
        camaron: 'item_alim_camaron',
        pescado: 'item_alim_pescado_entero',
        pulpo: 'item_alim_pulpo_cocido',
        calamar: 'item_alim_calamar_fresco',
        cerveza: 'item_alim_cerveza',
        refresco: 'item_alim_refresco',
      },
      losa_cristaleria: {
        plato: 'item_losa_plato',
        vaso: 'item_losa_vaso',
        copa: 'item_losa_copa',
        cubierto: 'item_losa_cubierto',
        charola: 'item_losa_charola',
        jarra: 'item_losa_jarra',
      },
      otros: {
        bolsas: 'item_otros_bolsas',
        servilletas: 'item_otros_servilletas',
        jabon: 'item_otros_jabon',
        cloro: 'item_otros_cloro',
        guantes: 'item_otros_guantes',
        papel: 'item_otros_papel',
      },
    };

    updates[`${rutaNegocio}/inventario/catalog/${itemIds.alimentos.camaron}`] = {
      nombre: 'Camarón',
      sectionId: 'alimentos',
      unidad: 'kg',
      minStock: 5,
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/catalog/${itemIds.alimentos.pescado}`] = {
      nombre: 'Pescado Entero',
      sectionId: 'alimentos',
      unidad: 'kg',
      minStock: 5,
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/catalog/${itemIds.alimentos.pulpo}`] = {
      nombre: 'Pulpo Cocido',
      sectionId: 'alimentos',
      unidad: 'kg',
      minStock: 3,
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/catalog/${itemIds.alimentos.calamar}`] = {
      nombre: 'Calamar Fresco',
      sectionId: 'alimentos',
      unidad: 'kg',
      minStock: 3,
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/catalog/${itemIds.alimentos.cerveza}`] = {
      nombre: 'Cerveza',
      sectionId: 'alimentos',
      unidad: 'pza',
      minStock: 12,
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/catalog/${itemIds.alimentos.refresco}`] = {
      nombre: 'Refresco',
      sectionId: 'alimentos',
      unidad: 'pza',
      minStock: 12,
      updatedAt: now,
    };

    updates[`${rutaNegocio}/inventario/catalog/${itemIds.losa_cristaleria.plato}`] = {
      nombre: 'Plato',
      sectionId: 'losa_cristaleria',
      unidad: 'pza',
      minStock: 24,
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/catalog/${itemIds.losa_cristaleria.vaso}`] = {
      nombre: 'Vaso',
      sectionId: 'losa_cristaleria',
      unidad: 'pza',
      minStock: 24,
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/catalog/${itemIds.losa_cristaleria.copa}`] = {
      nombre: 'Copa',
      sectionId: 'losa_cristaleria',
      unidad: 'pza',
      minStock: 12,
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/catalog/${itemIds.losa_cristaleria.cubierto}`] = {
      nombre: 'Cubierto',
      sectionId: 'losa_cristaleria',
      unidad: 'pza',
      minStock: 24,
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/catalog/${itemIds.losa_cristaleria.charola}`] = {
      nombre: 'Charola',
      sectionId: 'losa_cristaleria',
      unidad: 'pza',
      minStock: 6,
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/catalog/${itemIds.losa_cristaleria.jarra}`] = {
      nombre: 'Jarra',
      sectionId: 'losa_cristaleria',
      unidad: 'pza',
      minStock: 6,
      updatedAt: now,
    };

    updates[`${rutaNegocio}/inventario/catalog/${itemIds.otros.bolsas}`] = {
      nombre: 'Bolsas',
      sectionId: 'otros',
      unidad: 'pza',
      minStock: 50,
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/catalog/${itemIds.otros.servilletas}`] = {
      nombre: 'Servilletas',
      sectionId: 'otros',
      unidad: 'pza',
      minStock: 200,
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/catalog/${itemIds.otros.jabon}`] = {
      nombre: 'Jabón',
      sectionId: 'otros',
      unidad: 'pza',
      minStock: 2,
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/catalog/${itemIds.otros.cloro}`] = {
      nombre: 'Cloro',
      sectionId: 'otros',
      unidad: 'pza',
      minStock: 2,
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/catalog/${itemIds.otros.guantes}`] = {
      nombre: 'Guantes',
      sectionId: 'otros',
      unidad: 'caja',
      minStock: 1,
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/catalog/${itemIds.otros.papel}`] = {
      nombre: 'Papel',
      sectionId: 'otros',
      unidad: 'pza',
      minStock: 6,
      updatedAt: now,
    };

    const areaIds = {
      alimentos: {
        cocina: 'area_alim_cocina',
        barra: 'area_alim_barra',
        almacen: 'area_alim_almacen',
        vc: 'area_alim_venta_crudo',
      },
      losa_cristaleria: {
        servicio: 'area_losa_servicio',
      },
      otros: {
        general: 'area_otros_general',
      },
    };

    updates[`${rutaNegocio}/inventario/areas/${areaIds.alimentos.cocina}`] = {
      hubId,
      sectionId: 'alimentos',
      nombre: 'Cocina',
      icon: '🍳',
      tipo: 'cocina',
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/areas/${areaIds.alimentos.barra}`] = {
      hubId,
      sectionId: 'alimentos',
      nombre: 'Barra',
      icon: '🍸',
      tipo: 'otro',
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/areas/${areaIds.alimentos.almacen}`] = {
      hubId,
      sectionId: 'alimentos',
      nombre: 'Almacén',
      icon: '📦',
      tipo: 'almacen',
      updatedAt: now,
    };
    updates[`${rutaNegocio}/inventario/areas/${areaIds.alimentos.vc}`] = {
      hubId: 'venta_crudo',
      sectionId: 'alimentos',
      nombre: 'Venta Crudo',
      icon: '🛒',
      tipo: 'mostrador',
      updatedAt: now,
    };

    updates[`${rutaNegocio}/inventario/areas/${areaIds.losa_cristaleria.servicio}`] = {
      hubId,
      sectionId: 'losa_cristaleria',
      nombre: 'Servicio',
      icon: '🍽️',
      tipo: 'otro',
      updatedAt: now,
    };

    updates[`${rutaNegocio}/inventario/areas/${areaIds.otros.general}`] = {
      hubId,
      sectionId: 'otros',
      nombre: 'General',
      icon: '🧰',
      tipo: 'otro',
      updatedAt: now,
    };

    const defaultContainers = [
      {
        areaId: areaIds.alimentos.cocina,
        hubId,
        sectionId: 'alimentos' as const,
        nombre: 'Refri Principal',
        icon: '🧊',
        tipo: 'refri' as const,
        stock: {
          [itemIds.alimentos.camaron]: 21,
          [itemIds.alimentos.pescado]: 8,
          [itemIds.alimentos.pulpo]: 2,
        },
      },
      {
        areaId: areaIds.alimentos.barra,
        hubId,
        sectionId: 'alimentos' as const,
        nombre: 'Refri Principal',
        icon: '🧊',
        tipo: 'refri' as const,
        stock: {
          [itemIds.alimentos.refresco]: 24,
          [itemIds.alimentos.cerveza]: 24,
        },
      },
      {
        areaId: areaIds.alimentos.almacen,
        hubId,
        sectionId: 'alimentos' as const,
        nombre: 'Refri Principal',
        icon: '📦',
        tipo: 'almacen' as const,
        stock: {},
      },
      {
        areaId: areaIds.alimentos.vc,
        hubId: 'venta_crudo' as const,
        sectionId: 'alimentos' as const,
        nombre: 'Caja Principal',
        icon: '📦',
        tipo: 'mostrador' as const,
        stock: {
          [itemIds.alimentos.camaron]: 6,
          [itemIds.alimentos.calamar]: 4,
        },
      },
      {
        areaId: areaIds.losa_cristaleria.servicio,
        hubId,
        sectionId: 'losa_cristaleria' as const,
        nombre: 'Contenedor Principal',
        icon: '📦',
        tipo: 'almacen' as const,
        stock: {
          [itemIds.losa_cristaleria.plato]: 60,
          [itemIds.losa_cristaleria.vaso]: 60,
          [itemIds.losa_cristaleria.copa]: 24,
          [itemIds.losa_cristaleria.cubierto]: 80,
        },
      },
      {
        areaId: areaIds.otros.general,
        hubId,
        sectionId: 'otros' as const,
        nombre: 'Contenedor Principal',
        icon: '📦',
        tipo: 'almacen' as const,
        stock: {
          [itemIds.otros.bolsas]: 200,
          [itemIds.otros.servilletas]: 500,
          [itemIds.otros.cloro]: 3,
          [itemIds.otros.jabon]: 2,
        },
      },
    ];

    for (const c of defaultContainers) {
      const containerId = `${c.areaId}__default`;
      updates[`${rutaNegocio}/inventario/areas/${containerId}`] = {
        hubId: c.hubId,
        sectionId: c.sectionId,
        nombre: c.nombre,
        icon: c.icon,
        tipo: c.tipo,
        parentId: c.areaId,
        stock: c.stock,
        updatedAt: now,
      };
    }

    await update(rtdbRef(db), sanitizeRtdbPayload(updates));
  },

  async normalizarItemsSinContenedor(db, rutaNegocio, areas) {
    assertValidRutaNegocio(rutaNegocio);
    if (getState().normalizing) return;

    const niche = (getState() as any).sesion?.niche;
    const hubId = niche === 'venta_crudo' ? 'venta_crudo' : 'restaurante';

    const areaEntries = Object.entries(areas);
    const catalog = getState().catalog;

    const inferSectionByItemId: Record<string, 'alimentos' | 'losa_cristaleria' | 'otros'> = {};
    for (const a of Object.values(areas) as any[]) {
      const sectionId = (a?.sectionId as any) || 'otros';
      const stock = (a?.stock || {}) as Record<string, number>;
      for (const itemId of Object.keys(stock)) {
        if (!inferSectionByItemId[itemId]) {
          inferSectionByItemId[itemId] = sectionId;
        }
      }
    }

    const updates: Record<string, any> = {};
    const now = Date.now();

    for (const [id, a] of areaEntries) {
      const sectionId = (a as any)?.sectionId;
      if (!sectionId) {
        updates[`${rutaNegocio}/inventario/areas/${id}/sectionId`] = 'otros';
        updates[`${rutaNegocio}/inventario/areas/${id}/updatedAt`] = now;
      }
    }

    for (const [id, it] of Object.entries(catalog)) {
      const sectionId = (it as any)?.sectionId;
      if (!sectionId) {
        const inferred = inferSectionByItemId[id] || 'otros';
        updates[`${rutaNegocio}/inventario/catalog/${id}/sectionId`] = inferred;
        updates[`${rutaNegocio}/inventario/catalog/${id}/updatedAt`] = now;
        updates[`${rutaNegocio}/inventario/missing_area_assignments/${id}`] = {
          hubId,
          itemId: id,
          fallbackAreaId: '__auto_section__',
          reason: 'auto_assign_section',
          actor: 'system',
          nombre: (it as any)?.nombre || id,
          lastTs: now,
          count: 1,
        };
      }
    }

    if (Object.keys(updates).length === 0) return;

    set({ normalizing: true });
    try {
      const { ref: rtdbRef } = await import('firebase/database');
      await update(rtdbRef(db), sanitizeRtdbPayload(updates));
    } finally {
      set({ normalizing: false });
    }
  },

  async ajustarStockDelta(params) {
    const { db, rutaNegocio, containerId, itemId, delta, usuario, razon, allowNegative } = params;
    assertValidRutaNegocio(rutaNegocio);
    const { get, push, ref: rtdbRef } = await import('firebase/database');

    const { isOnline } = OfflinePrintFallback.getStatus();
    const movementId = `inv_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)
      .toUpperCase()}`;

    if (!isOnline) {
      // 1. Guardar en SQLite local
      await SQLiteStorageAdapter.enqueueInventoryMovement({
        id: movementId,
        rutaNegocio,
        containerId,
        itemId,
        delta,
        usuario,
        razon,
        allowNegative: !!allowNegative,
      });

      // 2. Modificar estado local en Zustand inmediatamente
      const areas = getState().areas;
      const area = areas[containerId];
      if (area) {
        const currentStock = Number(area.stock?.[itemId] || 0);
        const nextStock = allowNegative ? currentStock + delta : Math.max(0, currentStock + delta);

        const nextAreas = {
          ...areas,
          [containerId]: {
            ...area,
            stock: {
              ...(area.stock || {}),
              [itemId]: nextStock,
            },
            updatedAt: Date.now(),
          },
        };
        set({ areas: nextAreas });
      }
      return;
    }

    const stockRef = rtdbRef(db, `${rutaNegocio}/inventario/areas/${containerId}/stock/${itemId}`);
    const snap = await get(stockRef);
    const current = Number(snap.val() || 0);
    const next = allowNegative ? current + delta : Math.max(0, current + delta);

    const movRef = push(rtdbRef(db, `${rutaNegocio}/inventario/movements`));

    const updates: Record<string, any> = {};
    updates[`${rutaNegocio}/inventario/areas/${containerId}/stock/${itemId}`] = next;
    updates[`${rutaNegocio}/inventario/movements/${movRef.key}`] = sanitizeRtdbPayload({
      tipo: 'ajuste',
      itemId,
      cantidad: delta,
      areaId: containerId,
      usuario,
      razon,
      timestamp: Date.now(),
      permiteNegativo: allowNegative,
    });

    await update(rtdbRef(db), sanitizeRtdbPayload(updates));
  },

  async ajustarStockDeltaSeccion(params) {
    const { db, rutaNegocio, sectionId, itemId, delta, usuario, razon, allowNegative } = params;
    assertValidRutaNegocio(rutaNegocio);
    const { get, push, ref: rtdbRef } = await import('firebase/database');

    const { isOnline } = OfflinePrintFallback.getStatus();
    const movementId = `inv_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)
      .toUpperCase()}`;

    if (!isOnline) {
      // 1. Guardar en SQLite local
      await SQLiteStorageAdapter.enqueueInventoryMovement({
        id: movementId,
        rutaNegocio,
        containerId: `section:${sectionId}`,
        itemId,
        delta,
        usuario,
        razon,
        allowNegative: !!allowNegative,
      });

      // 2. Modificar estado local en Zustand inmediatamente
      const sections = getState().sections;
      const sec = sections[sectionId];
      if (sec) {
        const currentStock = Number(sec.stock?.[itemId] || 0);
        const nextStock = allowNegative ? currentStock + delta : Math.max(0, currentStock + delta);

        const nextSections = {
          ...sections,
          [sectionId]: {
            ...sec,
            stock: {
              ...(sec.stock || {}),
              [itemId]: nextStock,
            },
            updatedAt: Date.now(),
          },
        };
        set({ sections: nextSections });
      }
      return;
    }

    const stockRef = rtdbRef(db, `${rutaNegocio}/inventario/sections/${sectionId}/stock/${itemId}`);
    const snap = await get(stockRef);
    const current = Number(snap.val() || 0);
    const next = allowNegative ? current + delta : Math.max(0, current + delta);

    const movRef = push(rtdbRef(db, `${rutaNegocio}/inventario/movements`));

    const updates: Record<string, any> = {};
    updates[`${rutaNegocio}/inventario/sections/${sectionId}/stock/${itemId}`] = next;
    updates[`${rutaNegocio}/inventario/movements/${movRef.key}`] = sanitizeRtdbPayload({
      tipo: 'ajuste',
      itemId,
      cantidad: delta,
      areaId: `section:${sectionId}`,
      usuario,
      razon,
      timestamp: Date.now(),
      permiteNegativo: allowNegative,
    });

    await update(rtdbRef(db), sanitizeRtdbPayload(updates));
  },

  getPredicciones: (productos) => {
    const { catalog } = getState();
    const prodsConReceta = Object.values(productos).filter(
      (p: any) => p.receta?.ingredientes && Object.keys(p.receta.ingredientes).length > 0
    );

    return prodsConReceta.map((producto: any) => {
      let cantidadPosible = Infinity;
      let ingredienteLimitante = '';

      const ingredientes = producto.receta?.ingredientes || {};

      for (const [itemId, cantidadNecesaria] of Object.entries(ingredientes)) {
        const itemInventario = catalog[itemId];
        const cantidadRequerida = Number(cantidadNecesaria) || 0;

        if (!itemInventario) {
          cantidadPosible = 0;
          ingredienteLimitante = 'Ingrediente desconocido';
          break;
        }

        // Importante: El catálogo v2 tiene el stock distribuido en áreas,
        // pero por ahora usePrediccionStock sumaba el stock global de Items.
        // Si el catálogo v2 NO tiene un stock consolidado, debemos sumarlo de las áreas.

        let stockConsolidado = 0;
        Object.values(getState().areas).forEach((area: any) => {
          if (area.stock && area.stock[itemId]) {
            stockConsolidado += area.stock[itemId];
          }
        });

        if (stockConsolidado === 0) {
          cantidadPosible = 0;
          ingredienteLimitante = itemInventario.nombre;
          break;
        }

        const posibleConEsteIngrediente = Math.floor(stockConsolidado / cantidadRequerida);

        if (posibleConEsteIngrediente < cantidadPosible) {
          cantidadPosible = posibleConEsteIngrediente;
          ingredienteLimitante = itemInventario.nombre;
        }
      }

      return {
        productoId: producto.id,
        productoNombre: producto.nombre,
        cantidadPosible: cantidadPosible === Infinity ? 0 : cantidadPosible,
        ingredienteLimitante,
        stockSuficiente: cantidadPosible >= 5,
      };
    });
  },
});
