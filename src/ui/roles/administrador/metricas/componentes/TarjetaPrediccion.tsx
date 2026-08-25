import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import type { PrediccionPlatillo } from '../../../../../capacidades/metricas';

function estadoDePrediccion(prediccion: PrediccionPlatillo): { texto: string; color: string } {
  if (prediccion.cantidadPosible === 0) {
    return { texto: 'AGOTADO', color: '#ef4444' };
  }
  if (prediccion.stockSuficiente) {
    return { texto: 'OK', color: '#10b981' };
  }
  return { texto: 'REVISAR', color: '#f59e0b' };
}

/**
 * Tarjeta individual de predicción de reabastecimiento.
 * Se tipificó contra `PrediccionPlatillo` y se eliminaron los campos defensivos
 * heredados (`estadoStock`, `platilloId`, `nombrePlatillo`, `promedioDiario`,
 * `diasRestantes`, `fechaRecompraSugerida`) que ya no existen en el contrato real.
 */
export function TarjetaPrediccion({
  prediccion,
  ancho,
}: {
  prediccion: PrediccionPlatillo;
  ancho?: DimensionValue;
}) {
  const { texto, color } = estadoDePrediccion(prediccion);
  const diasRestantes = prediccion.stockSuficiente ? '∞' : '0';

  return (
    <View style={[styles.tarjeta, ancho !== undefined ? { width: ancho } : null]}>
      <View style={styles.encabezado}>
        <Text style={styles.nombre} numberOfLines={1}>
          {prediccion.productoNombre}
        </Text>
        <View style={[styles.insignia, { backgroundColor: `${color}20` }]}>
          <Text style={[styles.insigniaTexto, { color }]}>{texto}</Text>
        </View>
      </View>

      <View style={styles.metricas}>
        <View style={styles.metrica}>
          <Text style={styles.metricaValor}>{prediccion.cantidadPosible}</Text>
          <Text style={styles.metricaEtiqueta}>Porciones posibles</Text>
        </View>
        <View style={styles.metrica}>
          <Text style={[styles.metricaValor, { color }]}>{diasRestantes}</Text>
          <Text style={styles.metricaEtiqueta}>Días rest.</Text>
        </View>
      </View>

      <View style={styles.pie}>
        <Ionicons name="cube-outline" size={14} color="#9ca3af" />
        <Text style={styles.limitante} numberOfLines={1}>
          Limitante: {prediccion.ingredienteLimitante}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nombre: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  insignia: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  insigniaTexto: {
    fontSize: 11,
    fontWeight: '800',
  },
  metricas: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#33415550',
    marginBottom: 8,
  },
  metrica: {
    alignItems: 'center',
  },
  metricaValor: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  metricaEtiqueta: {
    color: '#64748b',
    fontSize: 11,
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  limitante: {
    color: '#9ca3af',
    fontSize: 11,
  },
});
