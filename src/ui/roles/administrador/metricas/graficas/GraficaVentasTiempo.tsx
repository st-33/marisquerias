import { Fragment, useMemo, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useAppTheme } from '../../../../../compartido/temas/ThemeContext';

interface EventoVenta {
  timestamp: number;
  total: number;
}

interface GraficaVentasTiempoProps {
  data: EventoVenta[];
  height?: number;
}

type PuntoHora = {
  hora: number;
  labelHora: string;
  total: number;
  transacciones: number;
  x: number;
  y: number;
};

const HORAS_DEL_DIA = 24;
const DIVISIONES_VERTICAL = 5;
const ALTO_GRAFICA = 220;
const MARGEN_IZQUIERDO = 58;
const MARGEN_DERECHO = 18;
const MARGEN_SUPERIOR = 20;
const MARGEN_INFERIOR = 36;

function formatearMoneda(valor: number): string {
  return `$${Math.round(valor).toLocaleString('es-MX')}`;
}

/**
 * Genera una curva suave tipo onda Bézier que NUNCA perfora hacia abajo
 * del baseline (elimina rebotes negativos o valles por debajo de 0).
 */
function generarCurvaOndaSinRebote(puntos: PuntoHora[], baseline: number): string {
  if (puntos.length === 0) return '';
  if (puntos.length === 1) return `M ${puntos[0].x},${puntos[0].y}`;

  let d = `M ${puntos[0].x.toFixed(1)},${puntos[0].y.toFixed(1)}`;

  for (let i = 0; i < puntos.length - 1; i++) {
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const dx = p2.x - p1.x;

    // Caso 1: Ambos están en cero -> línea plana exacta en el eje
    if (p1.total === 0 && p2.total === 0) {
      d += ` L ${p2.x.toFixed(1)},${baseline.toFixed(1)}`;
      continue;
    }

    // Caso 2: Sube desde cero hacia una venta -> despegue suave y tangente arriba
    if (p1.total === 0 && p2.total > 0) {
      const cp1x = p1.x + dx * 0.45;
      const cp1y = baseline;
      const cp2x = p2.x - dx * 0.35;
      const cp2y = p2.y;
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
      continue;
    }

    // Caso 3: Cae desde una venta hacia cero -> descenso suave y llegada tangente al suelo
    if (p1.total > 0 && p2.total === 0) {
      const cp1x = p1.x + dx * 0.35;
      const cp1y = p1.y;
      const cp2x = p2.x - dx * 0.45;
      const cp2y = baseline;
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${baseline.toFixed(1)}`;
      continue;
    }

    // Caso 4: Ambos tienen ventas -> onda suave entre picos sin descender del baseline
    const p0 = i > 0 ? puntos[i - 1] : p1;
    const p3 = i < puntos.length - 2 ? puntos[i + 2] : p2;

    const dy1 = (p2.y - p0.y) * 0.25;
    const dy2 = (p3.y - p1.y) * 0.25;

    const cp1x = p1.x + dx * 0.35;
    const cp1y = Math.min(baseline, Math.max(MARGEN_SUPERIOR, p1.y + dy1));
    const cp2x = p2.x - dx * 0.35;
    const cp2y = Math.min(baseline, Math.max(MARGEN_SUPERIOR, p2.y - dy2));

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return d;
}

export function GraficaVentasTiempo({ data, height = ALTO_GRAFICA }: GraficaVentasTiempoProps) {
  const { width } = useWindowDimensions();
  const { isElite } = useAppTheme();

  const accent = isElite ? '#5ED0B0' : '#3B82F6';
  const accentLight = isElite ? '#8CF1D4' : '#60A5FA';
  const pointFill = '#FCD34D';

  const chartWidth = Math.max(300, Math.min(960, width - 56));
  const plotWidth = chartWidth - MARGEN_IZQUIERDO - MARGEN_DERECHO;
  const plotHeight = Math.max(130, height - MARGEN_SUPERIOR - MARGEN_INFERIOR);
  const baseline = MARGEN_SUPERIOR + plotHeight;

  // 1. Agrupar ventas por cada hora del día (0..23)
  const { puntosPorHora, maximoEscala } = useMemo(() => {
    const acumPorHora = Array.from({ length: HORAS_DEL_DIA }, (_, h) => ({
      hora: h,
      total: 0,
      transacciones: 0,
    }));

    (data || []).forEach((evento) => {
      const ts = Number(evento.timestamp);
      const total = Math.max(0, Number(evento.total) || 0);
      if (Number.isFinite(ts) && total > 0) {
        const h = new Date(ts).getHours();
        if (h >= 0 && h < HORAS_DEL_DIA) {
          acumPorHora[h].total += total;
          acumPorHora[h].transacciones += 1;
        }
      }
    });

    const maxRaw = Math.max(100, ...acumPorHora.map((item) => item.total));
    const magnitud = Math.pow(10, Math.floor(Math.log10(maxRaw)));
    const escala = Math.ceil(maxRaw / magnitud) * magnitud;

    const xPorHora = plotWidth / (HORAS_DEL_DIA - 1);
    const yPorValor = plotHeight / escala;

    const puntos: PuntoHora[] = acumPorHora.map((item) => {
      const x = MARGEN_IZQUIERDO + item.hora * xPorHora;
      const y = baseline - item.total * yPorValor;
      const labelHora = `${String(item.hora).padStart(2, '0')}:00`;
      return {
        ...item,
        labelHora,
        x,
        y,
      };
    });

    return {
      puntosPorHora: puntos,
      maximoEscala: escala,
    };
  }, [data, plotWidth, plotHeight, baseline]);

  // Selección interactiva
  const puntoMayor = useMemo(() => {
    const conVenta = puntosPorHora.filter((p) => p.total > 0);
    if (conVenta.length === 0) return null;
    return [...conVenta].sort((a, b) => b.total - a.total)[0];
  }, [puntosPorHora]);

  const [seleccionManual, setSeleccionManual] = useState<PuntoHora | null>(null);
  const puntoActivo = seleccionManual || puntoMayor;

  // Curvas de onda garantizadas sin descensos por debajo del baseline
  const linePath = useMemo(() => {
    return generarCurvaOndaSinRebote(puntosPorHora, baseline);
  }, [puntosPorHora, baseline]);

  const areaPath = useMemo(() => {
    if (!linePath) return '';
    const primerX = MARGEN_IZQUIERDO;
    const ultimoX = MARGEN_IZQUIERDO + plotWidth;
    return `${linePath} L ${ultimoX.toFixed(1)},${baseline.toFixed(1)} L ${primerX.toFixed(1)},${baseline.toFixed(1)} Z`;
  }, [linePath, plotWidth, baseline]);

  // Etiquetas horarias clave (horario diurno/comercial sin repetir 00:00 en la esquina)
  // El 0 en el origen representa tanto el 0 del dinero como el inicio del tiempo.
  const marcasHorarias = [4, 8, 12, 16, 20];

  return (
    <View style={styles.contenedor}>
      {/* Badge / Tooltip superior */}
      <View style={styles.tooltipContenedor}>
        {puntoActivo && puntoActivo.total > 0 ? (
          <View style={[styles.badgeTooltip, { borderColor: accent }]}>
            <Text style={styles.badgeHora}>{puntoActivo.labelHora} hrs</Text>
            <Text style={styles.badgeSeparador}>•</Text>
            <Text style={[styles.badgeTotal, { color: accentLight }]}>
              {formatearMoneda(puntoActivo.total)}
            </Text>
            <Text style={styles.badgeTransacciones}>
              ({puntoActivo.transacciones} {puntoActivo.transacciones === 1 ? 'venta' : 'ventas'})
            </Text>
          </View>
        ) : (
          <Text style={styles.tooltipAyuda}>Tocá cualquier punto para ver el monto y la hora</Text>
        )}
      </View>

      <Svg width={chartWidth} height={height}>
        <Defs>
          <LinearGradient id="gradienteOndaVentas" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={accent} stopOpacity={0.4} />
            <Stop offset="75%" stopColor={accent} stopOpacity={0.08} />
            <Stop offset="100%" stopColor={accent} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>

        {/* Guías horizontales del eje Y */}
        {Array.from({ length: DIVISIONES_VERTICAL + 1 }, (_, index) => {
          const y = baseline - (plotHeight / DIVISIONES_VERTICAL) * index;
          const valor = (maximoEscala / DIVISIONES_VERTICAL) * index;
          const esOrigen = index === 0;

          return (
            <Fragment key={`guia-y-${index}`}>
              <Line
                x1={MARGEN_IZQUIERDO}
                y1={y}
                x2={MARGEN_IZQUIERDO + plotWidth}
                y2={y}
                stroke={esOrigen ? accent : 'rgba(148, 163, 184, 0.16)'}
                strokeDasharray={esOrigen ? undefined : '3 5'}
                strokeWidth={esOrigen ? 1.8 : 1}
              />
              {/* En la esquina sólo un 0 compartido; arriba montos formateados */}
              <SvgText
                x={MARGEN_IZQUIERDO - 10}
                y={y + 4}
                fill={esOrigen ? '#CBD5E1' : '#94A3B8'}
                fontSize={esOrigen ? '13' : '11'}
                fontWeight={esOrigen ? '800' : '600'}
                textAnchor="end"
              >
                {esOrigen ? '0' : formatearMoneda(valor)}
              </SvgText>
            </Fragment>
          );
        })}

        {/* Eje vertical Y principal */}
        <Line
          x1={MARGEN_IZQUIERDO}
          y1={MARGEN_SUPERIOR}
          x2={MARGEN_IZQUIERDO}
          y2={baseline}
          stroke={accent}
          strokeWidth={1.8}
        />

        {/* Área suave con gradiente */}
        {areaPath ? <Path d={areaPath} fill="url(#gradienteOndaVentas)" stroke="none" /> : null}

        {/* Curva suave tipo onda */}
        {linePath ? (
          <Path
            d={linePath}
            fill="none"
            stroke={accent}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Línea guía vertical de la hora seleccionada */}
        {puntoActivo ? (
          <Line
            x1={puntoActivo.x}
            y1={MARGEN_SUPERIOR}
            x2={puntoActivo.x}
            y2={baseline}
            stroke={accentLight}
            strokeWidth={1.4}
            strokeDasharray="4 4"
            opacity={0.8}
          />
        ) : null}

        {/* Eje X: marcas y horas con tipografía clara y legible */}
        {marcasHorarias.map((hora) => {
          const punto = puntosPorHora[hora];
          if (!punto) return null;
          const esActivo = puntoActivo?.hora === hora;

          return (
            <Fragment key={`eje-x-${hora}`}>
              <Line
                x1={punto.x}
                y1={baseline}
                x2={punto.x}
                y2={baseline + 6}
                stroke="#64748B"
                strokeWidth={1.2}
              />
              <SvgText
                x={punto.x}
                y={baseline + 20}
                fill={esActivo ? accentLight : '#CBD5E1'}
                fontSize="12"
                fontWeight={esActivo ? '800' : '600'}
                textAnchor="middle"
              >
                {punto.labelHora}
              </SvgText>
            </Fragment>
          );
        })}

        {/* Puntos interactivos sobre las horas con ventas */}
        {puntosPorHora.map((punto) => {
          if (punto.total === 0) return null;
          const esActivo = puntoActivo?.hora === punto.hora;

          return (
            <G key={`punto-${punto.hora}`} onPress={() => setSeleccionManual(punto)}>
              {/* Área de toque amplia */}
              <Circle cx={punto.x} cy={punto.y} r={22} fill="transparent" />

              {/* Halo pulsante si está activo */}
              {esActivo ? (
                <Circle
                  cx={punto.x}
                  cy={punto.y}
                  r={12}
                  fill={accent}
                  fillOpacity={0.28}
                  stroke={accent}
                  strokeWidth={2}
                />
              ) : null}

              {/* Punto central */}
              <Circle
                cx={punto.x}
                cy={punto.y}
                r={esActivo ? 6 : 4.5}
                fill={pointFill}
                stroke={accent}
                strokeWidth={2}
              />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  tooltipContenedor: {
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeTooltip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  badgeHora: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  badgeSeparador: {
    color: '#64748B',
    fontSize: 13,
  },
  badgeTotal: {
    fontSize: 14,
    fontWeight: '900',
  },
  badgeTransacciones: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  tooltipAyuda: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
