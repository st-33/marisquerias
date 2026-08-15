import { useEffect, useRef, useState } from 'react';
import {
  ensureNumberTimestamp,
  normalizeMesa,
  normalizePedido,
} from '../../../../core/domain/normalizers';
import { logger } from '../../../../core/monitoring/logger';
import {
  useInventoryCatalog,
  useMesas,
  useMissingAssignments,
  usePedidos,
  useStore,
  useVentas,
} from '../../../../core/store';
import { acumularVendedorSeguro, type ResumenVendedor } from './metricasVendedores';

type DateFilter = 'hoy' | 'ayer' | 'hace3dias' | 'semana' | 'mes' | 'todo';

export type FinancialHour = {
  label: string;
  total: number;
  ventaTotal: number;
  costo: number;
  ganancia: number;
  ordenes: number;
};

/**
 * Métricas financieras del Dashboard.
 *
 * El hook consume exclusivamente los snapshots del store central ya inicializado
 * para el tenant actual. Cuando cambia tenantPath o el store queda vacío durante
 * el cleanup de listeners, elimina cualquier acumulador anterior y espera al
 * siguiente timestamp de actualización antes de calcular.
 */
export function useAdminMetrics({
  dateFilter,
  includeVentaCrudo,
  tenantPath,
}: {
  dateFilter: DateFilter;
  includeVentaCrudo?: boolean;
  tenantPath: string;
}) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const previousTenantRef = useRef<string | null>(null);

  const pedidosData = usePedidos();
  const mesasData = useMesas();
  const inventarioData = useInventoryCatalog();
  const ventasData = useVentas();
  const missingAssignments = useMissingAssignments();
  const ultimaActualizacion = useStore((s) => s.ultimaActualizacion);

  useEffect(() => {
    const normalizedTenant = tenantPath.trim();

    if (!normalizedTenant) {
      previousTenantRef.current = null;
      setMetrics(null);
      setLoading(false);
      return;
    }

    const tenantChanged = previousTenantRef.current !== normalizedTenant;
    if (tenantChanged) {
      previousTenantRef.current = normalizedTenant;
      setMetrics(null);
      setLoading(true);
    }

    // useAppListeners limpia ambos slices y deja esta marca en null antes de
    // conectar el siguiente tenant. No calculamos mientras ese ciclo ocurre.
    if (ultimaActualizacion === null) {
      setMetrics(null);
      setLoading(true);
      return;
    }

    const calculateMetrics = () => {
      try {
        const pedidos = Object.values(pedidosData || {})
          .map(normalizePedido)
          .filter(Boolean);
        const mesas = Object.values(mesasData || {})
          .map(normalizeMesa)
          .filter(Boolean);

        const now = Date.now();
        const startOfHoy = new Date().setHours(0, 0, 0, 0);
        const getRange = (): [number, number] => {
          switch (dateFilter) {
            case 'hoy':
              return [startOfHoy, now];
            case 'ayer':
              return [startOfHoy - 86400000, startOfHoy];
            case 'hace3dias':
              return [startOfHoy - 3 * 86400000, now];
            case 'semana':
              return [now - 7 * 86400000, now];
            case 'mes':
              return [now - 30 * 86400000, now];
            default:
              return [0, now];
          }
        };
        const [minTs, maxTs] = getRange();

        let totalVentas = 0;
        let totalCosto = 0;
        let totalOrdenes = 0;
        const mesasOcupadas = mesas.filter((m: any) => m.estado === 'ocupada').length;
        const vendedoresMap = new Map<string, ResumenVendedor>();
        const horaPedidosCountMap: Record<string, number> = {};
        const horaFinancieraMap: Record<string, { venta: number; costo: number; ordenes: number }> = {};
        const ventasPorCategoriaMap: Record<string, number> = {};
        const productosMap: Record<string, { nombre: string; ventas: number; monto: number }> = {};
        const inventoryCostById = new Map(
          Object.entries(inventarioData || {}).map(([id, item]: [string, any]) => [
            id,
            Math.max(0, Number(item?.costo || 0)),
          ])
        );

        const getItemFinancials = (item: any) => {
          const cantidad = Math.max(0, Number(item?.cantidad ?? item?.qty ?? 0));
          const precio = Math.max(0, Number(item?.precio ?? item?.price ?? 0) || 0);
          const productId = item?.productId || item?.id || item?.nombre || item?.name || 'desconocido';
          const costoUnitario = Math.max(
            0,
            Number(
              item?.costo ??
                item?.costoUnitario ??
                item?.cost ??
                inventoryCostById.get(productId) ??
                0
            ) || 0
          );
          return {
            cantidad,
            itemTotal: precio * cantidad,
            itemCosto: costoUnitario * cantidad,
            productId,
            categoria: item?.categoria || item?.category || 'Sin Categoría',
            nombre: item?.nombre || item?.name || 'Desconocido',
          };
        };

        const addHour = (ts: number, venta: number, costo: number) => {
          const horaLabel = `${new Date(ts).getHours()}:00`;
          const current = horaFinancieraMap[horaLabel] || { venta: 0, costo: 0, ordenes: 0 };
          horaFinancieraMap[horaLabel] = {
            venta: current.venta + venta,
            costo: current.costo + costo,
            ordenes: current.ordenes + 1,
          };
          horaPedidosCountMap[horaLabel] = (horaPedidosCountMap[horaLabel] || 0) + 1;
        };

        pedidos.forEach((p: any) => {
          const ts = ensureNumberTimestamp(p.pagadoAt || p.createdAt);
          if (
            ts < minTs ||
            ts > maxTs ||
            !(p.estatus === 'cerrado' || p.cerrado || p.estatus === 'pagado') ||
            p.estatus === 'cancelado'
          ) {
            return;
          }

          const items = Object.values(p.items || {});
          let pedidoTotal = 0;
          let pedidoCosto = 0;
          items.forEach((item: any) => {
            const financials = getItemFinancials(item);
            pedidoTotal += financials.itemTotal;
            pedidoCosto += financials.itemCosto;
            ventasPorCategoriaMap[financials.categoria] =
              (ventasPorCategoriaMap[financials.categoria] || 0) + financials.itemTotal;
            if (!productosMap[financials.productId]) {
              productosMap[financials.productId] = { nombre: financials.nombre, ventas: 0, monto: 0 };
            }
            productosMap[financials.productId].ventas += financials.cantidad;
            productosMap[financials.productId].monto += financials.itemTotal;
          });

          totalVentas += pedidoTotal;
          totalCosto += pedidoCosto;
          totalOrdenes++;
          addHour(ts, pedidoTotal, pedidoCosto);
          acumularVendedorSeguro(
            vendedoresMap,
            p.vendedor || p.mesero || p.creadoPor,
            pedidoTotal
          );
        });

        if (includeVentaCrudo && ventasData) {
          Object.values(ventasData).forEach((v: any) => {
            if (v.estatus === 'cancelado') return;
            const ts = ensureNumberTimestamp(v.timestamp);
            if (ts < minTs || ts > maxTs) return;
            const totalVenta = Math.max(0, Number(v.total || v.total_general || 0));
            const costoVenta = Math.max(0, Number(v.costoTotal || v.costo || 0));
            totalVentas += totalVenta;
            totalCosto += costoVenta;
            totalOrdenes++;
            addHour(ts, totalVenta, costoVenta);
          });
        }

        const bucketCount = dateFilter === 'hoy' ? 24 : 12;
        const bucketSize = dateFilter === 'hoy' ? 1 : 2;
        const ventasPorHora: FinancialHour[] = Array.from({ length: bucketCount }, (_, index) => {
          const hour = index * bucketSize;
          const label = `${hour}h`;
          const bucket = horaFinancieraMap[`${hour}:00`] || { venta: 0, costo: 0, ordenes: 0 };
          return {
            label,
            total: bucket.venta,
            ventaTotal: bucket.venta,
            costo: bucket.costo,
            ganancia: bucket.venta - bucket.costo,
            ordenes: bucket.ordenes,
          };
        });

        const ventasPorCategoria = Object.entries(ventasPorCategoriaMap)
          .map(([categoria, total]) => ({ categoria, total }))
          .sort((a, b) => b.total - a.total);
        const productosEstrella = Object.entries(productosMap)
          .map(([id, data]) => ({ id, nombre: data.nombre, ventas: data.ventas, monto: data.monto }))
          .sort((a, b) => b.ventas - a.ventas)
          .slice(0, 5);
        const topVendedor = Array.from(vendedoresMap.values()).sort((a, b) => b.monto - a.monto)[0] || {
          nombre: 'Sin ventas',
          monto: 0,
          subpedidos: 0,
        };
        const topHoraEntry = Object.entries(horaPedidosCountMap).sort((a, b) => b[1] - a[1])[0];
        const horaPico = topHoraEntry
          ? { hora: topHoraEntry[0], pedidos: topHoraEntry[1] }
          : { hora: 'N/A', pedidos: 0 };
        const bajoStock = Object.values(inventarioData || {}).filter((item: any) =>
          (item.cantidad || 0) <= (item.umbralBajo || item.minStock || 10)
        ).length;
        const ticketPromedio = totalOrdenes > 0 ? totalVentas / totalOrdenes : 0;

        setMetrics({
          ventasHoy: totalVentas,
          ventasSemana: totalVentas,
          ventasMes: totalVentas,
          ordenesActivas: totalOrdenes,
          mesasOcupadas,
          mesasTotal: mesas.length,
          itemsBajoStock: bajoStock,
          missingAreaCount: Object.keys(missingAssignments || {}).length,
          ventasFiltradas: totalVentas,
          ordenesFiltradas: totalOrdenes,
          ticketPromedio,
          costoTotal: totalCosto,
          gananciaNeta: totalVentas - totalCosto,
          vendedorHero: { ventasHero: totalVentas, subpedidosCountHero: totalOrdenes },
          vendedorEstrella: topVendedor,
          platilloMasVendido: {
            nombre: productosEstrella[0]?.nombre || 'Sin ventas',
            cantidad: productosEstrella[0]?.ventas || 0,
          },
          horaPico,
          distribucionVentas: ventasPorCategoria.map((c) => ({ label: c.categoria, value: c.total })),
          topPlatillos: productosEstrella,
          productosEstrella,
          ventasPorHora,
          ventasPorCategoria,
        });
        setLoading(false);
      } catch (error) {
        logger.error('METRICS', 'Error en cálculo reactivo', error as Error);
        setMetrics(null);
        setLoading(false);
      }
    };

    calculateMetrics();
  }, [
    pedidosData,
    mesasData,
    inventarioData,
    ventasData,
    missingAssignments,
    dateFilter,
    includeVentaCrudo,
    tenantPath,
    ultimaActualizacion,
  ]);

  return { metrics, loading };
}
