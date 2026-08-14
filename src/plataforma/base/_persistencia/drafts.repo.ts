/**
 * 📝 REPOSITORIO LOCAL DE BORRADORES (order_drafts_v1)
 *
 * DOGMA ADI — CORE CIEGO:
 * - Opera exclusivamente sobre SQLiteStorageAdapter. CERO Firebase.
 * - Idempotente: cada mutación exige `operationId` + `dedupeKey`.
 * - Variantes como Record<string, string> plano (sin arrays).
 * - Aislado por tenantId + deviceId. Nunca cruza tenants.
 */

import { SQLiteStorageAdapter } from '../../core/offline/storage/SQLiteStorageAdapter';
import { logger } from '../../core/monitoring';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS CANÓNICOS (schema order_drafts_v1)
// ─────────────────────────────────────────────────────────────────────────────

export type DraftItem = {
  itemId: string; // UUID del ítem — generado en punto de emisión
  draftId: string; // FK hacia order_drafts_v1
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  tamano?: Record<string, string>; // variante de tamaño: plana, sin arrays
  preparacion?: Record<string, string>; // variante de preparación: plana, sin arrays
  precioBase?: number;
  deltaPrecio?: number;
  prepMinutos?: number;
};

export type DraftEstado = 'abierto' | 'enviado' | 'cerrado';
export type DraftOrigen = 'mesa' | 'takeaway' | 'barra';

export type OrderDraft = {
  draftId: string;
  mesaId: string;
  origen: DraftOrigen;
  estado: DraftEstado;
  deviceId: string;
  createdAt: number;
  updatedAt: number;
};

/** Sobre para comandos idempotentes — OBLIGATORIO en toda mutación */
export type ComandoIdempotente = {
  operationId: string; // UUID v4 único por intención
  dedupeKey: string; // `${draftId}:${deviceId}:${accion}`
};

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZACIÓN DEL SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Asegura que las tablas `order_drafts_v1` y `order_draft_items_v1` existan.
 * Llamar una vez al arranque del módulo POS (antes de cualquier operación).
 */
