import { Fragment, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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

export type ModoGrafica = 'hora' | 'dia';

interface GraficaVentasTiempoProps {
  data: EventoVenta[];
  height?: number;
  /** 'hora' = eje X en horas (hoy/ayer), 'dia' = eje X en días (3 días/semana/mes) */
  modo?: ModoGrafica;
  /** Timestamp de inicio del rango (necesario para modo 'dia') */
  rangoInicio?: number;
  /** Timestamp de fin del rango (necesario para modo 'dia') */
  rangoFin?: number;
}

// --- Tipos internos ---

type PuntoGrafica = {
  indice: number;
  label: string;
  labelCorto: string;
  total: number;
  transacciones: number;
  x: number;
  y: number;
};

// --- Constantes ---

const HORAS_DEL_DIA = 24;
const DIVISIONES_VERTICAL = 5;
const ALTO_GRAFICA = 220;
const MARGEN_IZQUIERDO = 58;
const MARGEN_DERECHO = 18;
const MARGEN_SUPERIOR = 20;
const MARGEN_INFERIOR = 36;

// --- Utilidades de formato ---

function formatearMoneda(valor: number): string {
  return `$${Math.round(valor).toLocaleString('es-MX')}`;
}

function formatearHoraAmPm(hora: number): string {
  if (hora === 0) return '12 AM';
  if (hora < 12) return `${hora} AM`;
  if (hora === 12) return '12 PM';
  return `${hora - 12} PM`;
}

function formatearHoraDetalle(hora: number): string {
  if (hora === 0) return '12:00 AM';
  if (hora < 12) return `${hora}:00 AM`;
  if (hora === 12) return '12:00 PM';
  return `${hora - 12}:00 PM`;
}

const DIAS_SEMANA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatearDiaCorto(fecha: Date): string {
  return `${DIAS_SEMANA_CORTO[fecha.getDay()]} ${fecha.getDate()}`;
}

function formatearDiaDetalle(fecha: Date): string {
  return fecha.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

// --- Generación de curva Bézier ---

function generarCurvaOndaSinRebote(puntos: PuntoGrafica[], baseline: number): string {
  if (puntos.length === 0) return '';
  if (puntos.length === 1) return `M ${puntos[0].x},${puntos[0].y}`;

  let d = `M ${puntos[0].x.toFixed(1)},${puntos[0].y.toFixed(1)}`;

  for (let i = 0; i < puntos.length - 1; i++) {
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const dx = p2.x - p1.x;

    if (p1.total === 0 && p2.total === 0) {
      d += ` L ${p2.x.toFixed(1)},${baseline.toFixed(1)}`;
      continue;
    }

    if (p1.total === 0 && p2.total > 0) {
      const cp1x = p1.x + dx * 0.45;
      const cp1y = baseline;
      const cp2x = p2.x - dx * 0.35;
      const cp2y = p2.y;
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
      continue;
    }

    if (p1.total > 0 && p2.total === 0) {
      const cp1x = p1.x + dx * 0.35;
      const cp1y = p1.y;
      const cp2x = p2.x - dx * 0.45;
      const cp2y = baseline;
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${baseline.toFixed(1)}`;
      continue;
    }

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

// --- Lógica de agrupación por HORA (modo='hora') ---

function agruparPorHora(
  data: EventoVenta[],
  plotWidth: number,
  plotHeight: number,
  baseline: number
) {
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

  const puntos: PuntoGrafica[] = acumPorHora.map((item) => {
    const x = MARGEN_IZQUIERDO + item.hora * xPorHora;
    const y = baseline - item.total * yPorValor;
    return {
      indice: item.hora,
      label: formatearHoraDetalle(item.hora),
      labelCorto: formatearHoraAmPm(item.hora),
      total: item.total,
      transacciones: item.transacciones,
      x,
      y,
    };
  });

  // Marcas cada 4 horas
  const marcas = [4, 8, 12, 16, 20, 23];

  return { puntos, maximoEscala: escala, marcasIndices: marcas };
}

// --- Lógica de agrupación por DÍA (modo='dia') ---

function generarDiasDelRango(rangoInicio: number, rangoFin: number): Date[] {
  const dias: Date[] = [];
  const inicio = new Date(rangoInicio);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(rangoFin);
  fin.setHours(23, 59, 59, 999);

  const cursor = new Date(inicio);
  while (cursor <= fin) {
    dias.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

function claveYMD(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

function agruparPorDia(
  data: EventoVenta[],
  rangoInicio: number,
  rangoFin: number,
  plotWidth: number,
  plotHeight: number,
  baseline: number
) {
  const diasRango = generarDiasDelRango(rangoInicio, rangoFin);
  const totalDias = diasRango.length;

  // Bucket por día
  const acumPorDia: Record<string, { total: number; transacciones: number }> = {};
  for (const dia of diasRango) {
    acumPorDia[claveYMD(dia)] = { total: 0, transacciones: 0 };
  }

  (data || []).forEach((evento) => {
    const ts = Number(evento.timestamp);
    const total = Math.max(0, Number(evento.total) || 0);
    if (Number.isFinite(ts) && total > 0) {
      const fecha = new Date(ts);
      const clave = claveYMD(fecha);
      if (acumPorDia[clave]) {
        acumPorDia[clave].total += total;
        acumPorDia[clave].transacciones += 1;
      }
    }
  });

  const maxRaw = Math.max(100, ...Object.values(acumPorDia).map((d) => d.total));
  const magnitud = Math.pow(10, Math.floor(Math.log10(maxRaw)));
  const escala = Math.ceil(maxRaw / magnitud) * magnitud;

  const xPorDia = totalDias > 1 ? plotWidth / (totalDias - 1) : plotWidth;
  const yPorValor = plotHeight / escala;

  const puntos: PuntoGrafica[] = diasRango.map((dia, i) => {
    const clave = claveYMD(dia);
    const acum = acumPorDia[clave] || { total: 0, transacciones: 0 };
    const x = MARGEN_IZQUIERDO + i * xPorDia;
    const y = baseline - acum.total * yPorValor;

    return {
      indice: i,
      label: formatearDiaDetalle(dia),
      labelCorto: totalDias <= 7 ? formatearDiaCorto(dia) : String(dia.getDate()),
      total: acum.total,
      transacciones: acum.transacciones,
      x,
      y,
    };
  });

  // Marcas inteligentes según cantidad de días
  let marcas: number[];
  if (totalDias <= 7) {
    // Todos los días
    marcas = diasRango.map((_, i) => i);
  } else if (totalDias <= 14) {
    // Cada 2 días
    marcas = diasRango.map((_, i) => i).filter((i) => i % 2 === 0 || i === totalDias - 1);
  } else {
    // Mensual: cada 5 días + último
    marcas = diasRango.map((_, i) => i).filter((i) => i % 5 === 0 || i === totalDias - 1);
  }

  return { puntos, maximoEscala: escala, marcasIndices: marcas };
}

// --- Componente principal ---

export function GraficaVentasTiempo({
  data,
  height = ALTO_GRAFICA,
  modo = 'hora',
  rangoInicio,
  rangoFin,
}: GraficaVentasTiempoProps) {
  const { width } = useWindowDimensions();
  const { isElite } = useAppTheme();

  const accent = isElite ? '#5ED0B0' : '#3B82F6';
  const accentLight = isElite ? '#8CF1D4' : '#60A5FA';
  const pointFill = '#FCD34D';

  const chartWidth = Math.max(300, Math.min(960, width - 56));
  const plotWidth = chartWidth - MARGEN_IZQUIERDO - MARGEN_DERECHO;
  const plotHeight = Math.max(130, height - MARGEN_SUPERIOR - MARGEN_INFERIOR);
  const baseline = MARGEN_SUPERIOR + plotHeight;

  // Agrupar según modo
  const { puntos, maximoEscala, marcasIndices } = useMemo(() => {
    if (modo === 'dia' && rangoInicio != null && rangoFin != null) {
      return agruparPorDia(data, rangoInicio, rangoFin, plotWidth, plotHeight, baseline);
    }
    return agruparPorHora(data, plotWidth, plotHeight, baseline);
  }, [data, modo, rangoInicio, rangoFin, plotWidth, plotHeight, baseline]);

  // Selección interactiva
  const puntoMayor = useMemo(() => {
    const conVenta = puntos.filter((p) => p.total > 0);
    if (conVenta.length === 0) return null;
    return [...conVenta].sort((a, b) => b.total - a.total)[0];
  }, [puntos]);

  const [seleccionManual, setSeleccionManual] = useState<PuntoGrafica | null>(null);
  const puntoActivo = seleccionManual || puntoMayor;

  // Curva Bézier
  const linePath = useMemo(() => {
    return generarCurvaOndaSinRebote(puntos, baseline);
  }, [puntos, baseline]);

  const areaPath = useMemo(() => {
    if (!linePath) return '';
    const primerX = MARGEN_IZQUIERDO;
    const ultimoX = MARGEN_IZQUIERDO + plotWidth;
    return `${linePath} L ${ultimoX.toFixed(1)},${baseline.toFixed(1)} L ${primerX.toFixed(1)},${baseline.toFixed(1)} Z`;
  }, [linePath, plotWidth, baseline]);

  return (
    <View style={styles.contenedor}>
      {/* Badge / Tooltip superior */}
      <View style={styles.tooltipContenedor}>
        {puntoActivo && puntoActivo.total > 0 ? (
          <View style={[styles.badgeTooltip, { borderColor: accent }]}>
            <Text style={styles.badgeHora}>{puntoActivo.label}</Text>
            <Text style={styles.badgeSeparador}>•</Text>
            <Text style={[styles.badgeTotal, { color: accentLight }]}>
              {formatearMoneda(puntoActivo.total)}
            </Text>
            <Text style={styles.badgeTransacciones}>
              ({puntoActivo.transacciones} {puntoActivo.transacciones === 1 ? 'venta' : 'ventas'})
            </Text>
          </View>
        ) : (
          <Text style={styles.tooltipAyuda}>Tocá cualquier punto para ver el detalle</Text>
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

        {/* Línea guía vertical de la selección activa */}
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

        {/* Ticks del eje X */}
        {puntos.map((punto) => (
          <Line
            key={`tick-${punto.indice}`}
            x1={punto.x}
            y1={baseline}
            x2={punto.x}
            y2={baseline + (marcasIndices.includes(punto.indice) ? 6 : 3)}
            stroke={marcasIndices.includes(punto.indice) ? '#64748B' : 'rgba(100, 116, 139, 0.4)'}
            strokeWidth={marcasIndices.includes(punto.indice) ? 1.2 : 1}
          />
        ))}

        {/* Etiquetas del eje X */}
        {marcasIndices.map((idx) => {
          const punto = puntos[idx];
          if (!punto) return null;
          const esActivo = puntoActivo?.indice === idx;

          return (
            <SvgText
              key={`label-${idx}`}
              x={punto.x}
              y={baseline + 20}
              fill={esActivo ? accentLight : '#CBD5E1'}
              fontSize="12"
              fontWeight={esActivo ? '800' : '600'}
              textAnchor="middle"
            >
              {punto.labelCorto}
            </SvgText>
          );
        })}

        {/* Puntos interactivos sobre valores con ventas */}
        {puntos.map((punto) => {
          if (punto.total === 0) return null;
          const esActivo = puntoActivo?.indice === punto.indice;
          const interactProps =
            Platform.OS === 'web'
              ? ({ onClick: () => setSeleccionManual(punto) } as any)
              : { onPress: () => setSeleccionManual(punto) };

          return (
            <G key={`punto-${punto.indice}`} {...interactProps}>
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
