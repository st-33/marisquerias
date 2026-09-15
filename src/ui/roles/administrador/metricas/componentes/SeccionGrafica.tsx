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
        <View style={styles.titulosCol}>
          <Text style={styles.titulo}>{titulo}</Text>
          {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
        </View>
        <View style={[styles.iconoBadge, { backgroundColor: `${color}18`, borderColor: `${color}35` }]}>
          <Ionicons name={icono} size={20} color={color} />
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: '#0D111A',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(244, 201, 93, 0.14)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titulosCol: {
    flex: 1,
    marginRight: 12,
  },
  titulo: {
    color: '#F4F0E8',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitulo: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  iconoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
