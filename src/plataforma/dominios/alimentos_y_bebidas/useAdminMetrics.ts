// src/verticales/admin/logica/useAdminMetrics.ts
import { useEffect, useState } from 'react';
import {
  ensureNumberTimestamp,
  normalizeMesa,
  normalizePedido,
} from '../../core/domain/normalizers';
import { logger } from '../../core/monitoring/logger';
import {
  useInventoryCatalog,
  useMesas,
  useMissingAssignments,
  usePedidos,
  useVentas,
} from '../../core/store';
import { acumularVendedorSeguro, type ResumenVendedor } from './metricasVendedores';

/**
 * Hook para calcular métricas del dashboard admin.
 * ⚡ OPTIMIZADO: Lee directamente del store centralizado siguiendo el DOGMA V2.
 */
export function useAdminMetrics({
  dateFilter,
  includeVentaCrudo,
}: {
  dateFilter: 'hoy' | 'ayer' | 'hace3dias' | 'semana' | 'mes' | 'todo';
  includeVentaCrudo?: boolean;
}) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🔌 DOGMA V2: Reactividad total vía Store
  const pedidosData = usePedidos();
  const mesasData = useMesas();
  const inventarioData = useInventoryCatalog();
  const ventasData = useVentas();
  const missingAssignments = useMissingAssignments();

  useEffect(() => {
    const calculateMetrics = () => {
      try {
        // 1. Normalización
        const pedidos = Object.values(pedidosData || {})
          .map(normalizePedido)
          .filter(Boolean);
        const mesas = Object.values(mesasData || {})
          .map(normalizeMesa)
          .filter(Boolean);

        const now = Date.now();
        const startOfHoy = new Date().setHours(0, 0, 0, 0);

        // 2. Filtros de Fecha
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

        // 3. Estructuras de acumulación
        let totalVentas = 0;
        let totalOrdenes = 0;
        const mesasOcupadas = mesas.filter((m: any) => m.estado === 'ocupada').length;

        // Track estructuras de acumulación
        const vendedoresMap = new Map<string, ResumenVendedor>();
        const horaPedidosCountMap: Record<string, number> = {};
        const ventasPorHoraMap: Record<string, number> = {};
        const ventasPorCategoriaMap: Record<string, number> = {};
        const productosMap: Record<string, { nombre: string; ventas: number }> = {};

        // 4. Procesar pedidos cerrados
        pedidos.forEach((p: any) => {
          // Criterio de Temporalidad: agrupamos por pagadoAt como prioridad para el flujo de caja real
          const ts = ensureNumberTimestamp(p.pagadoAt || p.createdAt);
          if (
            ts >= minTs &&
            ts <= maxTs &&
            (p.estatus === 'cerrado' || p.cerrado || p.estatus === 'pagado')
          ) {
            // Regla de exclusión: Solo suma transacciones cerradas y pagadas
            if (p.estatus === 'cancelado') return;

            // Calcular suma atómica basada en el precio congelado históricamente en el ítem
            const items = Object.values(p.items || {});
            const pedidoTotal = items.reduce((sum: number, item: any) => {
              const cantidad = Math.max(0, Number(item.cantidad ?? item.qty ?? 0));
              const rawPrecio = Number(item.precio ?? item.price ?? 0);
              const precioHistorico = Math.max(0, Number.isNaN(rawPrecio) ? 0 : rawPrecio);
              return sum + cantidad * precioHistorico;
            }, 0);

            totalVentas += pedidoTotal;
            totalOrdenes++;

            // Acumular por hora
            const hora = new Date(ts).getHours();
            const horaLabel = `${hora}:00`;
            ventasPorHoraMap[horaLabel] = (ventasPorHoraMap[horaLabel] || 0) + pedidoTotal;
            horaPedidosCountMap[horaLabel] = (horaPedidosCountMap[horaLabel] || 0) + 1;

            // Acumular vendedor
            acumularVendedorSeguro(
              vendedoresMap,
              p.vendedor || p.mesero || p.creadoPor,
              pedidoTotal
            );

            // Procesar items para categorías y productos
            items.forEach((item: any) => {
              const cantidad = Math.max(0, Number(item.cantidad ?? item.qty ?? 0));
              const rawPrecio = Number(item.precio ?? item.price ?? 0);
              const precioHistorico = Math.max(0, Number.isNaN(rawPrecio) ? 0 : rawPrecio);
              const itemTotal = precioHistorico * cantidad;
              const categoria = item.categoria || item.category || 'Sin Categoría';
              const nombre = item.nombre || item.name || 'Desconocido';
              const productId = item.productId || item.id || nombre;

              // Acumular por categoría
              ventasPorCategoriaMap[categoria] =
                (ventasPorCategoriaMap[categoria] || 0) + itemTotal;

              // Acumular productos
              if (!productosMap[productId]) {
                productosMap[productId] = { nombre, ventas: 0 };
              }
              productosMap[productId].ventas += cantidad;
            });
          }
        });

        // 5. Ventas Crudo (si está habilitado)
        if (includeVentaCrudo && ventasData) {
          Object.values(ventasData).forEach((v: any) => {
            if (v.estatus === 'cancelado') return;

            const ts = ensureNumberTimestamp(v.timestamp);
            if (ts >= minTs && ts <= maxTs) {
              const totalVenta = Number(v.total || v.total_general || 0);
              totalVentas += totalVenta;
              totalOrdenes++;

              const hora = new Date(ts).getHours();
              const horaLabel = `${hora}:00`;
              ventasPorHoraMap[horaLabel] = (ventasPorHoraMap[horaLabel] || 0) + totalVenta;
              horaPedidosCountMap[horaLabel] = (horaPedidosCountMap[horaLabel] || 0) + 1;
            }
          });
        }

        // 6. Formatear arrays para charts y métricas derivadas
        const numHoras = dateFilter === 'hoy' ? 24 : 12;
        const ventasPorHora: { label: string; total: number }[] = [];
        for (let i = 0; i < numHoras; i++) {
          const label = dateFilter === 'hoy' ? `${i}h` : `${i * 2}h`;
          const mapKey = dateFilter === 'hoy' ? `${i}:00` : `${i * 2}:00`;
          ventasPorHora.push({ label, total: ventasPorHoraMap[mapKey] || 0 });
        }

        // ventasPorCategoria: ordenar por total descendente
        const ventasPorCategoria = Object.entries(ventasPorCategoriaMap)
          .map(([categoria, total]: [string, number]) => ({ categoria, total }))
          .sort((a, b) => b.total - a.total);

        // productosEstrella: top 5 por cantidad vendida
        const productosEstrella = Object.entries(productosMap)
          .map(([id, data]: [string, { nombre: string; ventas: number }]) => ({
            id,
            nombre: data.nombre,
            ventas: data.ventas,
          }))
          .sort((a, b) => b.ventas - a.ventas)
          .slice(0, 5);

        // Vendedor Estrella
        const topVendedor = Array.from(vendedoresMap.values()).sort(
          (a, b) => b.monto - a.monto
        )[0] || {
          nombre: 'Sin ventas',
          monto: 0,
          subpedidos: 0,
        };

        // Hora pico
        const topHoraEntry = Object.entries(horaPedidosCountMap).sort((a, b) => b[1] - a[1])[0];
        const horaPico = topHoraEntry
          ? { hora: topHoraEntry[0], pedidos: topHoraEntry[1] }
          : { hora: 'N/A', pedidos: 0 };

        // 7. Inventario bajo stock
        const bajoStock = Object.values(inventarioData || {}).filter((item: any) => {
          return (item.cantidad || 0) <= (item.umbralBajo || 10);
        }).length;

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
          vendedorHero: {
            ventasHero: totalVentas,
            subpedidosCountHero: totalOrdenes,
          },
          vendedorEstrella: topVendedor,
          platilloMasVendido: {
            nombre: productosEstrella[0]?.nombre || 'Sin ventas',
            cantidad: productosEstrella[0]?.ventas || 0,
          },
          horaPico,
          distribucionVentas: ventasPorCategoria.map((c) => ({
            label: c.categoria,
            value: c.total,
          })),
          topPlatillos: productosEstrella,
          ventasPorHora,
          ventasPorCategoria,
          productosEstrella,
        });
        setLoading(false);
      } catch (error) {
        logger.error('METRICS', 'Error en cálculo reactivo', error as Error);
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
  ]);

  return { metrics, loading };
}
