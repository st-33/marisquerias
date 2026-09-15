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
        color="#A78BFA"
        titulo="Predicción de Reabastecimiento"
      />

      {loading ? (
        <View style={styles.cargando}>
          <Text style={styles.textoCargando}>Calculando predicciones de stock...</Text>
        </View>
      ) : predicciones.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.textoVacio}>
            Inventario en niveles óptimos o sin recetas configuradas para generar predicciones
          </Text>
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
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  textoCargando: {
    color: '#8291A5',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  vacio: {
    padding: 24,
    backgroundColor: '#0D111A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 201, 93, 0.12)',
    alignItems: 'center',
  },
  textoVacio: {
    color: '#8291A5',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  cuadricula: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
