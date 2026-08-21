/**
 * 📦 REPOSITORIO DE PEDIDOS
 * Capa de abstracción para operaciones de pedidos
 * NUNCA llamar a Firebase directamente desde componentes o hooks de negocio
 */

import type { Database } from 'firebase/database';
import { get, off, onValue, ref, remove, runTransaction, set, update } from 'firebase/database';
import { ensureNumberTimestamp } from '../../logica/dominio/normalizers';
import { DespachadorCola } from '../impresion/fierros/cola/DespachadorCola';
import { resolver } from '../../sistema/utilidades/paths';
import { assertValidTenantPath } from '../rtdb/guards';
import { SincronizadorCocina } from '../../capacidades/cocina/SincronizadorCocina';

export type PedidoItem = {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  variantes?: Record<string, string[]>;
  variantLabels?: string[];
  notas?: string;
  estado: 'nuevo' | 'en_cocina' | 'en_preparacion' | 'listo' | 'entregado';
  productId?: string | null; // Para descuento de inventario
  productCode?: string; // Código legible
  prepMin?: number; // Tiempo límite de preparación en minutos
  startedAt?: number; // Timestamp cuando se empezó a preparar
  agregadoAt?: number; // Timestamp cuando se agregó el item
  agregadoAtISO?: string; // ISO string
  impreso?: boolean;
  inventoryDeducted?: boolean; // ✅ NUEVO: Si ya se descontó del inventario
  inventoryError?: string | null;
  inventoryErrorCode?: string | null;
  inventoryErrorAt?: number | null;
};

export type Pedido = {
  id: string;
  tipo: 'mesa' | 'para_llevar' | 'delivery';
  mesaId?: string;
  estatus: string;
  items: Record<string, PedidoItem>;
  totales?: {
    subtotal: number;
    total: number;
  };
  createdAt: number;
  createdAtISO?: string;
  updatedAt?: number;
  updatedAtISO?: string;
  sentToKitchenAt?: number;
  sentToKitchenAtISO?: string;
  cuentaSolicitada?: boolean;
  cuentaImpresa?: boolean; // ✅ NUEVO: Si ya se imprimió la cuenta
  cuentaImpresaAt?: number; // ✅ NUEVO: Cuándo se imprimió
  cuentaImpresaAtISO?: string; // ✅ NUEVO: ISO timestamp
  cerrado?: boolean;
  pagadoAt?: number;
  pagadoAtISO?: string;
  _seqItems?: number; // Secuencia interna para IDs de items
};

export class PedidosRepository {
  constructor(
    private db: Database,
    private tenantPath: string
  ) {
    assertValidTenantPath(tenantPath);
  }

  private getBasePath() {
    return `${this.tenantPath}/${resolver('pedidos')}`;
  }

  private getSequencesPath() {
    return `${this.tenantPath}/secuencias`;
  }

  private formatDateYYYYMMDD(ts: number) {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }

  private toISO(ts: number) {
    return new Date(ts).toISOString();
  }

