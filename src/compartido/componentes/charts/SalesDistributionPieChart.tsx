/**
 * Dirección visual: distribución como anillo de composición, no como un
 * widget genérico. Conserva poblaciones y colores que entrega el dashboard.
 */

import React, { useMemo } from 'react';
import { PieChart } from 'react-native-gifted-charts';
import { StyleSheet, Text, View } from 'react-native';

type PieChartData = {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
};

type Props = {
  data: PieChartData[];
  title: string;
};

export function SalesDistributionPieChart({ data, title }: Props) {
  const chartData = useMemo(() => data.map((item) => ({
    value: Math.max(0, Number(item.population) || 0),
    color: item.color,
    gradientCenterColor: '#FAFBFF',
  })), [data]);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (!data || data.length === 0 || total <= 0) {
    return <View style={styles.emptyState}>{title ? <Text style={styles.title}>{title}</Text> : null}<Text style={styles.emptyText}>Sin datos para mostrar</Text></View>;
  }

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.chartRow}>
        <PieChart
          data={chartData}
          donut
          radius={72}
          innerRadius={51}
          innerCircleColor="#10151F"
          innerCircleBorderColor="rgba(255,255,255,0.08)"
          innerCircleBorderWidth={1}
          strokeColor="#10151F"
          strokeWidth={4}
          showGradient
          isAnimated
          animationDuration={620}
          curvedStartEdges
          curvedEndEdges
          centerLabelComponent={() => <View style={styles.centerLabel}><Text style={styles.centerValue}>{total}</Text><Text style={styles.centerCaption}>VENTAS</Text></View>}
        />
        <View style={styles.legend}>
          {data.slice(0, 4).map((item) => {
            const share = Math.round((Math.max(0, Number(item.population) || 0) / total) * 100);
            return <View key={item.name} style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: item.color }]} /><View style={styles.legendCopy}><Text numberOfLines={1} style={styles.legendName}>{item.name}</Text><Text style={styles.legendShare}>{share}% del total</Text></View></View>;
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 9 },
  title: { color: '#F5F1E7', fontSize: 17, fontWeight: '900', marginBottom: 4 },
  chartRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 160 },
  centerLabel: { alignItems: 'center', justifyContent: 'center' },
  centerValue: { color: '#F4F7FB', fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  centerCaption: { color: '#8390A3', fontSize: 7, fontWeight: '900', letterSpacing: 1.1, marginTop: 2 },
  legend: { flex: 1, gap: 9, minWidth: 0 },
  legendRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  legendDot: { borderRadius: 5, height: 9, width: 9 },
  legendCopy: { flex: 1, minWidth: 0 },
  legendName: { color: '#E8EDF4', fontSize: 10, fontWeight: '800' },
  legendShare: { color: '#7D899B', fontSize: 8, marginTop: 2 },
  emptyState: { alignItems: 'center', height: 150, justifyContent: 'center' },
  emptyText: { color: '#8E99A9', fontSize: 11 },
});
