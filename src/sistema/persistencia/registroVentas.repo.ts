import type { Database } from 'firebase/database';
import { get, off, onValue, ref, runTransaction } from 'firebase/database';
import { assertValidTenantPath, sanitizeRtdbPayload } from '../rtdb/guards';
import type { Pedido } from './pedidos.repo';

export type OrigenRegistroVenta = 'pedido' | 'mostrador';
export type CanalRegistroVenta = 'restaurante' | 'mostrador';
export type EstadoRegistroVenta = 'pagada' | 'cancelada_perdida' | 'cancelada_sin_perdida';

export type ResumenItemVenta = {
  productoId?: string;
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
};

export type RegistroVenta = {
  origen: OrigenRegistroVenta;
  origenId: string;
  numero: number;
  canal: CanalRegistroVenta;
  mesaId?: string;
  total: number;
  estado: EstadoRegistroVenta;
  timestamp: number;
  metodoPago?: string;
  pedidoId?: string;
  ventaId?: string;
  usuario?: string;
  resumenItems?: ResumenItemVenta[];
};

export type EntradaRegistroVenta = Omit<RegistroVenta, 'numero'>;

type FechaRegistro = {
  anio: string;
  mes: string;
  dia: string;
  ymd: string;
};

function resolverFecha(timestamp: number): FechaRegistro {
  const fecha = new Date(timestamp);
  const anio = String(fecha.getFullYear());
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return { anio, mes, dia, ymd: `${anio}${mes}${dia}` };
}

function totalPedido(pedido: Pedido): number {
  const totalCongelado = Number(pedido.totales?.total);
  if (Number.isFinite(totalCongelado) && totalCongelado >= 0) return totalCongelado;

  return Object.values(pedido.items || {}).reduce((total, item) => {
    const cantidad = Math.max(0, Number(item.cantidad || 0));
    const precio = Math.max(0, Number(item.precio || 0));
    return total + cantidad * precio;
  }, 0);
}

function resumirItems(pedido: Pedido): ResumenItemVenta[] {
  return Object.values(pedido.items || {}).map((item) => ({
    productoId: item.productId || undefined,
    nombre: item.nombre,
    cantidad: Math.max(0, Number(item.cantidad || 0)),
    precio: Math.max(0, Number(item.precio || 0)),
    subtotal: Math.max(0, Number(item.cantidad || 0) * Number(item.precio || 0)),
  }));
}

export class RegistroVentasRepository {
  constructor(
    private readonly db: Database,
    private readonly tenantPath: string
  ) {
    assertValidTenantPath(tenantPath);
  }

  private getBasePath(): string {
    return `${this.tenantPath}/registro/ventas`;
  }

  private getSequencePath(ymd: string): string {
    return `${this.tenantPath}/secuencias/ventas/${ymd}`;
  }

  private getRecordPath(fecha: FechaRegistro, origenId: string): string {
    return `${this.getBasePath()}/${fecha.anio}/${fecha.mes}/${fecha.dia}/${origenId}`;
  }

  async registrar(entrada: EntradaRegistroVenta): Promise<RegistroVenta> {
    const fecha = resolverFecha(entrada.timestamp);
    const registroRef = ref(this.db, this.getRecordPath(fecha, entrada.origenId));
    const existente = await get(registroRef);

    if (existente.exists()) {
      return existente.val() as RegistroVenta;
    }

    const secuenciaRef = ref(this.db, this.getSequencePath(fecha.ymd));
    const resultadoSecuencia = await runTransaction(secuenciaRef, (actual) => {
      const numero = typeof actual === 'number' && Number.isFinite(actual) ? actual : 0;
      return numero + 1;
    });
    const numero = Number(resultadoSecuencia.snapshot.val());

    const payload = sanitizeRtdbPayload({
      ...entrada,
      numero,
    }) as RegistroVenta;

    const resultadoRegistro = await runTransaction(registroRef, (actual) => actual ?? payload);
    return (resultadoRegistro.snapshot.val() as RegistroVenta) || payload;
  }

  async registrarPedido(
    pedido: Pedido,
    timestamp = pedido.pagadoAt || Date.now()
  ): Promise<RegistroVenta> {
    return this.registrar({
      origen: 'pedido',
      origenId: pedido.id,
      pedidoId: pedido.id,
      canal: 'restaurante',
      mesaId: pedido.mesaId,
      total: totalPedido(pedido),
      estado: 'pagada',
      timestamp,
      resumenItems: resumirItems(pedido),
    });
  }

  async registrarMostrador(venta: {
    id: string;
    total: number;
    metodoPago: string;
    items: ResumenItemVenta[];
    timestamp: number;
    usuario?: string;
  }): Promise<RegistroVenta> {
    return this.registrar({
      origen: 'mostrador',
      origenId: venta.id,
      ventaId: venta.id,
      canal: 'mostrador',
      total: Math.max(0, Number(venta.total || 0)),
      estado: 'pagada',
      timestamp: venta.timestamp,
      metodoPago: venta.metodoPago,
      usuario: venta.usuario,
      resumenItems: venta.items,
    });
  }

  async obtenerDia(timestamp: number): Promise<Record<string, RegistroVenta>> {
    const fecha = resolverFecha(timestamp);
    const snapshot = await get(
      ref(this.db, `${this.getBasePath()}/${fecha.anio}/${fecha.mes}/${fecha.dia}`)
    );
    return (snapshot.val() as Record<string, RegistroVenta> | null) || {};
  }

  suscribirDia(
    timestamp: number,
    callback: (registros: Record<string, RegistroVenta>) => void
  ): () => void {
    const fecha = resolverFecha(timestamp);
    const diaRef = ref(this.db, `${this.getBasePath()}/${fecha.anio}/${fecha.mes}/${fecha.dia}`);
    const cb = onValue(diaRef, (snapshot) => {
      callback((snapshot.val() as Record<string, RegistroVenta> | null) || {});
    });
    return () => off(diaRef, 'value', cb as any);
  }
}
