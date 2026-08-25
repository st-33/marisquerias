import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

type EncabezadoSeccionProps = {
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
  titulo: string;
};

/** Encabezado compartido de las secciones internas del módulo Métricas y Datos. */
export function EncabezadoSeccion({ icono, color, titulo }: EncabezadoSeccionProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icono} size={22} color={color} />
      <Text style={styles.titulo}>{titulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  titulo: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
});
