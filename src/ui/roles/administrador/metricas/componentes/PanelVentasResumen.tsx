import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DateFilter } from '../../../../../capacidades/metricas';
import { GraficaVentasTiempo, type ModoGrafica } from '../graficas/GraficaVentasTiempo';
import { VistaSinDatos } from './VistaSinDatos';

type DatoVenta = {
  timestamp: number;
  total: number;
};

type PanelVentasResumenProps = {
  monto: string;
  datos: DatoVenta[];
  dateFilter: DateFilter;
  includeVentaCrudo?: boolean;
  ventasRestaurante?: number;
  ventasMostrador?: number;
  ordenesRestaurante?: number;
  ordenesMostrador?: number;
};

/**
 * Calcula el modo de la gráfica y el rango de fechas
 * en base al filtro de período seleccionado.
 */
function calcularModoYRango(dateFilter: DateFilter): {
  modo: ModoGrafica;
  rangoInicio: number;
  rangoFin: number;
} {
  const ahora = Date.now();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const inicioHoy = hoy.getTime();

  switch (dateFilter) {
    case 'hoy':
      return { modo: 'hora', rangoInicio: inicioHoy, rangoFin: ahora };

    case 'ayer': {
      const inicioAyer = inicioHoy - 86400000;
      return { modo: 'hora', rangoInicio: inicioAyer, rangoFin: inicioHoy - 1 };
    }

    case 'hace3dias':
      return { modo: 'dia', rangoInicio: inicioHoy - 3 * 86400000, rangoFin: ahora };

    case 'semana':
      return { modo: 'dia', rangoInicio: ahora - 7 * 86400000, rangoFin: ahora };

    case 'mes':
      return { modo: 'dia', rangoInicio: ahora - 30 * 86400000, rangoFin: ahora };

    default:
      return { modo: 'dia', rangoInicio: ahora - 30 * 86400000, rangoFin: ahora };
  }
}

export function PanelVentasResumen({
  monto,
  datos,
  dateFilter,
  includeVentaCrudo,
  ventasRestaurante = 0,
  ventasMostrador = 0,
  ordenesRestaurante = 0,
  ordenesMostrador = 0,
}: PanelVentasResumenProps) {
  const { modo, rangoInicio, rangoFin } = useMemo(
    () => calcularModoYRango(dateFilter),
    [dateFilter]
  );

  return (
    <View style={styles.panel}>
      {/* TARJETA CONTENEDORA DE VENTAS */}
      <View style={styles.splitCardsContainer}>
        {/* Tarjeta Restaurante (Icono tenedor y cuchillo) */}
        <View style={[styles.channelCard, styles.channelCardRestaurante]}>
          <View style={styles.channelHeader}>
            <View style={[styles.channelIconBadge, { backgroundColor: 'rgba(94, 208, 176, 0.2)' }]}>
              <Ionicons name="restaurant" size={20} color="#5ED0B0" />
            </View>
          </View>
          <Text style={styles.channelMonto}>${ventasRestaurante.toFixed(2)}</Text>
          <Text style={styles.channelSub}>
            {ordenesRestaurante}{' '}
            {ordenesRestaurante === 1 ? 'orden de restaurante' : 'órdenes de restaurante'}
          </Text>
        </View>

        {/* Tarjeta Mostrador (Icono casita / tienda de negocio) */}
        {includeVentaCrudo && (
          <View style={[styles.channelCard, styles.channelCardMostrador]}>
            <View style={styles.channelHeader}>
              <View
                style={[styles.channelIconBadge, { backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}
              >
                <Ionicons name="storefront" size={20} color="#38BDF8" />
              </View>
            </View>
            <Text style={styles.channelMonto}>${ventasMostrador.toFixed(2)}</Text>
            <Text style={styles.channelSub}>
              {ordenesMostrador}{' '}
              {ordenesMostrador === 1 ? 'orden de mostrador' : 'órdenes de mostrador'}
            </Text>
          </View>
        )}
      </View>

      {datos.length > 0 ? (
        <GraficaVentasTiempo
          data={datos}
          height={220}
          modo={modo}
          rangoInicio={rangoInicio}
          rangoFin={rangoFin}
        />
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
  splitCardsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  channelCard: {
    flex: 1,
    minWidth: 160,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  channelCardRestaurante: {
    backgroundColor: 'rgba(94, 208, 176, 0.08)',
    borderColor: 'rgba(94, 208, 176, 0.35)',
  },
  channelCardMostrador: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  channelIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelMonto: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  channelSub: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
