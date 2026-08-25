/**
 * Dirección visual: ranking editorial de rendimiento con barras luminosas y
 * jerarquía de podio. Los valores se conservan; cambia solo su presentación.
 */

import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useAppTheme } from '../../../../../compartido/temas/ThemeContext';

type DatosProducto = {
  id: string;
  nombre: string;
  ventas: number;
};

type GraficaTopProductosProps = {
  data: DatosProducto[];
  title: string;
};

const RANK_PALETTES = [
  ['#F4C95D', '#B87822'],
  ['#8DA8C7', '#58718F'],
  ['#D6966A', '#995735'],
  ['#6B96E5', '#365DAA'],
  ['#4FC6AA', '#237E70'],
] as const;

export function GraficaTopProductos({ data, title }: GraficaTopProductosProps) {
  const { isElite } = useAppTheme();

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Sin datos para mostrar</Text>
      </View>
    );
  }

  const ranking = data.slice(0, 5);
  const maxValue = Math.max(...ranking.map((product) => product.ventas), 1);

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>PLATILLO</Text>
        <Text style={styles.headerLabel}>UNIDADES</Text>
      </View>
      <View style={styles.chartContainer}>
        {ranking.map((product, index) => {
          const share = Math.max(6, (product.ventas / maxValue) * 100);
          const palette = RANK_PALETTES[index % RANK_PALETTES.length];
          return (
            <Animated.View
              entering={FadeInRight.delay(index * 58).duration(260)}
              key={product.id}
              style={styles.row}
            >
              <View
                style={[
                  styles.rank,
                  { backgroundColor: `${palette[0]}20`, borderColor: `${palette[0]}66` },
                ]}
              >
                <Text style={[styles.rankText, { color: palette[0] }]}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
              </View>
              <View style={styles.productColumn}>
                <View style={styles.nameRow}>
                  <Text numberOfLines={1} style={styles.productName}>
                    {product.nombre}
                  </Text>
                  {index === 0 && <Text style={styles.leaderTag}>LÍDER</Text>}
                </View>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={palette}
                    end={{ x: 1, y: 0 }}
                    start={{ x: 0, y: 0 }}
                    style={[styles.bar, { width: `${share}%` }]}
                  />
                </View>
              </View>
              <View
                style={[
                  styles.scoreBox,
                  {
                    borderColor: `${palette[0]}38`,
                    backgroundColor: isElite ? 'rgba(7,11,18,0.48)' : 'rgba(255,255,255,0.04)',
                  },
                ]}
              >
                <Text style={styles.salesValue}>{product.ventas}</Text>
                <Text style={styles.salesLabel}>VENTAS</Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  title: { color: '#F5F1E7', fontSize: 17, fontWeight: '900', marginBottom: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  headerLabel: { color: '#738095', fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  chartContainer: { gap: 9 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  rank: {
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  rankText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  productColumn: { flex: 1, minWidth: 0 },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 7, marginBottom: 5 },
  productName: { color: '#EBEFF6', flex: 1, fontSize: 11, fontWeight: '800' },
  leaderTag: {
    backgroundColor: 'rgba(244,201,93,0.14)',
    borderRadius: 5,
    color: '#F4C95D',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  barTrack: {
    backgroundColor: 'rgba(166,182,208,0.11)',
    borderRadius: 5,
    height: 7,
    overflow: 'hidden',
  },
  bar: { borderRadius: 5, height: '100%' },
  scoreBox: {
    alignItems: 'flex-end',
    borderRadius: 9,
    borderWidth: 1,
    minWidth: 42,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  salesValue: { color: '#F6F2E8', fontSize: 12, fontWeight: '900' },
  salesLabel: {
    color: '#7D899A',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.65,
    marginTop: 1,
  },
  emptyState: { alignItems: 'center', height: 150, justifyContent: 'center' },
  emptyText: { color: '#8E99A9', fontSize: 11 },
});
