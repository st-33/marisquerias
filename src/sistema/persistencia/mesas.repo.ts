/**
 * 🪑 REPOSITORIO DE MESAS
 * Capa de abstracción para operaciones de mesas
 */

import type { Database } from 'firebase/database';
import { get, off, onValue, ref, runTransaction, update } from 'firebase/database';
import { z } from 'zod';
import { ensureNumberTimestamp } from '../../logica/dominio/normalizers';
import { logger } from '../monitoreo/logger';
import { assertValidTenantPath } from '../rtdb/guards';

export type EstadoMesa = 'libre' | 'ocupada' | 'reservada' | 'solicitar_cuenta';

export type Mesa = {
  id: string;
  numero?: number;
  estado: EstadoMesa;
  pedidoActivoId?: string | null;
  updatedAt: number;
  posX?: number;
  posY?: number;
  shape?: 'square' | 'round';
};

export type MesaLayoutInput = {
  id: string;
  posX: number;
  posY: number;
  shape?: 'square' | 'round';
};

export class MesasRepository {
  constructor(
    private db: Database,
    private tenantPath: string
  ) {
    assertValidTenantPath(tenantPath);
  }

  private getBasePath() {
    return `${this.tenantPath}/mesas`;
  }

  /**
   * Suscribirse a todas las mesas
   */
  suscribirTodas(callback: (mesas: Record<string, Mesa>) => void): () => void {
    const r = ref(this.db, this.getBasePath());
    const cb = onValue(r, (snap) => {
      callback((snap.val() as Record<string, Mesa>) || {});
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Suscribirse a una mesa específica
   */
  suscribirPorId(mesaId: string, callback: (mesa: Mesa | null) => void): () => void {
    const r = ref(this.db, `${this.getBasePath()}/${mesaId}`);
    const cb = onValue(r, (snap) => {
      callback((snap.val() as Mesa) || null);
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Obtener una mesa (una sola vez)
   */
  async obtenerPorId(mesaId: string): Promise<Mesa | null> {
    const snap = await get(ref(this.db, `${this.getBasePath()}/${mesaId}`));
    return (snap.val() as Mesa) || null;
  }

  /**
   * Obtener todas las mesas (una sola vez)
   */
  async obtenerTodas(): Promise<Record<string, Mesa>> {
    const snap = await get(ref(this.db, this.getBasePath()));
    return (snap.val() as Record<string, Mesa>) || {};
  }

  /**
   * Actualizar estado de una mesa
   */
  async actualizarEstado(mesaId: string, estado: EstadoMesa): Promise<void> {
    const now = ensureNumberTimestamp(Date.now());
    const rawPayload = { estado, updatedAt: now };
    const MesaWriteSchema = z.object({
      estado: z.string(),
      updatedAt: z.number(),
    });
    const payload = MesaWriteSchema.parse(rawPayload);
    logger.debug('MESAS_REPO', 'actualizarEstado payload', { mesaId, payload });
    await update(ref(this.db, `${this.getBasePath()}/${mesaId}`), payload);
  }

  /**
   * Asignar pedido a mesa
   */
  async asignarPedido(mesaId: string, pedidoId: string): Promise<void> {
    const now = ensureNumberTimestamp(Date.now());
    const rawPayload = { estado: 'ocupada', pedidoActivoId: pedidoId, updatedAt: now };
    const MesaWriteSchema = z.object({
      estado: z.string(),
      pedidoActivoId: z.union([z.string(), z.null()]),
      updatedAt: z.number(),
    });
    const payload = MesaWriteSchema.parse(rawPayload);
    logger.debug('MESAS_REPO', 'asignarPedido payload', { mesaId, pedidoId, payload });
    await update(ref(this.db, `${this.getBasePath()}/${mesaId}`), payload);
  }

  /**
   * Liberar mesa
   */
  async liberar(mesaId: string): Promise<void> {
    const now = ensureNumberTimestamp(Date.now());
    const rawPayload = { estado: 'libre', pedidoActivoId: null, updatedAt: now };
    const MesaWriteSchema = z.object({
      estado: z.string(),
      pedidoActivoId: z.union([z.string(), z.null()]),
      updatedAt: z.number(),
    });
    const payload = MesaWriteSchema.parse(rawPayload);
    logger.debug('MESAS_REPO', 'liberar payload', { mesaId, payload });
    await update(ref(this.db, `${this.getBasePath()}/${mesaId}`), payload);
  }

  /**
   * Eliminar mesa
   */
  async eliminar(mesaId: string): Promise<void> {
    logger.debug('MESAS_REPO', 'eliminar payload', { mesaId });
    await update(ref(this.db, this.getBasePath()), { [mesaId]: null });
  }

  /**
   * Solicitar cuenta
   */
  async solicitarCuenta(mesaId: string): Promise<void> {
    const now = ensureNumberTimestamp(Date.now());
    const rawPayload = { estado: 'solicitar_cuenta', updatedAt: now };
    const MesaWriteSchema = z.object({
      estado: z.string(),
      updatedAt: z.number(),
    });
    const payload = MesaWriteSchema.parse(rawPayload);
    logger.debug('MESAS_REPO', 'solicitarCuenta payload', { mesaId, payload });
    await update(ref(this.db, `${this.getBasePath()}/${mesaId}`), payload);
  }

  /**
   * Obtener los items del borrador (mesa pendiente) de una mesa específica
   */
  async obtenerItemsBorrador(mesaId: string): Promise<any[]> {
    const snap = await get(ref(this.db, `${this.tenantPath}/mesas_pendientes/${mesaId}/items`));
    return (snap.val() as any[]) || [];
  }

  /**
   * Intenta bloquear una mesa para el procesamiento de pedido de forma atómica
   */
  async intentarBloquearMesaPedido(
    mesaId: string,
    sessionId: string,
    timeoutMs: number
  ): Promise<{ committed: boolean; snapshotVal: any }> {
    const mesaRef = ref(this.db, `${this.getBasePath()}/${mesaId}`);
    const transactionResult = await runTransaction(mesaRef, (currentData: unknown) => {
      if (!currentData || typeof currentData !== 'object') {
        return;
      }
      const current = currentData as any;
      const now = Date.now();
      const lock = current._sendOrderLock;

      if (lock && lock.owner && lock.owner !== sessionId) {
        const age = now - (lock.timestamp ?? 0);
        if (age < timeoutMs) return; // Keep current (abort)
      }

      return {
        ...current,
        _sendOrderLock: { owner: sessionId, timestamp: now },
      };
    });

    return {
      committed: transactionResult.committed,
      snapshotVal: transactionResult.snapshot.val(),
    };
  }

  /**
   * Libera el bloqueo de procesamiento de pedido de una mesa
   */
  async liberarBloqueoMesaPedido(mesaId: string): Promise<void> {
    const mesaRef = ref(this.db, `${this.getBasePath()}/${mesaId}`);
    await update(mesaRef, { _sendOrderLock: null });
  }

  async guardarLayout(layout: MesaLayoutInput[]): Promise<void> {
    if (layout.length === 0) return;

    const payload: Record<string, number | string> = {};
    const baseRef = ref(this.db, this.getBasePath());

    layout.forEach(({ id, posX, posY, shape }) => {
      const clampedX = Math.min(1, Math.max(0, Number.isFinite(posX) ? posX : 0.5));
      const clampedY = Math.min(1, Math.max(0, Number.isFinite(posY) ? posY : 0.5));
      payload[`${id}/posX`] = clampedX;
      payload[`${id}/posY`] = clampedY;
      payload[`${id}/updatedAt`] = ensureNumberTimestamp(Date.now());
      if (shape) {
        payload[`${id}/shape`] = shape;
      }
    });

    await update(baseRef, payload);
  }
}
