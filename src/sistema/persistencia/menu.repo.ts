/**
 * 📋 REPOSITORIO DE MENÚ
 * Capa de abstracción para operaciones de menú (categorías y productos)
 */

import type { Database } from 'firebase/database';
import { assertValidTenantPath, sanitizeRtdbPayload } from '../rtdb/guards';
import { get, off, onValue, push, ref, remove, set, update } from 'firebase/database';

export type Categoria = {
  id: string;
  nombre: string;
  orden?: number;
  activa?: boolean;
  slug?: string;
  /**
   * 🔥 NUEVO: Define si items de esta categoría van a COCINA o se quedan en MESERA
   * - true (default): Items van a cocina, pasan por estados (nuevo → en_cocina → en_preparacion → listo)
   * - false: Items se quedan en mesera, saltan directo a 'listo' (bebidas, postres, etc.)
   */
  enviarACocina?: boolean;
  /**
   * ⚡ NUEVO: Define si items de esta categoría saltan el estado PREPARANDO
   * Solo aplica si enviarACocina = true
   * - false (default): Flujo completo (en_cocina → en_preparacion → listo)
   * - true: Flujo rápido (en_cocina → listo)
   */
  saltarPreparando?: boolean;
  /**
   * 👪 HERENCIA DE VISIBILIDAD
   * Configuración que se propaga a nuevos productos creados en esta categoría.
   */
  herencia?: {
    mesero?: boolean;
    digital?: boolean;
    ventaCrudo?: boolean;
  };
};

export type Producto = {
  id: string;
  nombre: string;
  precio: number;
  categoriaId: string;
  slug?: string;
  descripcion?: string;
  imagen?: string;
  variantes?: {
    grupos?: Record<string, VariantGroup>;
    reglas?: {
      visible?: Record<string, VariantRule>;
      disable?: Record<string, VariantRule>;
    };
  };
  visible?: {
    digital?: boolean;
    mesero?: boolean;
    ventaCrudo?: boolean;
  };
  activo?: boolean;
  orden?: number;
  prepMin?: number;
  receta?: {
    ingredientes?: Record<string, number>; // itemId: quantity
  };
  /**
   * 🔥 CONFIGURACIÓN DE COCINA POR PRODUCTO (prevalece sobre categoría)
   * Si usarConfigPersonalizada = true, se usan estos valores en lugar de los de la categoría
   */
  usarConfigPersonalizada?: boolean; // Si false/undefined, hereda de categoría
  enviarACocina?: boolean;
  saltarPreparando?: boolean;
  // Propiedades para módulo POS/Caja Rápida
  codigoBarras?: string;
  unidad?: 'kg' | 'g' | 'l' | 'ml' | 'pza' | 'caja';
};

export type VariantGroup = {
  obligatorio?: boolean;
  opciones: Record<string, VariantOption>;
  rol?: string; // Opcional: si falta, se asume igual a titulo
  tipo: 'single' | 'multi';
  titulo: string;
  nextGroupId?: string; // 🔥 NUEVO: Referencia al siguiente grupo en el flujo
  excludeFromSibling?: string; // 🔄 NUEVO: ID del grupo con el que no se puede repetir selección (Mixtos)
};

export type VariantOption = {
  delta?: number; // Opcional: si falta, se asume 0
  /** Texto legible para Mesero, Cocina y catálogo; el key sigue siendo el ID interno. */
  label?: string;
  /** Alias tolerado para datos legacy o integraciones externas. */
  nombre?: string;
  titulo: string;
  triggers?: {
    // ⚡ NUEVO: Disparadores de visibilidad dinámicos
    showGroups?: string[];
    hideGroups?: string[];
  };
};

export function getVariantOptionLabel(
  option: Partial<VariantOption> | string | null | undefined,
  fallback = ''
): string {
  if (typeof option === 'string') return option.trim() || fallback;
  const candidates = [option?.label, option?.nombre, option?.titulo];
  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() || fallback;
}

export type VariantRule = {
  showGroups?: Record<string, boolean>;
  hideGroups?: Record<string, boolean>;
  disableGroups?: Record<string, boolean>;
  whenGroup: string;
  whenOpt: string;
};

export class MenuRepository {
  constructor(
    private db: Database,
    private tenantPath: string
  ) {
    assertValidTenantPath(tenantPath);
  }

