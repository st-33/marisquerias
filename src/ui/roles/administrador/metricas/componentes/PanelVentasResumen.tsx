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

const TITULO_POR_FILTRO: Record<DateFilter, string> = {
  hoy: 'Registro de Ventas — Hoy',
  ayer: 'Registro de Ventas — Ayer',
  hace3dias: 'Registro de Ventas — Últimos 3 días',
  semana: 'Registro de Ventas — Semana',
  mes: 'Registro de Ventas — Mes',
  todo: 'Registro de Ventas — Histórico',
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
  const titulo = TITULO_POR_FILTRO[dateFilter] || 'Registro de Ventas';
  const { modo, rangoInicio, rangoFin } = useMemo(
    () => calcularModoYRango(dateFilter),
    [dateFilter]
  );

  return (
    <View style={styles.panel}>
      {includeVentaCrudo ? (
        <>
          <View style={styles.encabezado}>
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo}>{titulo}</Text>
              <Text style={styles.totalConsolidado}>Total Consolidado: {monto}</Text>
            </View>
            <View style={styles.indicador}>
              <Ionicons name="trending-up" size={22} color="#5ED0B0" />
            </View>
          </View>

          <View style={styles.splitCardsContainer}>
            {/* Tarjeta Restaurante */}
            <View style={[styles.channelCard, styles.channelCardRestaurante]}>
              <View style={styles.channelHeader}>
                <View style={[styles.channelIconBadge, { backgroundColor: 'rgba(94, 208, 176, 0.2)' }]}>
                  <Ionicons name="restaurant" size={16} color="#5ED0B0" />
                </View>
                <Text style={[styles.channelTitle, { color: '#5ED0B0' }]}>Restaurante</Text>
              </View>
              <Text style={styles.channelMonto}>${ventasRestaurante.toFixed(2)}</Text>
              <Text style={styles.channelSub}>
                {ordenesRestaurante} {ordenesRestaurante === 1 ? 'orden' : 'órdenes'}
              </Text>
            </View>

            {/* Tarjeta Mostrador */}
            <View style={[styles.channelCard, styles.channelCardMostrador]}>
              <View style={styles.channelHeader}>
                <View style={[styles.channelIconBadge, { backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
                  <Ionicons name="storefront" size={16} color="#38BDF8" />
                </View>
                <Text style={[styles.channelTitle, { color: '#38BDF8' }]}>Mostrador (Crudo)</Text>
              </View>
              <Text style={styles.channelMonto}>${ventasMostrador.toFixed(2)}</Text>
              <Text style={styles.channelSub}>
                {ordenesMostrador} {ordenesMostrador === 1 ? 'orden' : 'órdenes'}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.encabezado}>
          <View style={{ flex: 1 }}>
            <Text style={styles.titulo}>{titulo} — Restaurante</Text>
            <Text style={styles.monto}>${ventasRestaurante.toFixed(2)}</Text>
            <Text style={styles.channelSubRestauranteOnly}>
              {ordenesRestaurante} {ordenesRestaurante === 1 ? 'orden de restaurante' : 'órdenes de restaurante'}
            </Text>
          </View>
          <View style={styles.indicador}>
            <Ionicons name="restaurant" size={24} color="#5ED0B0" />
          </View>
        </View>
      )}

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
  encabezado: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titulo: {
    color: '#F4F0E8',
    fontSize: 14,
    fontWeight: '700',
  },
  totalConsolidado: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  monto: {
    color: '#F8FAFC',
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 44,
  },
  channelSubRestauranteOnly: {
    color: '#5ED0B0',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  indicador: {
    alignItems: 'flex-end',
    gap: 6,
  },
  splitCardsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  channelCard: {
    flex: 1,
    minWidth: 200,
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
    marginBottom: 8,
  },
  channelIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  channelMonto: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  channelSub: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});
