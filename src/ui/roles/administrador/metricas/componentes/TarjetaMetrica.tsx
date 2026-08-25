import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

export type TendenciaMetrica = 'up' | 'down' | 'neutral';

type TarjetaMetricaProps = {
  titulo: string;
  valor: string;
  subtitulo?: string;
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
  tendencia?: TendenciaMetrica;
  containerStyle?: any;
};

/**
 * Tarjeta de métrica secundaria del panel.
 * Extraída de la pantalla principal (antes `MetricCard` interno de AdminDashboardScreen).
 */
export function TarjetaMetrica({
  titulo,
  valor,
  subtitulo,
  icono,
  color,
  tendencia,
  containerStyle,
}: TarjetaMetricaProps) {
  return (
    <LinearGradient
      colors={[`${color}32`, '#111722']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.tarjeta, containerStyle]}
    >
      <View pointerEvents="none" style={[styles.aura, { backgroundColor: `${color}18` }]} />
      <View style={styles.encabezado}>
        <View style={[styles.insignia, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icono} size={22} color={color} />
        </View>
        {tendencia && (
          <View
            style={[
              styles.insigniaTendencia,
              tendencia === 'up' && styles.insigniaTendenciaArriba,
              tendencia === 'down' && styles.insigniaTendenciaAbajo,
            ]}
          >
            <Ionicons
              name={
                tendencia === 'up'
                  ? 'trending-up'
                  : tendencia === 'down'
                    ? 'trending-down'
                    : 'remove'
              }
              size={14}
              color={tendencia === 'up' ? '#10b981' : tendencia === 'down' ? '#ef4444' : '#6b7280'}
            />
          </View>
        )}
      </View>
      <Text style={styles.valor}>{valor}</Text>
      <Text style={styles.titulo}>{titulo}</Text>
      {subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: '#111722',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(222,229,242,0.16)',
    overflow: 'hidden',
    minHeight: 150,
  },
  aura: {
    position: 'absolute',
    right: -56,
    top: -78,
    width: 150,
    height: 150,
    borderRadius: 90,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  insignia: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insigniaTendencia: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#0f172a',
  },
  insigniaTendenciaArriba: {
    backgroundColor: '#10b98115',
  },
  insigniaTendenciaAbajo: {
    backgroundColor: '#ef444415',
  },
  valor: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  titulo: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  subtitulo: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
});
