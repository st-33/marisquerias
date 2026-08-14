import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { theme } from '../../theme';

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

const chartConfig = {
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
};

export function SalesDistributionPieChart({ data, title }: Props) {
  const screenWidth = Dimensions.get('window').width;

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Sin datos para mostrar</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <PieChart
        data={data}
        width={screenWidth - 64} // Adjust width as needed
        height={220}
        chartConfig={chartConfig}
        accessor={'population'}
        backgroundColor={'transparent'}
        paddingLeft={'15'}
        center={[10, 0]}
        absolute
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  emptyState: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
  },
});
