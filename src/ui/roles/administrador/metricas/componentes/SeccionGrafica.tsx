import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

type SeccionGraficaProps = {
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
};

/**
 * Contenedor de una gráfica del panel con su encabezado.
 * Antes el bloque (tarjeta + título + subtítulo + ícono) estaba duplicado tres veces
 * en la pantalla principal.
 */
export function SeccionGrafica({ icono, color, titulo, subtitulo, children }: SeccionGraficaProps) {
  return (
    <View style={styles.tarjeta}>
      <View style={styles.encabezado}>
        <View>
          <Text style={styles.titulo}>{titulo}</Text>
          {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
        </View>
        <Ionicons name={icono} size={24} color={color} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titulo: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitulo: {
    color: '#64748b',
    fontSize: 13,
  },
});
