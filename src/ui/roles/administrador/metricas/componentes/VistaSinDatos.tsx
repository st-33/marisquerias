import { StyleSheet, Text, View } from 'react-native';

/** Estado vacío estándar de las gráficas del módulo Métricas y Datos. */
export function VistaSinDatos({ texto }: { texto: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.texto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    color: '#8291A5',
    fontSize: 13,
    fontWeight: '500',
  },
});
