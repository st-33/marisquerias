import type { Database } from 'firebase/database';
import { assertValidRutaNegocio } from '../rtdb/guards';
import { descomponer_ruta_negocio } from '../rtdb/rutas/ruta_negocio';
import { SQLiteStorageAdapter, type HistorialVenta } from '../offline';
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
  private readonly negocioId: string;

  constructor(
    private readonly db: Database,
    private readonly rutaNegocio: string
  ) {
    assertValidRutaNegocio(rutaNegocio);
    const identidad = descomponer_ruta_negocio(rutaNegocio);
    this.negocioId = identidad?.negocio_id || rutaNegocio;
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

    const historial: HistorialVenta = {
      id: entrada.origenId,
      negocio_id: this.negocioId,
      tipo: entrada.origen === 'pedido' ? 'pedido_cerrado' : 'registro_ventas',
      fecha: fecha.ymd,
      timestamp: entrada.timestamp,
      total: entrada.total,
      metodo_pago: entrada.metodoPago || null,
      datos_json: JSON.stringify(registro),
      sincronizado: 1,
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
