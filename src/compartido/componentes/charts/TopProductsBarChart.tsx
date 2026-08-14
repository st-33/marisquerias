import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

type ProductData = {
  id: string;
  nombre: string;
  ventas: number;
};

type Props = {
  data: ProductData[];
  title: string;
};

export function TopProductsBarChart({ data, title }: Props) {
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

  const maxValue = Math.max(...data.map((p) => p.ventas), 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartContainer}>
        {data.map((product, index) => {
          const barWidth = maxValue > 0 ? (product.ventas / maxValue) * 100 : 0;
          return (
            <View key={product.id} style={styles.barRow}>
              <Text style={styles.productName}>{product.nombre}</Text>
              <View style={styles.barContainer}>
                <View style={[styles.bar, { width: `${barWidth}%` }]} />
              </View>
              <Text style={styles.salesValue}>{product.ventas}</Text>
            </View>
          );
        })}
      </View>
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
  chartContainer: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productName: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    width: 100, // Fixed width for alignment
  },
  barContainer: {
    flex: 1,
    height: 12,
    backgroundColor: theme.colors.surfaceDark,
    borderRadius: 6,
  },
  bar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
  },
  salesValue: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
    width: 30,
    textAlign: 'right',
  },
  emptyState: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
  },
});
