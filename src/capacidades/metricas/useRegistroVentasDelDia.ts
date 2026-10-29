import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Database } from 'firebase/database';
import {
  RegistroVentasRepository,
  type RegistroVenta,
} from '../../sistema/persistencia/registroVentas.repositorio';
import { PedidosRepository } from '../../sistema/persistencia/pedidos.repositorio';
import { usePedidos, useStore, useVentas } from '../../sistema/store';
import { getRtdb } from '../../sistema/firebase';
import { ensureNumberTimestamp, normalizePedido } from '../../logica/dominio/normalizadores';

export function useRegistroVentasDelDia({
  db: dbProp,
  rutaNegocio: rutaProp,
  timestamp,
}: {
  db?: Database;
  rutaNegocio?: string;
  timestamp: number;
}) {
  const rutaNegocioStore = useStore((s) => s.sesion.rutaNegocio) || '';
  const ds = useStore((s) => s.dataSources);
  const rutaNegocio = rutaProp || rutaNegocioStore;
  const db = useMemo(
    () => dbProp || getRtdb(ds?.operacionUrl || undefined),
    [dbProp, ds?.operacionUrl]
  );
  const [registrosSQLite, setRegistrosSQLite] = useState<Record<string, RegistroVenta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  // DOGMA V2: Reactividad total vía Store (pedidos y ventas en memoria sincronizados con RTDB)
  const pedidosData = usePedidos();
  const ventasData = useVentas();

  useEffect(() => {
    let cancelled = false;

    const cargarSQLite = async () => {
      if (!rutaNegocio) {
        if (!cancelled) {
          setRegistrosSQLite({});
          setLoading(false);
        }
        return;
      }

      setError(null);

      try {
        const datos = await new RegistroVentasRepository(db, rutaNegocio).obtenerDia(timestamp);
        if (!cancelled) {
          setRegistrosSQLite(datos || {});
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
          setRegistrosSQLite({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void cargarSQLite();
    return () => {
      cancelled = true;
    };
  }, [db, rutaNegocio, timestamp, recarga]);

  const recargar = useCallback(() => {
    setLoading(true);
    setRecarga((actual) => actual + 1);
  }, []);

  // Fusionar registros locales de SQLite con los pedidos y ventas en tiempo real del Store
  const fechaObj = new Date(timestamp);
  const minTs = new Date(
    fechaObj.getFullYear(),
    fechaObj.getMonth(),
    fechaObj.getDate(),
    0,
    0,
    0
  ).getTime();
  const maxTs = new Date(
    fechaObj.getFullYear(),
    fechaObj.getMonth(),
    fechaObj.getDate(),
    23,
    59,
    59,
    999
  ).getTime();

  const mapaUnificado: Record<string, RegistroVenta> = { ...registrosSQLite };

  // 1. Integrar pedidos cerrados/pagados del Store si no existen en SQLite
  if (pedidosData) {
    const pedidos = Object.values(pedidosData).map(normalizePedido).filter(Boolean);

    pedidos.forEach((p: any) => {
      if (p.estatus === 'cancelado') return;
      if (!(p.estatus === 'cerrado' || p.cerrado || p.estatus === 'pagado')) return;

      const ts = ensureNumberTimestamp(p.pagadoAt || p.createdAt);
      if (ts < minTs || ts > maxTs) return;

      const id = p.id || `pedido_${ts}`;
      if (!mapaUnificado[id]) {
        const items = Object.values(p.items || {});
        const pedidoTotal = items.reduce((sum: number, item: any) => {
          const cantidad = Math.max(0, Number(item.cantidad ?? item.qty ?? 0));
          const rawPrecio = Number(item.precio ?? item.price ?? 0);
          const precioHistorico = Math.max(0, Number.isNaN(rawPrecio) ? 0 : rawPrecio);
          return sum + cantidad * precioHistorico;
        }, 0);

        mapaUnificado[id] = {
          origen: 'pedido',
          origenId: id,
          numero: 0,
          canal: 'restaurante',
          mesaId: p.mesaId,
          total: pedidoTotal,
          estado: 'pagada',
          timestamp: ts,
          metodoPago: p.metodoPago,
          pedidoId: id,
          usuario: p.vendedor || p.mesero || p.creadoPor,
          resumenItems: items.map((item: any) => ({
            productoId: item.productId || item.id,
            nombre: item.nombre || item.name || 'Producto',
            cantidad: Math.max(0, Number(item.cantidad ?? item.qty ?? 0)),
            precio: Math.max(0, Number(item.precio ?? item.price ?? 0)),
            subtotal: Math.max(0, Number(item.cantidad ?? 0) * Number(item.precio ?? 0)),
          })),
        };
      }
    });
  }

  // 2. Integrar ventas de mostrador del Store si no existen en SQLite
  if (ventasData) {
    Object.values(ventasData).forEach((v: any) => {
      if (v.estatus === 'cancelado') return;

      const ts = ensureNumberTimestamp(v.timestamp);
      if (ts < minTs || ts > maxTs) return;

      const id = v.id || `venta_${ts}`;
      if (!mapaUnificado[id]) {
        const totalVenta = Number(v.total || v.total_general || 0);
        mapaUnificado[id] = {
          origen: 'mostrador',
          origenId: id,
          numero: 0,
          canal: 'mostrador',
          total: totalVenta,
          estado: 'pagada',
          timestamp: ts,
          metodoPago: v.metodoPago || v.metodo_pago,
          ventaId: id,
          usuario: v.usuario,
        };
      }
    });
  }

  // 3. Ordenar cronológicamente y asignar numeración correlativa
  const registros = Object.values(mapaUnificado)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((reg, index) => ({
      ...reg,
      numero: reg.numero > 0 ? reg.numero : index + 1,
    }));

  // 4. Función explícita de cierre y purga de jornada operativa
  const purgarJornadaOperativa = useCallback(async () => {
    try {
      setLoading(true);
      const pedidosRepo = new PedidosRepository(db, rutaNegocio);
      const resultado = await pedidosRepo.purgarJornadaOperativa();
      recargar();
      return { success: true, ...resultado };
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [db, rutaNegocio, recargar]);

  return {
    registros,
    loading,
    error,
    recargar,
    purgarJornadaOperativa,
    cerrarJornadaOperativa: purgarJornadaOperativa,
  };
}
