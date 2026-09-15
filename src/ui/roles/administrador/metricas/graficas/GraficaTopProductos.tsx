/**
 * Dirección visual: ranking editorial de rendimiento con barras luminosas animadas,
 * jerarquía de podio, tipografía legible y microinteracción de selección al tocar.
 */

import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '../../../../../compartido/temas/ThemeContext';

type DatosProducto = {
  id: string;
  nombre: string;
  ventas: number;
};

type GraficaTopProductosProps = {
  data: DatosProducto[];
  title?: string;
};

const RANK_PALETTES = [
  ['#F4C95D', '#B87822'],
  ['#5ED0B0', '#2E8573'],
  ['#38BDF8', '#1D678F'],
  ['#E07A5F', '#9A4630'],
  ['#A78BFA', '#6D4BB8'],
] as const;

function BarraProgresoAnimada({
  porcentaje,
  colores,
  retraso,
}: {
  porcentaje: number;
  colores: readonly [string, string];
  retraso: number;
}) {
  const ancho = useSharedValue(0);

  useEffect(() => {
    ancho.value = withDelay(
      retraso,
      withTiming(porcentaje, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, [porcentaje, retraso]);

  const estiloAnimado = useAnimatedStyle(() => ({
    width: `${ancho.value}%`,
  }));

  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barWrapper, estiloAnimado]}>
        <LinearGradient
          colors={colores}
          end={{ x: 1, y: 0 }}
          start={{ x: 0, y: 0 }}
          style={styles.barGradient}
        />
      </Animated.View>
    </View>
  );
}

export function GraficaTopProductos({ data, title }: GraficaTopProductosProps) {
  const { isElite } = useAppTheme();
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Sin datos para mostrar</Text>
      </View>
    );
  }

  const ranking = data.slice(0, 5);
  const totalVentasTop = ranking.reduce((acc, p) => acc + p.ventas, 0);
  const maxValue = Math.max(...ranking.map((product) => product.ventas), 1);

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>PLATILLO</Text>
        <Text style={styles.headerLabel}>UNIDADES VENDIDAS</Text>
      </View>
      <View style={styles.chartContainer}>
        {ranking.map((product, index) => {
          const share = Math.max(8, (product.ventas / maxValue) * 100);
          const shareOfTotal =
            totalVentasTop > 0 ? Math.round((product.ventas / totalVentasTop) * 100) : 0;
          const palette = RANK_PALETTES[index % RANK_PALETTES.length];
          const esSeleccionado = seleccionadoId === product.id;

          return (
            <Animated.View
              entering={FadeInRight.delay(index * 60).duration(280)}
              key={product.id}
            >
              <Pressable
                onPress={() => setSeleccionadoId(esSeleccionado ? null : product.id)}
                style={[
                  styles.rowCard,
                  esSeleccionado && {
                    borderColor: `${palette[0]}80`,
                    backgroundColor: 'rgba(244, 201, 93, 0.08)',
                  },
                ]}
              >
                <View
                  style={[
                    styles.rank,
                    { backgroundColor: `${palette[0]}22`, borderColor: `${palette[0]}66` },
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
                  <BarraProgresoAnimada
                    porcentaje={share}
                    colores={palette}
                    retraso={index * 80 + 100}
                  />
                  {esSeleccionado && (
                    <Text style={styles.detalleSeleccion}>
                      Representa el {shareOfTotal}% del top 5 ({product.ventas} unidades)
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.scoreBox,
                    {
                      borderColor: `${palette[0]}44`,
                      backgroundColor: isElite ? '#0B0F17' : 'rgba(255,255,255,0.06)',
                    },
                  ]}
                >
                  <Text style={[styles.salesValue, { color: palette[0] }]}>{product.ventas}</Text>
                  <Text style={styles.salesLabel}>UNID</Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  title: { color: '#F4F0E8', fontSize: 17, fontWeight: '900', marginBottom: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  headerLabel: { color: '#8291A5', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  chartContainer: { gap: 8 },
  rowCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rank: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  rankText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  productColumn: { flex: 1, minWidth: 0 },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 6 },
  productName: { color: '#F4F0E8', flex: 1, fontSize: 13, fontWeight: '700' },
  leaderTag: {
    backgroundColor: 'rgba(244,201,93,0.18)',
    borderColor: 'rgba(244,201,93,0.4)',
    borderWidth: 1,
    borderRadius: 6,
    color: '#F4C95D',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  barTrack: {
    backgroundColor: 'rgba(166,182,208,0.14)',
    borderRadius: 6,
    height: 8,
    overflow: 'hidden',
  },
  barWrapper: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  detalleSeleccion: {
    color: '#F4C95D',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  scoreBox: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 50,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  salesValue: { fontSize: 15, fontWeight: '900' },
  salesLabel: {
    color: '#8291A5',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  emptyState: { alignItems: 'center', height: 140, justifyContent: 'center' },
  emptyText: { color: '#8E99A9', fontSize: 12 },
});
