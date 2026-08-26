/**
 * 📊 Tarjeta de resumen del módulo Mesas (rol Administrador).
 * Extraída de `PantallaMesas` (antes `SummaryCard` en AdminTablesScreen).
 */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

type TarjetaResumenProps = {
  titulo: string;
  valor: number;
  icono: any;
  color: string;
};

export function TarjetaResumen({ titulo, valor, icono, color }: TarjetaResumenProps) {
  return (
    <View style={styles.tarjeta}>
      <View style={[styles.icono, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icono} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.valor}>{valor}</Text>
        <Text style={styles.titulo}>{titulo}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  icono: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valor: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  titulo: {
    color: '#94a3b8',
    fontSize: 12,
  },
});
