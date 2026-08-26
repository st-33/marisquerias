/**
 * ⚙️ Tarjeta de configuración del módulo Reparto (rol Administrador).
 * Extraída de la pantalla (antes `Card` interno en repart.tsx).
 */

import { Pressable, StyleSheet, Text } from 'react-native';

type TarjetaConfigProps = {
  titulo: string;
  subtitulo?: string;
  onPress?: () => void;
};

export function TarjetaConfig({ titulo, subtitulo, onPress }: TarjetaConfigProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tarjeta, pressed && styles.presionada]}
    >
      <Text style={styles.titulo}>{titulo}</Text>
      {!!subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: '#111827',
    padding: 18,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#0b1220',
  },
  presionada: {
    opacity: 0.95,
  },
  titulo: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  subtitulo: {
    color: '#9ca3af',
    marginTop: 6,
  },
});