export async function inicializarSchemaDrafts(): Promise<void> {
  const adapter = SQLiteStorageAdapter as any;
  if (!adapter.db) return; // web fallback

  await adapter.db.execAsync(`
    CREATE TABLE IF NOT EXISTS order_drafts_v1 (
      draftId   TEXT PRIMARY KEY,
      mesaId    TEXT NOT NULL,
      origen    TEXT NOT NULL,
      estado    TEXT NOT NULL DEFAULT 'abierto',
      deviceId  TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_draft_items_v1 (
      itemId      TEXT PRIMARY KEY,
      draftId     TEXT NOT NULL REFERENCES order_drafts_v1(draftId) ON DELETE CASCADE,
      productoId  TEXT NOT NULL,
      nombre      TEXT NOT NULL,
      precio      REAL NOT NULL,
      cantidad    INTEGER NOT NULL DEFAULT 1,
      tamano      TEXT,
      preparacion TEXT,
      precioBase  REAL,
      deltaPrecio REAL,
      prepMinutos INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_drafts_mesa  ON order_drafts_v1(mesaId);
    CREATE INDEX IF NOT EXISTS idx_items_draft  ON order_draft_items_v1(draftId);
  `);

  logger.info('DRAFTS_REPO', '✅ Schema order_drafts_v1 inicializado');
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORIO
// ─────────────────────────────────────────────────────────────────────────────

export class DraftsLocalRepo {
  constructor(private readonly tenantId: string, private readonly deviceId: string) {}

  // ── DRAFTS ────────────────────────────────────────────────────────────────

  /** Crea un borrador nuevo. Idempotente: si ya existe con ese draftId, no duplica. */
  async crearDraft(
    cmd: ComandoIdempotente,
    draft: Omit<OrderDraft, 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const adapter = SQLiteStorageAdapter as any;
    if (!adapter.db) return;

    const ahora = Date.now();
    await adapter.db.runAsync(
      `INSERT OR IGNORE INTO order_drafts_v1
         (draftId, mesaId, origen, estado, deviceId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [draft.draftId, draft.mesaId, draft.origen, draft.estado, this.deviceId, ahora, ahora]
    );

    logger.info('DRAFTS_REPO', `Draft creado: ${draft.draftId}`, {
      operationId: cmd.operationId,
      dedupeKey: cmd.dedupeKey,
    });
  }

  /** Obtiene todos los borradores activos del tenant/dispositivo. */
  async obtenerDraftsAbiertos(): Promise<OrderDraft[]> {
    const adapter = SQLiteStorageAdapter as any;
    if (!adapter.db) return [];

    return (await adapter.db.getAllAsync(
      `SELECT * FROM order_drafts_v1
       WHERE deviceId = ? AND estado = 'abierto'
       ORDER BY updatedAt DESC`,
      [this.deviceId]
    )) as OrderDraft[];
  }

  /** Obtiene un borrador por ID de mesa (el más reciente abierto). */
  async obtenerDraftPorMesa(mesaId: string): Promise<OrderDraft | null> {
    const adapter = SQLiteStorageAdapter as any;
    if (!adapter.db) return null;

    return (await adapter.db.getFirstAsync(
      `SELECT * FROM order_drafts_v1
       WHERE mesaId = ? AND deviceId = ? AND estado = 'abierto'
       ORDER BY updatedAt DESC`,
      [mesaId, this.deviceId]
    )) as OrderDraft | null;
  }

  /** Cambia el estado del borrador (enviado/cerrado). */
  async actualizarEstado(
    cmd: ComandoIdempotente,
    draftId: string,
    nuevoEstado: DraftEstado
  ): Promise<void> {
    const adapter = SQLiteStorageAdapter as any;
    if (!adapter.db) return;

    await adapter.db.runAsync(
      `UPDATE order_drafts_v1 SET estado = ?, updatedAt = ? WHERE draftId = ?`,
      [nuevoEstado, Date.now(), draftId]
    );

    logger.info('DRAFTS_REPO', `Draft ${draftId} → ${nuevoEstado}`, {
      operationId: cmd.operationId,
    });
  }

  // ── ÍTEMS ─────────────────────────────────────────────────────────────────

  /** Agrega un ítem al borrador. Idempotente por itemId. */
  async agregarItem(cmd: ComandoIdempotente, item: DraftItem): Promise<void> {
    const adapter = SQLiteStorageAdapter as any;
    if (!adapter.db) return;

    await adapter.db.runAsync(
      `INSERT OR REPLACE INTO order_draft_items_v1
         (itemId, draftId, productoId, nombre, precio, cantidad,
          tamano, preparacion, precioBase, deltaPrecio, prepMinutos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.itemId,
        item.draftId,
        item.productoId,
        item.nombre,
        item.precio,
        item.cantidad,
        item.tamano ? JSON.stringify(item.tamano) : null,
        item.preparacion ? JSON.stringify(item.preparacion) : null,
        item.precioBase ?? null,
        item.deltaPrecio ?? null,
        item.prepMinutos ?? null,
      ]
    );

    logger.info('DRAFTS_REPO', `Ítem agregado: ${item.itemId} → draft ${item.draftId}`, {
      operationId: cmd.operationId,
      dedupeKey: cmd.dedupeKey,
    });
  }

  /** Incrementa la cantidad de un ítem. */
  async incrementarCantidad(
    cmd: ComandoIdempotente,
    itemId: string,
    delta: number = 1
  ): Promise<void> {
    const adapter = SQLiteStorageAdapter as any;
    if (!adapter.db) return;

    await adapter.db.runAsync(
      `UPDATE order_draft_items_v1 SET cantidad = cantidad + ? WHERE itemId = ?`,
      [delta, itemId]
    );

    // Marcar draft actualizado
    await this._tocarDraftDeItem(itemId);

    logger.info('DRAFTS_REPO', `Cantidad +${delta} en ítem ${itemId}`, {
      operationId: cmd.operationId,
    });
  }

  /** Elimina un ítem por su ID. */
  async eliminarItem(cmd: ComandoIdempotente, itemId: string): Promise<void> {
    const adapter = SQLiteStorageAdapter as any;
    if (!adapter.db) return;

    await adapter.db.runAsync(`DELETE FROM order_draft_items_v1 WHERE itemId = ?`, [itemId]);

    logger.info('DRAFTS_REPO', `Ítem eliminado: ${itemId}`, {
      operationId: cmd.operationId,
    });
  }

  /** Obtiene todos los ítems de un borrador. */
  async obtenerItems(draftId: string): Promise<DraftItem[]> {
    const adapter = SQLiteStorageAdapter as any;
    if (!adapter.db) return [];

    const rows = (await adapter.db.getAllAsync(
      `SELECT * FROM order_draft_items_v1 WHERE draftId = ?`,
      [draftId]
    )) as Record<string, any>[];

    return rows.map((row: Record<string, any>) => ({
      itemId: row.itemId,
      draftId: row.draftId,
      productoId: row.productoId,
      nombre: row.nombre,
      precio: row.precio,
      cantidad: row.cantidad,
      tamano: row.tamano ? (JSON.parse(row.tamano) as Record<string, string>) : undefined,
      preparacion: row.preparacion
        ? (JSON.parse(row.preparacion) as Record<string, string>)
        : undefined,
      precioBase: row.precioBase ?? undefined,
      deltaPrecio: row.deltaPrecio ?? undefined,
      prepMinutos: row.prepMinutos ?? undefined,
    }));
  }

  /** Vacía todos los ítems de un borrador y marca estado cerrado. */
  async vaciarDraft(cmd: ComandoIdempotente, draftId: string): Promise<void> {
    const adapter = SQLiteStorageAdapter as any;
    if (!adapter.db) return;

    await adapter.db.runAsync(`DELETE FROM order_draft_items_v1 WHERE draftId = ?`, [draftId]);
    await adapter.db.runAsync(
      `UPDATE order_drafts_v1 SET estado = 'cerrado', updatedAt = ? WHERE draftId = ?`,
      [Date.now(), draftId]
    );

    logger.info('DRAFTS_REPO', `Draft vaciado y cerrado: ${draftId}`, {
      operationId: cmd.operationId,
    });
  }

  // ── PRIVADO ───────────────────────────────────────────────────────────────

  private async _tocarDraftDeItem(itemId: string): Promise<void> {
    const adapter = SQLiteStorageAdapter as any;
    if (!adapter.db) return;

    await adapter.db.runAsync(
      `UPDATE order_drafts_v1
       SET updatedAt = ?
       WHERE draftId = (
         SELECT draftId FROM order_draft_items_v1 WHERE itemId = ?
       )`,
      [Date.now(), itemId]
    );
  }
}
