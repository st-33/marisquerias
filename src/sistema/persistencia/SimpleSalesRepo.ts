import { ref, push, type Database } from 'firebase/database';

import { RegistroVentasRepository } from './registroVentas.repo';
import { assertValidRutaNegocio } from '../rtdb/guards';

export interface VentaSimple {
  id?: string;
  total: number;
  metodoPago: string;
  items: any[];
  timestamp: number;
  usuario?: string;
  origen: 'venta_crudo';
}

export class SimpleSalesRepo {
  private db: Database;
  private rutaNegocio: string;

  constructor(db: Database, rutaNegocio: string) {
    assertValidRutaNegocio(rutaNegocio);
    this.db = db;
    this.rutaNegocio = rutaNegocio;
  }

  /**
   * Registra una venta en el registro formal de ventas.
   * Desacoplado de RTDB /ventas: no realiza escrituras directas al nodo suelto legacy.
   */
  async registrarVenta(venta: VentaSimple): Promise<string> {
    const ventaId =
      venta.id ||
      push(ref(this.db, `${this.rutaNegocio}/secuencias/ventas`)).key ||
      `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    await new RegistroVentasRepository(this.db, this.rutaNegocio).registrarMostrador({
      id: ventaId,
      total: venta.total,
      metodoPago: venta.metodoPago,
      items: venta.items,
      timestamp: venta.timestamp,
      usuario: venta.usuario,
    });

    return ventaId;
  }
}
