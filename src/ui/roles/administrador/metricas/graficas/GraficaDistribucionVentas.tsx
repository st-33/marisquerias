/**
 * Dirección visual: distribución como anillo de composición con paleta Elite.
 * Legibilidad tipográfica superior, formateo de moneda y estado explicativo si no hay categorías.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

type DatosTorta = {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
};

type GraficaDistribucionVentasProps = {
  data: DatosTorta[];
  title?: string;
};

const PALETA_ELITE = ['#F4C95D', '#5ED0B0', '#38BDF8', '#E07A5F', '#A78BFA', '#D4A843'];

function formatearMoneda(valor: number): string {
  if (valor >= 100000) {
    return `$${(valor / 1000).toFixed(1)}k`;
  }
  return `$${Math.round(valor).toLocaleString('es-MX')}`;
}

export function GraficaDistribucionVentas({ data, title }: GraficaDistribucionVentasProps) {
  const chartData = useMemo(() => {
    return (data || []).map((item, index) => ({
      value: Math.max(0, Number(item.population) || 0),
      color: item.color || PALETA_ELITE[index % PALETA_ELITE.length],
      text: item.name,
    }));
  }, [data]);

  const total = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData]);

  // Si todas las ventas caen en "Sin Categoría", mostrar mensaje explicativo
  const esSinCategoriaTotal = useMemo(() => {
    if (!data || data.length === 0) return false;
    const conDatos = data.filter((d) => (Number(d.population) || 0) > 0);
    if (conDatos.length === 0) return false;
    return conDatos.every((d) => {
      const nom = (d.name || '').toLowerCase().trim();
      return nom === 'sin categoría' || nom === 'sin categoria' || nom === 'desconocido';
    });
  }, [data]);

  if (!data || data.length === 0 || total <= 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="pie-chart-outline" size={32} color="#64748B" />
        <Text style={styles.emptyTitle}>Sin ventas registradas</Text>
        <Text style={styles.emptyText}>No hay movimientos en el período seleccionado.</Text>
      </View>
    );
  }

  if (esSinCategoriaTotal) {
    return (
      <View style={styles.sinCategoriaCard}>
        <View style={styles.sinCategoriaIcono}>
          <Ionicons name="pricetags-outline" size={26} color="#F4C95D" />
        </View>
        <View style={styles.sinCategoriaTexto}>
          <Text style={styles.sinCategoriaTitulo}>Ventas sin categoría asignada</Text>
          <Text style={styles.sinCategoriaDetalle}>
            El total acumulado de {formatearMoneda(total)} proviene de platillos sin categoría en el
            menú. Asigna categorías para visualizar la distribución.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.chartRow}>
        <View style={styles.pieWrapper}>
          <PieChart
            data={chartData}
            donut
            radius={68}
            innerRadius={48}
            innerCircleColor="#0D111A"
            innerCircleBorderColor="rgba(244, 201, 93, 0.18)"
            innerCircleBorderWidth={1}
            strokeColor="#0D111A"
            strokeWidth={3}
            isAnimated
            animationDuration={450}
            centerLabelComponent={() => (
              <View style={styles.centerLabel}>
                <Text style={styles.centerValue}>{formatearMoneda(total)}</Text>
                <Text style={styles.centerCaption}>TOTAL</Text>
              </View>
            )}
          />
        </View>
        <View style={styles.legend}>
          {data.slice(0, 5).map((item, index) => {
            const val = Math.max(0, Number(item.population) || 0);
            const share = total > 0 ? Math.round((val / total) * 100) : 0;
            const itemColor = item.color || PALETA_ELITE[index % PALETA_ELITE.length];

            return (
              <View key={`${item.name}-${index}`} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: itemColor }]} />
                <View style={styles.legendCopy}>
                  <Text numberOfLines={1} style={styles.legendName}>
                    {item.name}
                  </Text>
                  <Text style={styles.legendShare}>
                    {formatearMoneda(val)} • <Text style={styles.legendPorcentaje}>{share}%</Text>
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    color: '#F4F0E8',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  chartRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    minHeight: 146,
  },
  pieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    color: '#F4F0E8',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  centerCaption: {
    color: '#F4C95D',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  legend: {
    flex: 1,
    gap: 10,
    minWidth: 0,
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  legendDot: {
    borderRadius: 4,
    height: 12,
    width: 12,
  },
  legendCopy: {
    flex: 1,
    minWidth: 0,
  },
  legendName: {
    color: '#F4F0E8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  legendShare: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  legendPorcentaje: {
    color: '#F4C95D',
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    height: 140,
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 12,
  },
  sinCategoriaCard: {
    backgroundColor: 'rgba(244, 201, 93, 0.06)',
    borderColor: 'rgba(244, 201, 93, 0.22)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    alignItems: 'center',
  },
  sinCategoriaIcono: {
    alignItems: 'center',
    backgroundColor: 'rgba(244, 201, 93, 0.12)',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  sinCategoriaTexto: {
    flex: 1,
    gap: 3,
  },
  sinCategoriaTitulo: {
    color: '#F4C95D',
    fontSize: 14,
    fontWeight: '700',
  },
  sinCategoriaDetalle: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
  },
});
