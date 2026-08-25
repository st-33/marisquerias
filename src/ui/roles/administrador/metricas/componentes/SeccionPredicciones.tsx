import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import type { PrediccionPlatillo } from '../../../../../capacidades/metricas';
import { EncabezadoSeccion } from './EncabezadoSeccion';
import { TarjetaPrediccion } from './TarjetaPrediccion';

type SeccionPrediccionesProps = {
  predicciones: PrediccionPlatillo[];
  loading: boolean;
  anchoTarjeta?: DimensionValue;
};

/**
 * Sección de Predicción de Reabastecimiento.
 * Extraída de la pantalla principal; delega cada tarjeta en `TarjetaPrediccion`.
 */
export function SeccionPredicciones({
  predicciones,
  loading,
  anchoTarjeta,
}: SeccionPrediccionesProps) {
  return (
    <View style={styles.contenedor}>
      <EncabezadoSeccion
        icono="analytics"
        color="#8b5cf6"
        titulo="Predicción de Reabastecimiento"
      />

      {loading ? (
        <View style={styles.cargando}>
          <Text style={styles.textoCargando}>Calculando predicciones...</Text>
        </View>
      ) : predicciones.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.textoVacio}>No hay suficientes datos para generar predicciones</Text>
        </View>
      ) : (
        <View style={styles.cuadricula}>
          {predicciones.map((prediccion) => (
            <TarjetaPrediccion
              key={prediccion.productoId}
              prediccion={prediccion}
              ancho={anchoTarjeta}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: 12,
  },
  cargando: {
    padding: 20,
    alignItems: 'center',
  },
  textoCargando: {
    color: '#B6BCC8',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  vacio: {
    padding: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    alignItems: 'center',
  },
  textoVacio: {
    color: '#64748b',
    fontSize: 14,
  },
  cuadricula: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
