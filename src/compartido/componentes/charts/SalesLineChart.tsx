/**
 * Dirección visual: curva de área viva para el centro de control; usa Gifted
 * Charts para animación, foco táctil y tooltip sin sacrificar Expo web.
 */

import { LineChart } from 'react-native-gifted-charts';
import { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAppTheme } from '../../temas/ThemeContext';

interface SalesLineChartProps {
  data: { label: string; total: number }[];
  height?: number;
}

export const SalesLineChart = ({ data, height = 190 }: SalesLineChartProps) => {
  const { isElite } = useAppTheme();
  const { width } = useWindowDimensions();
  const accent = isElite ? '#5ED0B0' : '#3B82F6';
  const accentStart = isElite ? '#3C90DA' : '#2563EB';
  const chartWidth = Math.max(245, Math.min(650, width - 142));

  const chartData = useMemo(() => {
    const source = data?.length ? data : [
      { label: '08:00', total: 0 }, { label: '10:00', total: 0 }, { label: '12:00', total: 0 },
      { label: '14:00', total: 0 }, { label: '16:00', total: 0 }, { label: '18:00', total: 0 },
    ];
    const step = Math.max(1, Math.ceil(source.length / 7));
    return source.map((point, index) => ({
      value: Math.max(0, Number(point.total) || 0),
      label: index % step === 0 || index === source.length - 1 ? point.label : '',
    }));
  }, [data]);

  const max = Math.max(1, ...chartData.map((point) => point.value));
  const sectionValue = Math.max(1, Math.ceil(max / 4));
  const maxValue = sectionValue * 4;

  return (
    <View style={styles.container}>
      <LineChart
        areaChart
        isAnimated
        animateOnDataChange
        animationDuration={720}
        data={chartData}
        width={chartWidth}
        height={Math.max(115, height - 42)}
        adjustToWidth
        curved
        curvature={0.18}
        color={accent}
        thickness={3}
        startFillColor={accentStart}
        endFillColor={accent}
        startOpacity={0.42}
        endOpacity={0.025}
        initialSpacing={8}
        endSpacing={8}
        noOfSections={4}
        maxValue={maxValue}
        stepValue={sectionValue}
        hideYAxisText
        yAxisThickness={0}
        xAxisThickness={0}
        rulesColor="rgba(227,232,242,0.13)"
        rulesType="dashed"
        dashWidth={4}
        dashGap={7}
        xAxisLabelTextStyle={styles.axisLabel}
        hideDataPoints
        pointerConfig={{
          activatePointersOnLongPress: false,
          activatePointersInstantlyOnTouch: true,
          autoAdjustPointerLabelPosition: true,
          persistPointer: true,
          pointerColor: '#D4AF37',
          radius: 6,
          showPointerStrip: true,
          pointerStripColor: 'rgba(212,175,55,0.42)',
          pointerStripWidth: 1,
          pointerLabelWidth: 126,
          pointerLabelHeight: 54,
          pointerLabelComponent: (items: any[]) => {
            const item = items?.[0] ?? chartData[chartData.length - 1];
            return <View style={styles.tooltip}><Text style={styles.tooltipLabel}>{item?.label || 'Período'}</Text><Text style={styles.tooltipValue}>${Number(item?.value ?? 0).toFixed(2)}</Text></View>;
          },
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  axisLabel: { color: '#93A0B4', fontSize: 8, fontWeight: '700', marginTop: 5 },
  tooltip: { backgroundColor: '#101520', borderColor: 'rgba(212,175,55,0.48)', borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 9 },
  tooltipLabel: { color: '#AAB5C8', fontSize: 8, fontWeight: '700' },
  tooltipValue: { color: '#F6D266', fontSize: 13, fontWeight: '900', marginTop: 2 },
});
