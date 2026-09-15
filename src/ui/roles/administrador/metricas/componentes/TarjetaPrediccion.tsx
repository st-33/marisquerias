import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import type { PrediccionPlatillo } from '../../../../../capacidades/metricas';

function estadoDePrediccion(prediccion: PrediccionPlatillo): { texto: string; color: string } {
  if (prediccion.cantidadPosible === 0) {
    return { texto: 'AGOTADO', color: '#EF4444' };
  }
  if (prediccion.stockSuficiente) {
    return { texto: 'STOCK OK', color: '#5ED0B0' };
  }
  return { texto: 'REVISAR', color: '#F4C95D' };
}

/**
 * Tarjeta individual de predicción de reabastecimiento con estética Elite.
 */
export function TarjetaPrediccion({
  prediccion,
  ancho,
}: {
  prediccion: PrediccionPlatillo;
  ancho?: DimensionValue;
}) {
  const { texto, color } = estadoDePrediccion(prediccion);
  const diasRestantes = prediccion.stockSuficiente ? 'Óptimo' : 'Crítico';

  return (
    <View style={[styles.tarjeta, ancho !== undefined ? { width: ancho } : null]}>
      <View style={styles.encabezado}>
        <Text style={styles.nombre} numberOfLines={1}>
          {prediccion.productoNombre}
        </Text>
        <View
          style={[
            styles.insignia,
            { backgroundColor: `${color}18`, borderColor: `${color}40`, borderWidth: 1 },
          ]}
        >
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
          <Text style={styles.metricaEtiqueta}>Estado stock</Text>
        </View>
      </View>

      <View style={styles.pie}>
        <Ionicons name="cube-outline" size={13} color="#8291A5" />
        <Text style={styles.limitante} numberOfLines={1}>
          Limitante: {prediccion.ingredienteLimitante || 'Ninguno'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 201, 93, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nombre: {
    color: '#F4F0E8',
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
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricas: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 8,
  },
  metrica: {
    alignItems: 'center',
  },
  metricaValor: {
    color: '#F4F0E8',
    fontSize: 16,
    fontWeight: '800',
  },
  metricaEtiqueta: {
    color: '#8291A5',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  limitante: {
    color: '#8291A5',
    fontSize: 11,
    flex: 1,
  },
});
