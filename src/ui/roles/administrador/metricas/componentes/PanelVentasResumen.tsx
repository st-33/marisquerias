import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { GraficaVentasTiempo } from '../graficas/GraficaVentasTiempo';
import { VistaSinDatos } from './VistaSinDatos';

type DatoVenta = {
  timestamp: number;
  total: number;
};

type PanelVentasResumenProps = {
  titulo: string;
  monto: string;
  datos: DatoVenta[];
};

export function PanelVentasResumen({ titulo, monto, datos }: PanelVentasResumenProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.encabezado}>
        <View>
          <Text style={styles.titulo}>{titulo}</Text>
          <Text style={styles.monto}>{monto}</Text>
        </View>
        <View style={styles.indicador}>
          <Text style={styles.tituloGrafica}>Evolución por hora</Text>
          <Ionicons name="trending-up" size={22} color="#5ED0B0" />
        </View>
      </View>
      {datos.length > 0 ? (
        <GraficaVentasTiempo data={datos} height={220} />
      ) : (
        <VistaSinDatos texto="Sin datos para el período seleccionado" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(151,181,237,0.24)',
    borderRadius: 22,
    borderWidth: 1,
    elevation: 9,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 26,
  },
  encabezado: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titulo: {
    color: '#F4F0E8',
    fontSize: 14,
    fontWeight: '700',
  },
  monto: {
    color: '#F8FAFC',
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 44,
  },
  indicador: {
    alignItems: 'flex-end',
    gap: 6,
  },
  tituloGrafica: {
    color: '#D4D9E4',
    fontSize: 13,
    fontStyle: 'italic',
  },
});
