import { push, ref, set, type Database } from 'firebase/database';

import { assertValidTenantPath, sanitizeRtdbPayload } from '../../core/rtdb/guards';

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
    return ventaId;
  }
}