  private slugify(x?: string | null) {
    const raw = String(x || '').trim();
    const s = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
    const slug = s
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    if (slug) return slug;
    if (!raw) return '';

    // Fallback estable para nombres con solo emojis/símbolos.
    // Evita slug vacío y permite unicidad consistente.
    let h = 0;
    for (let i = 0; i < raw.length; i++) {
      h = (h * 31 + raw.charCodeAt(i)) >>> 0;
    }
    return `x-${h.toString(36)}`.slice(0, 48);
  }

  /**
   * Suscribir productos de una categoría específica (dual-read)
   * - Nested: menu/categorias/{catId}/productos
   * - Fallback flat: menu/productos filtrando categoriaId
   */
  suscribirProductosDeCategoria(
    catId: string,
    callback: (productos: Record<string, Producto>) => void
  ): () => void {
    const nestedRef = ref(this.db, `${this.getCategoriasPath()}/${catId}/productos`);
    const flatRef = ref(this.db, this.getFlatProductosPath());
    let nested: Record<string, Producto> = {};
    let flatFiltered: Record<string, Producto> = {};

    const emit = () => {
      callback({ ...(flatFiltered || {}), ...(nested || {}) });
    };

    const cbNested = onValue(nestedRef, (snap) => {
      const raw = ((snap.val() as any) || {}) as Record<string, any>;
      const fixed: Record<string, Producto> = {};
      for (const [pid, p] of Object.entries(raw)) {
        fixed[pid] = { ...(p as any), id: pid } as Producto;
      }
      nested = fixed;
      emit();
    });
    const cbFlat = onValue(flatRef, (snap) => {
      const all = ((snap.val() as any) || {}) as Record<string, any>;
      const filtered: Record<string, Producto> = {};
      for (const [pid, p] of Object.entries(all)) {
        if ((p as any)?.categoriaId === catId) {
          filtered[pid] = { ...(p as any), id: pid } as Producto;
        }
      }
      flatFiltered = filtered;
      emit();
    });

    return () => {
      off(nestedRef, 'value', cbNested as any);
      off(flatRef, 'value', cbFlat as any);
    };
  }

  private getFlatProductosPath() {
    return `${this.tenantPath}/menu/productos`;
  }
  private getCategoriasPath() {
    return `${this.tenantPath}/menu/categorias`;
  }
  private getIndexPath() {
    return `${this.tenantPath}/menu/productos_index`;
  }

