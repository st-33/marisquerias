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
      <View style={styles.encabezado}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>{titulo}</Text>
          <Text style={styles.monto}>{monto}</Text>
          {includeVentaCrudo ? (
            <View style={styles.breakdownContainer}>
              <View style={styles.breakdownPill}>
                <Ionicons name="restaurant-outline" size={13} color="#5ED0B0" />
                <Text style={styles.breakdownLabel}>Restaurante:</Text>
                <Text style={styles.breakdownValue}>
                  ${ventasRestaurante.toFixed(2)} ({ordenesRestaurante})
                </Text>
              </View>
              <View style={styles.breakdownPill}>
                <Ionicons name="scale-outline" size={13} color="#38BDF8" />
                <Text style={styles.breakdownLabel}>Mostrador (Crudo):</Text>
                <Text style={styles.breakdownValue}>
                  ${ventasMostrador.toFixed(2)} ({ordenesMostrador})
                </Text>
              </View>
            </View>
          ) : null}
        </View>
        <View style={styles.indicador}>
          <Ionicons name="trending-up" size={22} color="#5ED0B0" />
        </View>
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
  breakdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  breakdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  breakdownLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  breakdownValue: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
});
