/**
 * ⚙️ REPOSITORIO DE AJUSTES DE REPARTO
 * Capa de abstracción para operaciones de ajustes de reparto (umbrales, horarios, costos)
 * NUNCA llamar a Firebase directamente desde componentes o hooks de negocio
 */

import { ref, onValue, off, set, update, Unsubscribe } from 'firebase/database';
import type { Database } from 'firebase/database';
import { assertValidRutaNegocio, sanitizeRtdbPayload } from '../rtdb/guards';

export type AjustesReparto = {
  umbrales: {
    stockBajo: number;
    maxPedidosActivos: number;
    tiempoMaxEntregaMin: number;
  };
  horarios: {
    habilitado: boolean;
    ventanas: { inicio: string; fin: string }[];
  };
  costos: {
    base: number;
    porKm: number;
    minimo: number;
  };
};

export class RepartoAjustesRepository {
  constructor(
    private db: Database,
    private rutaNegocio: string
  ) {
    assertValidRutaNegocio(rutaNegocio);
  }

  private getBasePath() {
    return `${this.rutaNegocio}/ajustes/reparto`;
  }

  /**
   * Suscribirse a umbrales
   */
  suscribirUmbrales(callback: (umbrales: AjustesReparto['umbrales']) => void): () => void {
    const r = ref(this.db, `${this.getBasePath()}/umbrales`);
    const cb = onValue(r, (snap) => {
      const v = (snap.val() as any) || {};
      callback({
        stockBajo: Number(v.stockBajo ?? 5),
        maxPedidosActivos: Number(v.maxPedidosActivos ?? 10),
        tiempoMaxEntregaMin: Number(v.tiempoMaxEntregaMin ?? 45),
      });
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Actualizar umbrales (actualización parcial)
   */
  async actualizarUmbrales(umbrales: Partial<AjustesReparto['umbrales']>): Promise<void> {
    const r = ref(this.db, `${this.getBasePath()}/umbrales`);
    await update(r, sanitizeRtdbPayload(umbrales));
  }

  /**
   * Suscribirse a horarios
   */
  suscribirHorarios(callback: (horarios: AjustesReparto['horarios']) => void): () => void {
    const r = ref(this.db, `${this.getBasePath()}/horarios`);
    const cb = onValue(r, (snap) => {
      const v = (snap.val() as any) || {};
      const ventanas = Array.isArray(v.ventanas) ? v.ventanas : [{ inicio: '09:00', fin: '18:00' }];
      callback({
        habilitado: !!v.habilitado,
        ventanas,
      });
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Actualizar horarios (actualización parcial o completa)
   */
  async actualizarHorarios(horarios: Partial<AjustesReparto['horarios']>): Promise<void> {
    const r = ref(this.db, `${this.getBasePath()}/horarios`);
    // Si viene ventanas completas, sobreescribir con set; para parches simples usar update
    if (horarios.ventanas) {
      await set(r, sanitizeRtdbPayload(horarios as AjustesReparto['horarios']));
    } else {
      await update(r, sanitizeRtdbPayload(horarios));
    }
  }

  /**
   * Toggle habilitado de horarios
   */
  async toggleHorarios(habilitado: boolean): Promise<void> {
    const r = ref(this.db, `${this.getBasePath()}/horarios`);
    await update(r, { habilitado });
  }
}
