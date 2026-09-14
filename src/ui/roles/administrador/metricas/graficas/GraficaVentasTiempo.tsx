import { Fragment, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { useAppTheme } from '../../../../../compartido/temas/ThemeContext';

interface EventoVenta {
  timestamp: number;
  total: number;
}

interface GraficaVentasTiempoProps {
  data: EventoVenta[];
  height?: number;
}

type PuntoGrafica = {
  x: number;
  y: number;
  evento: boolean;
  total: number;
};

const HORAS_DEL_DIA = 24;
const DIVISIONES_VERTICAL = 5;
const ALTO_GRAFICA = 190;
const MARGEN_IZQUIERDO = 46;
const MARGEN_DERECHO = 10;
const MARGEN_SUPERIOR = 12;
const MARGEN_INFERIOR = 30;

function formatearMoneda(valor: number): string {
  return `$${valor.toFixed(0)}`;
}

function horaDelEvento(timestamp: number): number {
  const fecha = new Date(timestamp);
  return fecha.getHours() + fecha.getMinutes() / 60 + fecha.getSeconds() / 3600;
}

export function GraficaVentasTiempo({ data, height = ALTO_GRAFICA }: GraficaVentasTiempoProps) {
  const { width } = useWindowDimensions();
  const { isElite } = useAppTheme();
  const accent = isElite ? '#5ED0B0' : '#3B82F6';
  const accentStart = isElite ? '#3C90DA' : '#2563EB';
  const chartWidth = Math.max(280, Math.min(900, width - 86));
  const plotWidth = chartWidth - MARGEN_IZQUIERDO - MARGEN_DERECHO;
  const plotHeight = Math.max(130, height - MARGEN_SUPERIOR - MARGEN_INFERIOR);
  const baseline = MARGEN_SUPERIOR + plotHeight;

  const eventos = useMemo(
    () =>
      data
        .map((evento) => ({
          timestamp: Number(evento.timestamp),
          total: Math.max(0, Number(evento.total) || 0),
        }))
        .filter((evento) => Number.isFinite(evento.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp),
    [data]
  );
  const maximo = Math.max(1, ...eventos.map((evento) => evento.total));
  const valorPorDivision = maximo / DIVISIONES_VERTICAL;
  const xPorHora = plotWidth / HORAS_DEL_DIA;
  const yPorValor = plotHeight / maximo;

  const puntos = useMemo<PuntoGrafica[]>(() => {
    const puntosResultado: PuntoGrafica[] = [];
    for (let hora = 0; hora < HORAS_DEL_DIA; hora += 1) {
      const eventosDeHora = eventos.filter((evento) => {
        const horaEvento = horaDelEvento(evento.timestamp);
        return horaEvento >= hora && horaEvento < hora + 1;
      });
      puntosResultado.push({ x: hora * xPorHora, y: baseline, evento: false, total: 0 });
      eventosDeHora.forEach((evento) => {
        const horaEvento = horaDelEvento(evento.timestamp);
        puntosResultado.push({
          x: horaEvento * xPorHora,
          y: baseline - evento.total * yPorValor,
          evento: true,
          total: evento.total,
        });
      });
      puntosResultado.push({
        x: (hora + 1) * xPorHora,
        y: baseline,
        evento: false,
        total: 0,
      });
    }
    return puntosResultado;
  }, [baseline, eventos, xPorHora, yPorValor]);

  const path = puntos
    .map((punto, index) => `${index === 0 ? 'M' : 'L'} ${MARGEN_IZQUIERDO + punto.x},${punto.y}`)
    .join(' ');
  const areaPath = `${path} L ${MARGEN_IZQUIERDO + plotWidth},${baseline} L ${MARGEN_IZQUIERDO},${baseline} Z`;

  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={height}>
        {Array.from({ length: DIVISIONES_VERTICAL + 1 }, (_, index) => {
          const y = baseline - (plotHeight / DIVISIONES_VERTICAL) * index;
          const valor = valorPorDivision * index;
          return (
            <Fragment key={`guide-${index}`}>
              <Line
                x1={MARGEN_IZQUIERDO}
                y1={y}
                x2={MARGEN_IZQUIERDO + plotWidth}
                y2={y}
                stroke={index === 0 ? accent : 'rgba(227,232,242,0.18)'}
                strokeDasharray={index === 0 ? undefined : '4 7'}
                strokeWidth={index === 0 ? 1.5 : 1}
              />
              <SvgText
                x={MARGEN_IZQUIERDO - 8}
                y={y + 3}
                fill="#93A0B4"
                fontSize="9"
                textAnchor="end"
              >
                {formatearMoneda(valor)}
              </SvgText>
            </Fragment>
          );
        })}
        <Line
          x1={MARGEN_IZQUIERDO}
          y1={MARGEN_SUPERIOR}
          x2={MARGEN_IZQUIERDO}
          y2={baseline}
          stroke={accent}
          strokeWidth={1.5}
        />
        <Path d={areaPath} fill={accentStart} fillOpacity={0.16} stroke="none" />
        <Path d={path} fill="none" stroke={accent} strokeWidth={2.5} strokeLinejoin="round" />
        {puntos
          .filter((punto) => punto.evento)
          .map((punto, index) => (
            <Circle
              key={`sale-${index}-${punto.x}`}
              cx={MARGEN_IZQUIERDO + punto.x}
              cy={punto.y}
              r={4}
              fill="#F6D266"
              stroke={accent}
              strokeWidth={2}
            />
          ))}
        {Array.from({ length: HORAS_DEL_DIA + 1 }, (_, hora) => {
          const x = MARGEN_IZQUIERDO + hora * xPorHora;
          return (
            <Fragment key={`hour-${hora}`}>
              <Line
                x1={x}
                y1={baseline}
                x2={x}
                y2={baseline + 4}
                stroke="#93A0B4"
                strokeWidth={1}
              />
            </Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
});
