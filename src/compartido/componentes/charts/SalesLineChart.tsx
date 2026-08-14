import { useMemo } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useAppTheme } from '../../temas/ThemeContext';
import { Card } from '../ui/Card';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface SalesLineChartProps {
  data: { label: string; total: number }[];
  title?: string;
  height?: number;
}

export const SalesLineChart = ({
  data,
  title = 'Tendencia de Ventas',
  height = 220,
}: SalesLineChartProps) => {
  const { theme, isElite } = useAppTheme();

  // 🎨 Configuración de Colores Dinámica
  const chartConfig = useMemo(() => {
    return {
      backgroundGradientFrom: isElite ? '#111115' : '#ffffff',
      backgroundGradientTo: isElite ? '#0a0a0c' : '#ffffff',
      decimalPlaces: 0,
      color: (opacity = 1) =>
        isElite
          ? `rgba(197, 160, 89, ${opacity})` // Elite Gold
          : `rgba(37, 99, 235, ${opacity})`, // Classic Blue
      labelColor: (opacity = 1) =>
        isElite ? `rgba(255, 255, 255, ${opacity})` : `rgba(107, 114, 128, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: isElite ? '#fbbf24' : '#2563EB',
        fill: isElite ? '#000' : '#fff',
      },
      propsForBackgroundLines: {
        strokeDasharray: '5', // Dotted lines
        stroke: isElite ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      },
    };
  }, [isElite, theme]);

  // Transformar datos para el chart
  const chartData = useMemo(() => {
    // Si no hay datos, mostramos una línea plana
    if (!data || data.length === 0) {
      return {
        labels: ['0h', '4h', '8h', '12h', '16h', '20h'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0] }],
      };
    }

    // Tomar solo algunos labels para no saturar el eje X
    const step = Math.ceil(data.length / 6);
    const labels = data.map((d, i) => (i % step === 0 ? d.label : ''));
    const values = data.map((d) => d.total);

    return {
      labels,
      datasets: [
        {
          data: values,
          color: (opacity = 1) =>
            isElite ? `rgba(212, 175, 55, ${opacity})` : `rgba(37, 99, 235, ${opacity})`,
          strokeWidth: 3,
        },
      ],
      legend: [isElite ? 'Ventas (Elite)' : 'Ventas'],
    };
  }, [data, isElite]);

  return (
    <Card style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        {isElite && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>LIVE</Text>
          </View>
        )}
      </View>

      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={Platform.OS === 'web' ? 500 : SCREEN_WIDTH - 64}
          height={height}
          chartConfig={chartConfig}
          bezier // Curvas suaves
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          yAxisLabel="$"
          yAxisInterval={1}
          fromZero
          segments={4}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'System', // Usar fuente del sistema o personalizada si existe
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  badgeText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