  private async ensureUniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
    const snap = await get(ref(this.db, `${this.tenantPath}/menu/categorias`));
    const cats = ((snap.val() as any) || {}) as Record<string, { slug?: string; nombre?: string }>;
    const existing = new Set(
      Object.entries(cats)
        .filter(([id]) => id !== excludeId)
        .map(([_, c]) => c?.slug || this.slugify(c?.nombre))
    );
    if (!existing.has(base)) return base;
    let i = 2;
    while (existing.has(`${base}-${i}`)) i++;
    return `${base}-${i}`;
  }

  private async ensureUniqueProductSlug(
    catId: string,
    base: string,
    excludeProdId?: string
  ): Promise<string> {
    const snap = await get(ref(this.db, this.getIndexPath()));
    const idx = ((snap.val() as any) || {}) as Record<string, { catId?: string; slug?: string }>;
    const existing = new Set(
      Object.entries(idx)
        .filter(([pid, e]) => pid !== excludeProdId && e?.catId === catId)
        .map(([_, e]) => e?.slug)
        .filter(Boolean) as string[]
    );
    if (!existing.has(base)) return base;
    let i = 2;
    while (existing.has(`${base}-${i}`)) i++;
    return `${base}-${i}`;
  }

  // ==================== CATEGORÍAS ====================

  /**
   * Suscribirse a todas las categorías
   */
  suscribirCategorias(callback: (categorias: Record<string, Categoria>) => void): () => void {
    const r = ref(this.db, `${this.tenantPath}/menu/categorias`);
    const cb = onValue(r, (snap) => {
      callback((snap.val() as any) || {});
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Obtener todas las categorías
   */
  async obtenerCategorias(): Promise<Record<string, Categoria>> {
    const snap = await get(ref(this.db, `${this.tenantPath}/menu/categorias`));
    return (snap.val() as any) || {};
  }

  /**
   * Crear categoría
   */
  async crearCategoria(categoria: Omit<Categoria, 'id'>): Promise<string> {
    const r = ref(this.db, `${this.tenantPath}/menu/categorias`);
    const newRef = push(r);
    const base = this.slugify(categoria.nombre);
    const slug = await this.ensureUniqueCategorySlug(base);
    await set(newRef, sanitizeRtdbPayload({ ...categoria, slug }));
    return newRef.key!;
  }

  /**
   * Actualizar categoría
   */
  async actualizarCategoria(categoriaId: string, datos: Partial<Categoria>): Promise<void> {
    const patch: any = { ...datos };
    if (datos.nombre && !('slug' in datos)) {
      const base = this.slugify(datos.nombre);
      patch.slug = await this.ensureUniqueCategorySlug(base, categoriaId);
    }
    await update(
      ref(this.db, `${this.tenantPath}/menu/categorias/${categoriaId}`),
      sanitizeRtdbPayload(patch)
    );
  }

  /**
   * Eliminar categoría
   */
  async eliminarCategoria(categoriaId: string): Promise<void> {
    await remove(ref(this.db, `${this.tenantPath}/menu/categorias/${categoriaId}`));
  }

  // ==================== PRODUCTOS ====================

  /**
   * Suscribirse a todos los productos
   */
  suscribirProductos(callback: (productos: Record<string, Producto>) => void): () => void {
    const flatRef = ref(this.db, this.getFlatProductosPath());
    let flatData: Record<string, Producto> = {};
    let nestedData: Record<string, Producto> = {};
    const nestedByCat: Record<string, Record<string, Producto>> = {};

    const emit = () => {
      const merged = { ...(flatData || {}), ...(nestedData || {}) } as Record<string, Producto>;
      callback(merged);
    };

    const flatCb = onValue(flatRef, (snap) => {
      const raw = ((snap.val() as any) || {}) as Record<string, any>;
      const fixed: Record<string, Producto> = {};
      for (const [pid, p] of Object.entries(raw)) {
        fixed[pid] = { ...(p as any), id: pid } as Producto;
      }
      flatData = fixed;
      emit();
    });

    const catsRef = ref(this.db, this.getCategoriasPath());
    const nestedUnsubs: Record<string, () => void> = {};

    const subscribeCat = (catId: string) => {
      const r = ref(this.db, `${this.getCategoriasPath()}/${catId}/productos`);
      const cb = onValue(r, (snap) => {
        const raw = ((snap.val() as any) || {}) as Record<string, any>;
        const prods: Record<string, Producto> = {};
        for (const [pid, p] of Object.entries(raw)) {
          prods[pid] = { ...(p as any), id: pid } as Producto;
        }
        nestedByCat[catId] = prods;
        // Rebuild nestedData from nestedByCat to avoid stale keys
        const rebuilt: Record<string, Producto> = {};
        for (const m of Object.values(nestedByCat)) {
          Object.assign(rebuilt, m);
        }
        nestedData = rebuilt;
        emit();
      });
      nestedUnsubs[catId] = () => off(r, 'value', cb as any);
    };

    const catsCb = onValue(catsRef, (snap) => {
      const cats = (snap.val() as any) || {};
      const catIds = new Set(Object.keys(cats));
      for (const [cid, unsub] of Object.entries(nestedUnsubs)) {
        if (!catIds.has(cid)) {
          unsub();
          delete nestedUnsubs[cid];
          delete nestedByCat[cid];
        }
      }
      for (const cid of catIds) {
        if (!nestedUnsubs[cid]) {
          subscribeCat(cid);
        }
      }
      // Rebuild after possible removals
      const rebuilt: Record<string, Producto> = {};
      for (const m of Object.values(nestedByCat)) {
        Object.assign(rebuilt, m);
      }
      nestedData = rebuilt;
      emit();
    });

    return () => {
      off(flatRef, 'value', flatCb as any);
      off(catsRef, 'value', catsCb as any);
      Object.values(nestedUnsubs).forEach((u) => u());
    };
  }

  /**
   * Obtener todos los productos
   */
  async obtenerProductos(): Promise<Record<string, Producto>> {
    const [flatSnap, catsSnap] = await Promise.all([
      get(ref(this.db, this.getFlatProductosPath())),
      get(ref(this.db, this.getCategoriasPath())),
    ]);
    const flat = (flatSnap.val() as any) || {};
    const cats = (catsSnap.val() as any) || {};
    const nested: Record<string, Producto> = {};
    const tasks: Promise<any>[] = [];
    for (const cid of Object.keys(cats)) {
      tasks.push(
        get(ref(this.db, `${this.getCategoriasPath()}/${cid}/productos`)).then((s) => {
          Object.assign(nested, (s.val() as any) || {});
        })
      );
    }
    await Promise.all(tasks);
    const merged = { ...(flat || {}), ...(nested || {}) } as Record<string, any>;
    const fixed: Record<string, Producto> = {};
    for (const [pid, p] of Object.entries(merged)) {
      fixed[pid] = { ...(p as any), id: pid } as Producto;
    }
    return fixed;
  }

  /**
   * Obtener producto por ID
   */
  async obtenerProductoPorId(productoId: string): Promise<Producto | null> {
    const idxSnap = await get(ref(this.db, `${this.getIndexPath()}/${productoId}`)).catch(
      () => null as any
    );
    const idx =
      idxSnap && (idxSnap as any).exists && (idxSnap as any).exists() ? idxSnap.val() : null;
    if (idx && idx.catId) {
      const nestedSnap = await get(
        ref(this.db, `${this.getCategoriasPath()}/${idx.catId}/productos/${productoId}`)
      );
      if (nestedSnap.exists()) {
        const val = (nestedSnap.val() as any) || null;
        return val ? ({ id: productoId, ...val } as Producto) : null;
      }
    }
    const flatSnap = await get(ref(this.db, `${this.getFlatProductosPath()}/${productoId}`));
    const fval = (flatSnap.val() as any) || null;
    return fval ? ({ id: productoId, ...fval } as Producto) : null;
  }

  /**
   * Crear producto
   */
  async crearProducto(producto: Omit<Producto, 'id'>): Promise<string> {
    const r = ref(this.db, this.getFlatProductosPath());
    const newRef = push(r);
    const id = newRef.key!;
    const baseSlug = this.slugify(producto.nombre);
    const uniqueSlug = await this.ensureUniqueProductSlug(producto.categoriaId, baseSlug);
    const payload = { ...producto, slug: uniqueSlug } as any;
    // Flat write (compat)
    await set(newRef, payload);
    // Nested write (canonical)
    const catId = producto.categoriaId;
    await set(ref(this.db, `${this.getCategoriasPath()}/${catId}/productos/${id}`), payload);
    // Index write (lookup)
    await set(ref(this.db, `${this.getIndexPath()}/${id}`), {
      catId,
      nombre: producto.nombre,
      precio: producto.precio,
      slug: payload.slug || null,
      hasReceta: !!producto?.receta,
    });
    return id;
  }

  /**
   * Actualizar producto
   */
  async actualizarProducto(productoId: string, datos: Partial<Producto>): Promise<void> {
    console.log('[MenuRepo] 📝 Actualizando producto:', {
      id: productoId,
      updates: Object.keys(datos),
    });

    // Leer producto actual para detectar cambio de categoría
    const currentSnap = await get(ref(this.db, `${this.getFlatProductosPath()}/${productoId}`));
    const current = (currentSnap.val() as any) || {};
    const prevCat = current?.categoriaId;
    const nextCat = datos.categoriaId ?? prevCat;

    if (!nextCat) {
      console.warn('[MenuRepo] ⚠️ Producto sin categoría detectado:', productoId);
    }
    const patch: any = { ...datos };
    if (datos.nombre && !('slug' in datos)) {
      const base = this.slugify(datos.nombre);
      patch.slug = await this.ensureUniqueProductSlug(nextCat, base, productoId);
    }
    // Flat
    await update(ref(this.db, `${this.getFlatProductosPath()}/${productoId}`), patch);
    // Nested: si cambió de categoría, mover
    if (prevCat && prevCat !== nextCat) {
      const prevRef = ref(
        this.db,
        `${this.getCategoriasPath()}/${prevCat}/productos/${productoId}`
      );
      const nextRef = ref(
        this.db,
        `${this.getCategoriasPath()}/${nextCat}/productos/${productoId}`
      );
      const prevDataSnap = await get(prevRef);
      const prevData = (prevDataSnap.val() as any) || {};
      const merged = { ...prevData, ...patch };
      await set(nextRef, merged);
      await set(prevRef, null as any);
    } else if (nextCat) {
      // 🔥 MIGRACIÓN AUTOMÁTICA: Leer datos completos de Flat y fusionar con patch
      const flatSnap = await get(ref(this.db, `${this.getFlatProductosPath()}/${productoId}`));
      const flatData = (flatSnap.val() as any) || {};
      const merged = { ...flatData, ...patch };
      // Usar set() en lugar de update() para crear el producto en Nested si no existe
      await set(
        ref(this.db, `${this.getCategoriasPath()}/${nextCat}/productos/${productoId}`),
        merged
      );
    }
    // Index
    await update(ref(this.db, `${this.getIndexPath()}/${productoId}`), {
      catId: nextCat,
      nombre: patch.nombre ?? current?.nombre,
      precio: patch.precio ?? current?.precio,
      slug: patch.slug ?? current?.slug ?? null,
    } as any);
  }

  /**
   * Eliminar producto
   */
  async eliminarProducto(productoId: string): Promise<void> {
    // Leer para conocer categoria
    const snap = await get(ref(this.db, `${this.getFlatProductosPath()}/${productoId}`));
    const prod = (snap.val() as any) || {};
    const catId = prod?.categoriaId;
    // Flat
    await remove(ref(this.db, `${this.getFlatProductosPath()}/${productoId}`));
    // Nested
    if (catId) {
      await remove(ref(this.db, `${this.getCategoriasPath()}/${catId}/productos/${productoId}`));
    }
    // Index
    await remove(ref(this.db, `${this.getIndexPath()}/${productoId}`));
  }

  /**
   * Activar/desactivar producto
   */
  async toggleProductoActivo(productoId: string, activo: boolean): Promise<void> {
    await this.actualizarProducto(productoId, { activo });
  }

  /**
   * 🚑 REPARACIÓN DE INTEGRIDAD (SELF-HEALING)
   * Sincroniza Flat y Nested para asegurar consistencia total.
   * Prioriza la versión que tenga 'variantes' definidas.
   */
  async repararIntegridad(): Promise<void> {
    try {
      // 1. Leer todo el universo de datos
      const [flatSnap, catsSnap] = await Promise.all([
        get(ref(this.db, this.getFlatProductosPath())),
        get(ref(this.db, this.getCategoriasPath())),
      ]);

      const flatMap = (flatSnap.val() as Record<string, Producto>) || {};
      const catsMap = (catsSnap.val() as Record<string, any>) || {};

      // Recolectar todos los productos anidados
      const nestedMap: Record<string, Producto> = {};
      Object.entries(catsMap).forEach(([catId, catData]) => {
        if (catData.productos) {
          Object.assign(nestedMap, catData.productos);
        }
      });

      const updates: Record<string, any> = {};
      const allIds = new Set([...Object.keys(flatMap), ...Object.keys(nestedMap)]);

      console.log(`[MenuRepo] 🚑 Iniciando auto-reparación en ${allIds.size} productos...`);

      allIds.forEach((id) => {
        const flat = flatMap[id];
        const nested = nestedMap[id];

        // CASO 1: Existe en ambos, pero son diferentes (Discrepancia)
        if (flat && nested) {
          const flatHasVariants = flat.variantes && Object.keys(flat.variantes || {}).length > 0;
          const nestedHasVariants =
            nested.variantes && Object.keys(nested.variantes || {}).length > 0;

          // Si Nested tiene variantes y Flat no (o nombres difieren), Nested gana -> Actualizar Flat
          // O si el nombre en Flat parece corrupto ("Categoría...") y el de Nested no
          if ((nestedHasVariants && !flatHasVariants) || nested.nombre !== flat.nombre) {
            // Preferir el que NO empiece con "Categoría" si es el caso
            const flatBadName = flat.nombre.startsWith('Categoría');
            const nestedBadName = nested.nombre.startsWith('Categoría');

            if (flatBadName && !nestedBadName) {
              updates[`${this.getFlatProductosPath()}/${id}`] = nested;
            } else if (!flatBadName && nestedBadName) {
              updates[`${this.getCategoriasPath()}/${flat.categoriaId}/productos/${id}`] = flat;
            } else {
              // Default: Nested gana si tiene variantes o es igual de válido
              updates[`${this.getFlatProductosPath()}/${id}`] = nested;
            }
          }
        }
        // CASO 2: Existe en Flat pero NO en Nested (Faltante Nested)
        else if (flat && !nested) {
          const catId = flat.categoriaId;
          if (catId) {
            updates[`${this.getCategoriasPath()}/${catId}/productos/${id}`] = flat;
          }
        }
        // CASO 3: Existe en Nested pero NO en Flat (Faltante Flat)
        else if (!flat && nested) {
          updates[`${this.getFlatProductosPath()}/${id}`] = nested;
        }
      });

      // Aplicar correcciones masivas atómicamente
      if (Object.keys(updates).length > 0) {
        console.log(
          `[MenuRepo] ✅ Aplicando ${Object.keys(updates).length} correcciones de integridad.`
        );
        await update(ref(this.db), updates);
      } else {
        console.log('[MenuRepo] ✨ Integridad verificada. Todo correcto.');
      }
    } catch (error) {
      console.error('[MenuRepo] ❌ Error en auto-reparación:', error);
    }
  }
}
