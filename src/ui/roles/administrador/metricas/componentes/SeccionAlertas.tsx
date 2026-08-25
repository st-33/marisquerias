import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { AlertaInteligente } from '../../../../../capacidades/metricas';
import { EncabezadoSeccion } from './EncabezadoSeccion';

type SeccionAlertasProps = {
  criticas: AlertaInteligente[];
  medias: AlertaInteligente[];
  tieneAlertas: boolean;
};

/**
 * Sección de Alertas del Negocio.
 * Extraída de la pantalla principal; muestra las alertas derivadas de las predicciones.
 */
export function SeccionAlertas({ criticas, medias, tieneAlertas }: SeccionAlertasProps) {
  if (!tieneAlertas) return null;

  return (
    <View style={styles.contenedor}>
      <EncabezadoSeccion icono="warning" color="#ef4444" titulo="Alertas del Negocio" />

      {criticas.map((alerta) => (
        <View key={alerta.id} style={[styles.tarjeta, styles.tarjetaCritica]}>
          <Ionicons name="alert-circle" size={24} color="#ef4444" />
          <View style={styles.contenido}>
            <Text style={styles.titulo}>{alerta.titulo}</Text>
            <Text style={styles.mensaje}>{alerta.mensaje}</Text>
          </View>
        </View>
      ))}

      {medias.map((alerta) => (
        <View key={alerta.id} style={[styles.tarjeta, styles.tarjetaMedia]}>
          <Ionicons name="warning" size={24} color="#f59e0b" />
          <View style={styles.contenido}>
            <Text style={styles.titulo}>{alerta.titulo}</Text>
            <Text style={styles.mensaje}>{alerta.mensaje}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: 12,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  tarjetaCritica: {
    backgroundColor: '#ef444410',
    borderColor: '#ef444440',
  },
  tarjetaMedia: {
    backgroundColor: '#f59e0b10',
    borderColor: '#f59e0b40',
  },
  contenido: {
    flex: 1,
  },
  titulo: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  mensaje: {
    color: '#cbd5e1',
    fontSize: 13,
  },
});
