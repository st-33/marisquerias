import { ref, push, set } from 'firebase/database';
import type { Database } from 'firebase/database';
import { assertValidRutaNegocio } from '../rtdb/guards';
import { descomponer_ruta_negocio, resolver_ruta_cajon } from '../rtdb/rutas/ruta_negocio';
import { SQLiteStorageAdapter, type HistorialVenta } from '../sin_conexion';
import type { Pedido } from './pedidos.repositorio';

function stripUndefinedDeep<T>(input: T): T {
  if (input === undefined) return null as any;
  if (input === null) return input;
  if (Array.isArray(input)) {
    return input.map((v) => stripUndefinedDeep(v)) as any;
  }
  if (typeof input === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(input as any)) {
      if (v === undefined) continue;
      out[k] = stripUndefinedDeep(v);
    }
    return out;
  }
  return input;
}

export interface VentaMostrador {
  id?: string;
  total: number;
  metodoPago: string;
  items: any[];
  timestamp: number;
  usuario?: string;
  origen: 'venta_crudo';
}

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

export class RepositorioRegistroVentas {
  private readonly negocioId: string;

  constructor(
    private readonly db: Database,
    private readonly rutaNegocio: string
  ) {
    assertValidRutaNegocio(rutaNegocio, { permitirRaiz: true });
    const identidad = descomponer_ruta_negocio(rutaNegocio);
    this.negocioId = identidad?.negocio_id || (rutaNegocio ? rutaNegocio : 'unidad_operativa');
  }

  async registrar(entrada: EntradaRegistroVenta): Promise<RegistroVenta> {
    const fecha = resolverFecha(entrada.timestamp);

    // Verificar si ya existe en SQLite (idempotencia)
    const existentes = await SQLiteStorageAdapter.obtenerHistorialVentas(this.negocioId, {
      fecha: fecha.ymd,
    });
    const existente = existentes.find((r) => r.id === entrada.origenId);
    if (existente) {
      try {
        return JSON.parse(existente.datos_json) as RegistroVenta;
      } catch {
        // Fallback
      }
    }

    const numero = existentes.length + 1;
    const registro: RegistroVenta = {
      ...entrada,
      numero,
    };

    let sincronizado = 0;
    try {
      if (this.db && typeof (this.db as any).app !== 'undefined') {
        const rutaVenta = `${resolver_ruta_cajon(this.rutaNegocio, 'ventas')}/${entrada.origenId}`;
        const sanitizado = stripUndefinedDeep(registro);
        await set(ref(this.db, rutaVenta), sanitizado);
        sincronizado = 1;
      }
    } catch {
      sincronizado = 0;
    }

    const historial: HistorialVenta = {
      id: entrada.origenId,
      negocio_id: this.negocioId,
      tipo: entrada.origen === 'pedido' ? 'pedido_cerrado' : 'registro_ventas',
      fecha: fecha.ymd,
      timestamp: entrada.timestamp,
      total: entrada.total,
      metodo_pago: entrada.metodoPago || null,
      datos_json: JSON.stringify(registro),
      sincronizado,
    };

    await SQLiteStorageAdapter.guardarHistorialVenta(historial);
    return registro;
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

  async registrarVenta(venta: VentaMostrador): Promise<string> {
    const rutaSecuencias =
      this.rutaNegocio === '/' || !this.rutaNegocio
        ? 'secuencias/ventas'
        : `${this.rutaNegocio.replace(/\/+$/, '')}/secuencias/ventas`;

    let pushKey: string | null = null;
    try {
      if (this.db && typeof (this.db as any).app !== 'undefined') {
        pushKey = push(ref(this.db, rutaSecuencias)).key;
      }
    } catch {
      pushKey = null;
    }

    const ventaId =
      venta.id ||
      pushKey ||
      'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    await this.registrarMostrador({
      id: ventaId,
      total: venta.total,
      metodoPago: venta.metodoPago,
      items: venta.items,
      timestamp: venta.timestamp,
      usuario: venta.usuario,
    });

    return ventaId;
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
    const historial = await SQLiteStorageAdapter.obtenerHistorialVentas(this.negocioId, {
      fecha: fecha.ymd,
    });

    const resultado: Record<string, RegistroVenta> = {};
    for (const item of historial) {
      try {
        const parsed = JSON.parse(item.datos_json) as RegistroVenta;
        resultado[item.id] = parsed;
      } catch {
        resultado[item.id] = {
          origen: item.tipo === 'pedido_cerrado' ? 'pedido' : 'mostrador',
          origenId: item.id,
          numero: 1,
          canal: item.tipo === 'pedido_cerrado' ? 'restaurante' : 'mostrador',
          total: item.total,
          estado: 'pagada',
          timestamp: item.timestamp,
          metodoPago: item.metodo_pago || undefined,
        };
      }
    }
    return resultado;
  }

  suscribirDia(
    timestamp: number,
    callback: (registros: Record<string, RegistroVenta>) => void
  ): () => void {
    let activo = true;
    void this.obtenerDia(timestamp).then((registros) => {
      if (activo) callback(registros);
    });
    return () => {
      activo = false;
    };
  }
}
export { RepositorioRegistroVentas as RegistroVentasRepository };
