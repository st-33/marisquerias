import { push, ref, set, type Database } from 'firebase/database';

import { RegistroVentasRepository } from './registroVentas.repo';
import { assertValidTenantPath, sanitizeRtdbPayload } from '../rtdb/guards';

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
  private tenantPath: string;

  constructor(db: Database, tenantPath: string) {
    assertValidTenantPath(tenantPath);
    this.db = db;
    this.tenantPath = tenantPath;
  }

  /**
   * Registra una venta en el nodo 'ventas' del tenant.
   * NO afecta inventarios, solo registra la transacción financiera/histórica.
   */
  async registrarVenta(venta: VentaSimple): Promise<string> {
    let ventaId = venta.id;
    let targetRef;

    if (ventaId) {
      targetRef = ref(this.db, `${this.tenantPath}/ventas/${ventaId}`);
    } else {
      const ventasRef = ref(this.db, `${this.tenantPath}/ventas`);
      const newVentaRef = push(ventasRef);
      ventaId = newVentaRef.key!;
      targetRef = newVentaRef;
    }

    const payload = sanitizeRtdbPayload({
      ...venta,
      id: ventaId,
    });

    await set(targetRef, payload);

    try {
      await new RegistroVentasRepository(this.db, this.tenantPath).registrarMostrador({
        id: ventaId,
        total: venta.total,
        metodoPago: venta.metodoPago,
        items: venta.items,
        timestamp: venta.timestamp,
        usuario: venta.usuario,
      });
    } catch (error) {
      // La venta legacy ya quedó registrada; la proyección puede reintentarse sin duplicar.
      console.warn('[SimpleSalesRepo] Proyección de historial pendiente:', error);
    }

    return ventaId;
  }
}