  private slugify(x?: string | null) {
    const s = String(x || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
    return s
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
  }

  private sanitize<T>(value: T): T {
    if (value === undefined) {
      return undefined as unknown as T;
    }

    if (value === null) {
      return value;
    }

    if (Array.isArray(value)) {
      const sanitizedArray = value
        .map((item) => this.sanitize(item))
        .filter((item) => item !== undefined);
      return sanitizedArray as unknown as T;
    }

    if (typeof value === 'object' && (value as object).constructor === Object) {
      const result: Record<string, unknown> = {};
      for (const [key, rawVal] of Object.entries(value as Record<string, unknown>)) {
        const sanitizedVal = this.sanitize(rawVal as unknown);
        if (sanitizedVal !== undefined) {
          result[key] = sanitizedVal;
        }
      }
      return result as T;
    }

    return value;
  }

  /**
   * Genera un ID de pedido legible y único por día: PED-YYYYMMDD-###
   */
  private async generarIdPedido(): Promise<string> {
    const now = Date.now();
    const ymd = this.formatDateYYYYMMDD(now);
    const seqRef = ref(this.db, `${this.getSequencesPath()}/pedidos/${ymd}`);
    const { snapshot } = await runTransaction(seqRef, (current) => {
      const val = typeof current === 'number' ? current : 0;
      return val + 1;
    });
    const n = snapshot.val() as number;
    const seq = String(n).padStart(3, '0');
    return `PED-${ymd}-${seq}`;
  }

  /**
   * Genera un ID de item incremental por pedido: IT-###
   */
  private async generarIdItem(pedidoId: string): Promise<string> {
    const seqRef = ref(this.db, `${this.getBasePath()}/${pedidoId}/_seqItems`);
    const { snapshot } = await runTransaction(seqRef, (current) => {
      const val = typeof current === 'number' ? current : 0;
      return val + 1;
    });
    const n = snapshot.val() as number;
    return `IT-${String(n).padStart(3, '0')}`;
  }

  /**
   * Suscribirse a todos los pedidos
   */
  suscribirTodos(callback: (pedidos: Record<string, Pedido>) => void): () => void {
    const r = ref(this.db, this.getBasePath());
    const cb = onValue(r, (snap) => {
      callback((snap.val() as any) || {});
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Suscribirse a un pedido específico
   */
  suscribirPorId(pedidoId: string, callback: (pedido: Pedido | null) => void): () => void {
    const r = ref(this.db, `${this.getBasePath()}/${pedidoId}`);
    const cb = onValue(r, (snap) => {
      callback(snap.val() as Pedido | null);
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Suscribirse a los items de un pedido
   */
  suscribirItems(
    pedidoId: string,
    callback: (items: Record<string, PedidoItem>) => void
  ): () => void {
    const r = ref(this.db, `${this.getBasePath()}/${pedidoId}/items`);
    const cb = onValue(r, (snap) => {
      const raw = (snap.val() as any) || {};
      // logger.debug('[PedidosRepo]', 'suscribirItems', pedidoId, Object.keys(raw).length);
      callback(raw);
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Obtener un pedido (una sola vez)
   */
  async obtenerPorId(pedidoId: string): Promise<Pedido | null> {
    const snap = await get(ref(this.db, `${this.getBasePath()}/${pedidoId}`));
    return snap.val() as Pedido | null;
  }

  /**
   * Crear un nuevo pedido
   */
  async crear(pedido: Omit<Pedido, 'id'>): Promise<string> {
    const now = ensureNumberTimestamp(Date.now());
    const id = await this.generarIdPedido();
    const pedidoRef = ref(this.db, `${this.getBasePath()}/${id}`);

    // Escribir base del pedido con items vacíos para poder generar secuencia
    const payloadPedido = this.sanitize({
      ...pedido,
      items: {},
      createdAt: now,
      createdAtISO: this.toISO(now),
      updatedAt: now,
      updatedAtISO: this.toISO(now),
      _seqItems: 0,
    });
    await set(pedidoRef, payloadPedido as any);

    // Si vienen items en el payload, normalizarlos a IT-###
    const itemsPayload: Record<string, Omit<PedidoItem, 'id'>> = (pedido as any).items || {};
    for (const [, raw] of Object.entries(itemsPayload)) {
      const productCode = this.slugify((raw as any).nombre || undefined);
      await this.agregarItem(id, { ...(raw as any), productCode });
    }
    // Index por mesa: acelerar descubrimiento de pedido activo por mesa
    if ((pedido as any).mesaId) {
      const mesaId = (pedido as any).mesaId as string;
      await set(
        ref(this.db, `${this.tenantPath}/pedidos_por_mesa/${mesaId}/${id}`),
        ensureNumberTimestamp(Date.now())
      );
    }
    return id;
  }

  /**
   * Actualizar un pedido
   */
  async actualizar(pedidoId: string, datos: Partial<Pedido>): Promise<void> {
    const now = ensureNumberTimestamp(Date.now());
    const payload = this.sanitize({
      ...datos,
      updatedAt: now,
      updatedAtISO: this.toISO(now),
    });
    await update(ref(this.db, `${this.getBasePath()}/${pedidoId}`), payload as any);
  }

  /**
   * Agregar item a un pedido
   */
  async agregarItem(pedidoId: string, item: Omit<PedidoItem, 'id'>): Promise<string> {
    const itemId = await this.generarIdItem(pedidoId);
    const now = ensureNumberTimestamp(Date.now());
    const payloadItem = this.sanitize({
      ...item,
      productCode: item.productCode || this.slugify((item as any).nombre || undefined),
      agregadoAt: now,
      agregadoAtISO: this.toISO(now),
      impreso: item.impreso ?? false,
    });
    await set(
      ref(this.db, `${this.getBasePath()}/${pedidoId}/items/${itemId}`),
      payloadItem as any
    );
    // Touch updatedAt del pedido
    await this.actualizar(pedidoId, {});
    return itemId;
  }

  /**
   * Actualizar un item específico
   */
  async actualizarItem(
    pedidoId: string,
    itemId: string,
    datos: Partial<PedidoItem>
  ): Promise<void> {
    const payload = this.sanitize(datos);
    await update(ref(this.db, `${this.getBasePath()}/${pedidoId}/items/${itemId}`), payload as any);
    // Touch updatedAt del pedido
    await this.actualizar(pedidoId, {});
  }

  /**
   * Eliminar un item
   */
  async eliminarItem(pedidoId: string, itemId: string): Promise<void> {
    await remove(ref(this.db, `${this.getBasePath()}/${pedidoId}/items/${itemId}`));
  }

  /**
   * Actualizar estado de un item
   * ⚡ OPTIMIZADO: Escritura atómica directa sin doble llamada
   */
  async actualizarEstadoItem(
    pedidoId: string,
    itemId: string,
    estado: PedidoItem['estado']
  ): Promise<void> {
    const now = ensureNumberTimestamp(Date.now());
    const batchUpdates: Record<string, any> = {};
    batchUpdates[`${this.getBasePath()}/${pedidoId}/items/${itemId}/estado`] = estado;
    batchUpdates[`${this.getBasePath()}/${pedidoId}/updatedAt`] = now;
    batchUpdates[`${this.getBasePath()}/${pedidoId}/updatedAtISO`] = this.toISO(now);
    await update(ref(this.db), batchUpdates);
  }

  /**
   * ⚡ Actualizar estado de múltiples items en una sola operación atómica
   * Reduce latencia de N escrituras a 1 sola escritura
   */
  async actualizarEstadoItemsBatch(
    pedidoId: string,
    updates: { itemId: string; estado: PedidoItem['estado']; startedAt?: number }[]
  ): Promise<void> {
    const now = ensureNumberTimestamp(Date.now());
    const batchUpdates: Record<string, any> = {};

    // Actualizar cada item
    updates.forEach(({ itemId, estado, startedAt }) => {
      batchUpdates[`${this.getBasePath()}/${pedidoId}/items/${itemId}/estado`] = estado;
      if (startedAt !== undefined) {
        batchUpdates[`${this.getBasePath()}/${pedidoId}/items/${itemId}/startedAt`] = startedAt;
      }
    });

    // Actualizar timestamp del pedido
    batchUpdates[`${this.getBasePath()}/${pedidoId}/updatedAt`] = now;
    batchUpdates[`${this.getBasePath()}/${pedidoId}/updatedAtISO`] = this.toISO(now);

    await update(ref(this.db), batchUpdates);
  }

  /**
   * Marcar pedido como enviado a cocina
   * ⚡ OPTIMIZADO: Solo cambia estados, NO descuenta inventario (se mueve a transiciones)
   * ⚡ OPTIMIZADO: Lecturas mínimas y escritura atómica
   */
  async enviarACocina(pedidoId: string): Promise<void> {
    try {
      const now = ensureNumberTimestamp(Date.now());
      const nowISO = this.toISO(now);

      const postCommitTasks: (() => Promise<void>)[] = [];

      // 1. Obtener el pedido completo
      const pedido = await this.obtenerPorId(pedidoId);
      if (!pedido) {
        throw new Error('Pedido no encontrado');
      }

      // 2. Filtrar SOLO items nuevos
      const itemsNuevos = Object.entries(pedido.items || {})
        .filter(([_, item]: [string, any]) => item.estado === 'nuevo')
        .map(([itemId, item]: [string, any]) => ({ itemId, item }));

      if (itemsNuevos.length === 0) {
        if (pedido.estatus !== 'enviado_cocina' && pedido.estatus !== 'en_preparacion') {
          await this.actualizar(pedidoId, {
            estatus: 'enviado_cocina',
            sentToKitchenAt: pedido.sentToKitchenAt || now,
            sentToKitchenAtISO: pedido.sentToKitchenAtISO || nowISO,
          });
        }
        return;
      }

      const productosRef = ref(this.db, `${this.tenantPath}/${resolver('menu_productos')}`);
      const categoriasRef = ref(this.db, `${this.tenantPath}/menu/categorias`);

      const [productosSnap, categoriasSnap] = await Promise.all([
        get(productosRef),
        get(categoriasRef),
      ]);

      const productos = (productosSnap.val() as any) || {};
      const categorias = (categoriasSnap.val() as any) || {};

      const kitchenItems: { itemId: string; item: any }[] = [];
      const directItems: { itemId: string; item: any }[] = [];

      console.log(`[PedidosRepo] ⚙️ Clasificando ${itemsNuevos.length} items...`);

      for (const { itemId, item } of itemsNuevos) {
        let vaACocina = true;

        // Buscar producto
        let producto: any = null;
        if (item.productId && productos[item.productId]) {
          producto = productos[item.productId];
        } else {
          // Fallback fuzzy
          const nombreLower = (item.nombre || '').toLowerCase().trim();
          producto = Object.values(productos).find(
            (p: any) => (p.nombre || '').toLowerCase().trim() === nombreLower
          );
        }

        if (producto) {
          if (producto.usarConfigPersonalizada === true) {
            vaACocina = producto.enviarACocina !== false;
          } else {
            const categoriaId = producto.categoriaId;
            if (categoriaId && categorias[categoriaId]) {
              vaACocina = categorias[categoriaId].enviarACocina !== false;
            }
          }
        }

        if (vaACocina) {
          kitchenItems.push({ itemId, item });
        } else {
          directItems.push({ itemId, item });
        }
      }

      console.log(
        `[PedidosRepo] 📋 Clasificación: ${kitchenItems.length} a cocina, ${directItems.length} directos`
      );

      const batchUpdates: Record<string, any> = {};

      // Items for Kitchen
      if (kitchenItems.length > 0) {
        kitchenItems.forEach(({ itemId }) => {
          const path = `${this.getBasePath()}/${pedidoId}/items/${itemId}`;
          batchUpdates[`${path}/impreso`] = true;
        });

        // 🖨️ ENCOLAR COMANDA AL HUB (Canal: standard para restaurante)
        // El Hub Central escuchará esta cola y procesará la impresión
        const comandaItems = kitchenItems.map(({ item }) => ({
          nombre: item.nombre,
          cantidad: item.cantidad,
          variantes: item.variantes ? Object.values(item.variantes).flat().join(', ') : undefined,
        }));

        const jobId = `job_comanda_v1_${pedidoId}_${now}`;

        // Fire-and-forget: No bloqueamos el flujo principal
        DespachadorCola.encolarRemoto(this.db, this.tenantPath, {
          idTrabajo: jobId,
          idPedido: pedidoId,
          proposito: 'comanda',
          templateVersion: 'v1',
          canal: 'standard', // Comandas van al canal estándar (restaurante)
          payload: {
            mesaId: pedido.mesaId,
            tipo: pedido.tipo,
            items: comandaItems,
            timestamp: now,
          },
        })
          .then(() => {
            console.log(`[PedidosRepo] 🖨️ Comanda encolada al Hub: ${jobId}`);
          })
          .catch((err) => {
            console.error('[PedidosRepo] ⚠️ Error encolando comanda:', err);
          });
      }

      // Items Direct -> Ready
      if (directItems.length > 0) {
        for (const { itemId, item } of directItems) {
          const path = `${this.getBasePath()}/${pedidoId}/items/${itemId}`;

          batchUpdates[`${path}/estado`] = 'listo';
          batchUpdates[`${path}/impreso`] = true;
          batchUpdates[`${path}/listoAt`] = now;

          if (item.productId) {
            postCommitTasks.push(async () => {
              try {
                const res = await SincronizadorCocina.descontarPorReceta(
                  item.productId,
                  item.cantidad || 1
                );
                if (res.success && res.descontados && res.descontados.length > 0) {
                  await update(ref(this.db, `${this.getBasePath()}/${pedidoId}/items/${itemId}`), {
                    inventoryDeducted: true,
                  });
                }
              } catch (e) {
                console.error(`[PedidosRepo] ⚠️ Falló descuento directo para ${item.nombre}`, e);
              }
            });
          }
        }
      }

      if (kitchenItems.length > 0) {
        batchUpdates[`${this.getBasePath()}/${pedidoId}/estatus`] = 'enviado_cocina';
        batchUpdates[`${this.getBasePath()}/${pedidoId}/sentToKitchenAt`] =
          pedido.sentToKitchenAt || now;
        batchUpdates[`${this.getBasePath()}/${pedidoId}/sentToKitchenAtISO`] =
          pedido.sentToKitchenAtISO || nowISO;
      } else {
        if (pedido.estatus === 'nuevo' || !pedido.estatus) {
          batchUpdates[`${this.getBasePath()}/${pedidoId}/estatus`] = 'listo';
        }
      }

      batchUpdates[`${this.getBasePath()}/${pedidoId}/updatedAt`] = now;
      batchUpdates[`${this.getBasePath()}/${pedidoId}/updatedAtISO`] = nowISO;

      await update(ref(this.db), batchUpdates);

      if (postCommitTasks.length > 0) {
        for (const task of postCommitTasks) {
          void task();
        }
      }
    } catch (error) {
      console.error('[PedidosRepo] Error en enviarACocina:', error);
      throw error;
    }
  }

  /**
   * Cerrar pedido (pagado)
   */
  async cerrar(pedidoId: string): Promise<void> {
    const now = ensureNumberTimestamp(Date.now());
    await this.actualizar(pedidoId, {
      cerrado: true,
      estatus: 'cerrado',
      pagadoAt: now,
      pagadoAtISO: this.toISO(now),
    });
    // Intentar limpiar índice por mesa
    try {
      const snap = await get(ref(this.db, `${this.getBasePath()}/${pedidoId}`));
      const v = (snap.val() as any) || {};
      const mesaId = v?.mesaId;
      if (mesaId) {
        await remove(ref(this.db, `${this.tenantPath}/pedidos_por_mesa/${mesaId}/${pedidoId}`));
      }
    } catch {}
  }

  /**
   * Eliminar un pedido
   */
  async eliminar(pedidoId: string): Promise<void> {
    await remove(ref(this.db, `${this.getBasePath()}/${pedidoId}`));
  }
}
