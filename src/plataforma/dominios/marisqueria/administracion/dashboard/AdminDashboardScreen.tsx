/**
 * 📊 MÉTRICAS Y DATOS SCREEN (Admin Dashboard)
 * Componente visual para alimentos y bebidas
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { SalesLineChart } from '../../../../../compartido/componentes/charts/SalesLineChart';
import { AdminLayout } from '../../../../../compartido/componentes/layouts/AdminLayout';
import { useAppTheme } from '../../../../../compartido/temas';
import { getRtdb } from '../../../../core/firebase';
import { useStore } from '../../../../core/store';
import { useNotifications } from '../../../../../compartido/hooks/useNotifications';
import { useStoreNotifications } from '../../../../../compartido/hooks/useStoreNotifications';
import { logger } from '../../../../../compartido/utils/logger';
import {
  useAlertasInteligentes,
  usePrediccionStock,
  usePuenteAccionesFlotantes,
} from '../../../alimentos_y_bebidas';
import { useAdminLogic } from './useAdminLogic';
import type { FabItem } from '../../../../core/types/contratos';
import {
  AdminActionButton,
  AdminMetricTile,
  AdminSectionHeading,
  AdminStatusPill,
  AdminSurface,
} from '../ui/AdminPrimitives';

const chartPalette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];

type FinancialDataPoint = {
  label: string;
  ventaTotal: number;
  costo: number;
  ganancia: number;
  ordenes: number;
};

type InlineTrendChartProps = {
  data: FinancialDataPoint[];
  color: string;
};

type DistributionDatum = { label: string; value: number };

type TopProductDatum = { id: string; nombre: string; ventas: number; monto?: number };

function DistributionDonut({ data, palette }: { data: DistributionDatum[]; palette: string[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let consumed = 0;

  return (
    <View style={styles.distributionWrap}>
      <View style={styles.donutStage}>
        <Svg width={144} height={144} viewBox="0 0 144 144">
          <G rotation="-90" origin="72,72">
            {data.map((item, index) => {
              const segment = total > 0 ? (item.value / total) * circumference : 0;
              const offset = consumed;
              consumed += segment;
              return (
                <Circle
                  key={`${item.label}-${index}`}
                  cx="72"
                  cy="72"
                  r={radius}
                  fill="none"
                  stroke={palette[index % palette.length]}
                  strokeWidth="18"
                  strokeDasharray={`${segment} ${circumference - segment}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  onPress={() => setSelectedIndex(index)}
                />
              );
            })}
          </G>
        </Svg>
        <View style={styles.donutCenter}>
          <Text style={styles.donutCenterValue}>{`$${(data[selectedIndex]?.value || 0).toFixed(0)}`}</Text>
          <Text style={styles.donutCenterLabel}>{data[selectedIndex]?.label || 'Sin datos'}</Text>
        </View>
      </View>
      <View style={styles.distributionLegend}>
        {data.map((item, index) => (
          <Pressable
            key={`${item.label}-legend-${index}`}
            onPress={() => setSelectedIndex(index)}
            style={[styles.distributionLegendItem, selectedIndex === index && styles.distributionLegendActive]}
          >
            <View style={[styles.financialLegendDot, { backgroundColor: palette[index % palette.length] }]} />
            <Text style={styles.distributionLegendLabel} numberOfLines={1}>{item.label}</Text>
            <Text style={styles.distributionLegendValue}>{`$${item.value.toFixed(0)}`}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TopProductsList({ data, color }: { data: TopProductDatum[]; color: string }) {
  const max = Math.max(...data.map((item) => item.ventas), 1);
  return (
    <View style={styles.topProductsList}>
      {data.map((item, index) => (
        <View key={item.id || `${item.nombre}-${index}`} style={styles.topProductRow}>
          <View style={styles.topProductMeta}>
            <Text style={styles.topProductName} numberOfLines={1}>{item.nombre}</Text>
            <Text style={styles.topProductAmount}>{`${item.ventas} u · $${(item.monto || 0).toFixed(2)}`}</Text>
          </View>
          <View style={styles.topProductTrack}>
            <View style={[styles.topProductFill, { width: `${Math.max(8, (item.ventas / max) * 100)}%`, backgroundColor: color }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function InlineTrendChart({ data, color }: InlineTrendChartProps) {
  const [selectedIndex, setSelectedIndex] = useState(() =>
    Math.max(0, data.findIndex((point) => point.ventaTotal > 0))
  );
  const selected = data[selectedIndex] || data[0] || {
    label: '—',
    ventaTotal: 0,
    costo: 0,
    ganancia: 0,
    ordenes: 0,
  };
  const maxValue = Math.max(...data.map((point) => Math.max(point.ventaTotal, point.costo)), 1);

  return (
    <Animated.View entering={FadeInDown.duration(420)} style={styles.inlineChart} accessibilityLabel="Gráfica financiera de ventas">
      <View style={styles.financialLegendRow}>
        <View style={styles.financialLegendItem}>
          <View style={[styles.financialLegendDot, { backgroundColor: color }]} />
          <Text style={styles.financialLegendText}>Venta total</Text>
        </View>
        <View style={styles.financialLegendItem}>
          <View style={[styles.financialLegendDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.financialLegendText}>Costo / inversión</Text>
        </View>
        <Text style={styles.financialHint}>Pulsa una franja</Text>
      </View>

      <View style={styles.inlineBars}>
        {data.map((point, index) => {
          const ventaHeight = Math.max(5, (point.ventaTotal / maxValue) * 100);
          const costoHeight = Math.max(3, (point.costo / maxValue) * 100);
          const active = selectedIndex === index;
          return (
            <Pressable
              key={`${point.label}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Desglose financiero ${point.label}`}
              onPress={() => setSelectedIndex(index)}
              style={[styles.inlineBarColumn, active && styles.inlineBarColumnActive]}
            >
              <Animated.View entering={FadeInDown.delay(index * 22).duration(260)} style={styles.barStack}>
                <View style={[styles.inlineBar, { height: `${ventaHeight}%`, backgroundColor: color }]} />
                <View style={[styles.inlineCostBar, { height: `${costoHeight}%` }]} />
              </Animated.View>
              <Text style={[styles.inlineBarLabel, active && styles.inlineBarLabelActive]} numberOfLines={1}>
                {point.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.chartTooltip}>
        <View>
          <Text style={styles.tooltipEyebrow}>Desglose de {selected.label}</Text>
          <Text style={styles.tooltipOrders}>{selected.ordenes} {selected.ordenes === 1 ? 'orden' : 'órdenes'} cobradas</Text>
        </View>
        <View style={styles.tooltipFinancials}>
          <View><Text style={styles.tooltipLabel}>Venta total</Text><Text style={[styles.tooltipValue, { color }]}>{`$${selected.ventaTotal.toFixed(2)}`}</Text></View>
          <View><Text style={styles.tooltipLabel}>Costo</Text><Text style={[styles.tooltipValue, { color: '#f59e0b' }]}>{`$${selected.costo.toFixed(2)}`}</Text></View>
          <View><Text style={styles.tooltipLabel}>Ganancia neta</Text><Text style={[styles.tooltipValue, { color: selected.ganancia >= 0 ? '#10b981' : '#ef4444' }]}>{`$${selected.ganancia.toFixed(2)}`}</Text></View>
        </View>
      </View>
    </Animated.View>
  );
}

export function AdminDashboardScreen() {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const isMobile = width < 480;
  const isTablet = width >= 480 && width < 900;
  const isDesktop = width >= 900;

  const contentMaxWidth = isDesktop ? 1200 : undefined;
  const metricCardWidth = isMobile ? '100%' : '48%';
  const predictionCardWidth = isMobile ? '100%' : isTablet ? '48%' : '32%';

  const tenantPath = useStore((s) => s.sesion.tenantPath) || '';
  const ds = useStore((s: any) => s.dataSources);
  const db = useMemo(() => getRtdb(ds?.operacionUrl || undefined), [ds]);

  // 🔔 Sistema de notificaciones (solo audio en admin)
  const { notify } = useNotifications();

  // 👂 Detectar cambios en store (sin crear listeners adicionales)
  useStoreNotifications({
    enabled: true,
    onNotification: React.useCallback(
      ({ mesaId, type }) => {
        logger.debug('[admin/metricas]', '🔔 Notificación', { mesaId, type });
        notify({ type, mesaId }, 'admin');
      },
      [notify]
    ),
  });

  // 🧠 CEREBRO: Hook de lógica pura
  const { metrics, loading, actions, features, dateFilter } = useAdminLogic({ db, tenantPath });
  const { predicciones, loading: loadingPredicciones } = usePrediccionStock();
  const { alertasCriticas, alertasMedias, alertasBajas, tieneAlertas } = useAlertasInteligentes();

  const fabFeatureSignature = [
    features?.admin_dashboard !== false,
    features?.admin_menu !== false,
    features?.admin_inventory !== false,
    features?.admin_tables !== false,
    features?.admin_devices !== false,
    features?.admin_repart !== false,
  ].join('|');

  const navItems = useMemo<FabItem[]>(() => {
    const items: FabItem[] = [];

    if (features?.admin_dashboard !== false) {
      items.push({
        key: 'metricas-home',
        label: 'Métricas',
        icon: <Ionicons name="stats-chart" size={26} color="white" />,
        onPress: () => {},
      });
    }

    if (features?.admin_menu !== false) {
      items.push({
        key: 'menu',
        label: 'Menú',
        icon: <Ionicons name="restaurant" size={24} color="white" />,
        onPress: () => router.push('/_role/admin/menu'),
      });
    }

    if (features?.admin_inventory !== false) {
      items.push({
        key: 'inventory',
        label: 'Inventario',
        icon: <Ionicons name="cube" size={20} color="white" />,
        onPress: () => router.push('/_role/admin/inventory'),
      });
    }

    if (features?.admin_tables !== false) {
      items.push({
        key: 'tables',
        label: 'Mesas',
        icon: <Ionicons name="grid" size={20} color="white" />,
        onPress: () => router.push('/_role/admin/tables'),
      });
    }

    if (features?.admin_devices !== false) {
      items.push({
        key: 'devices',
        label: 'Dispositivos',
        icon: <Ionicons name="hardware-chip" size={20} color="white" />,
        onPress: () => router.push('/_role/admin/devices'),
      });
    }

    if (features?.admin_repart !== false) {
      items.push({
        key: 'repart',
        label: 'ADI Repart',
        icon: <Ionicons name="car" size={20} color="white" />,
        onPress: () => router.push('/_role/admin/repart'),
      });
    }

    return items.length > 0
      ? items
      : [
          {
            key: 'metricas-default',
            label: 'Métricas',
            icon: <Ionicons name="stats-chart" size={24} color="white" />,
            onPress: () => {},
            enabled: false,
          },
        ];
  }, [fabFeatureSignature]);

  const fabConfig = useMemo(
    () => ({
      items: navItems,
      initialKey: navItems[0]?.key ?? null,
      position: 'bottom-right' as const,
    }),
    [navItems]
  );

  usePuenteAccionesFlotantes(fabConfig);

  if (loading || !metrics) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando métricas...</Text>
        </View>
      </View>
    );
  }

  return (
    <AdminLayout>
      <View style={styles.container}>
        <View
          style={[
            styles.header,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
            isMobile && styles.headerMobile,
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="stats-chart" size={21} color={colors.primary} />
            </View>
            <View style={styles.headerMeta}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>Centro de control</Text>
              <Text style={[styles.title, { color: colors.text }]}>Métricas y datos</Text>
            </View>
            <AdminStatusPill label="Operativo" tone="success" icon="pulse-outline" />
          </View>
          <View style={[styles.headerRight, isMobile && styles.headerRightMobile]}>
            {isMobile ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                style={styles.filterRowScroll}
              >
                {[
                  { key: 'hoy', label: 'Hoy' },
                  { key: 'ayer', label: 'Ayer' },
                  { key: 'hace3dias', label: '3 días' },
                  { key: 'semana', label: 'Semana' },
                  { key: 'mes', label: 'Mes' },
                ].map((filter) => (
                  <Pressable
                    key={filter.key}
                    onPress={() => actions.setDateFilter(filter.key as any)}
                    style={[styles.filterBtn, dateFilter === filter.key && styles.filterBtnActive]}
                  >
                    <Text
                      style={[
                        styles.filterBtnText,
                        dateFilter === filter.key && styles.filterBtnTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.filterRow}>
                {[
                  { key: 'hoy', label: 'Hoy' },
                  { key: 'ayer', label: 'Ayer' },
                  { key: 'hace3dias', label: '3 días' },
                  { key: 'semana', label: 'Semana' },
                  { key: 'mes', label: 'Mes' },
                ].map((filter) => (
                  <Pressable
                    key={filter.key}
                    onPress={() => actions.setDateFilter(filter.key as any)}
                    style={[styles.filterBtn, dateFilter === filter.key && styles.filterBtnActive]}
                  >
                    <Text
                      style={[
                        styles.filterBtnText,
                        dateFilter === filter.key && styles.filterBtnTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            <AdminActionButton
              label="Actualizar"
              icon="refresh"
              onPress={actions.refreshMetrics}
            />
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            isDesktop && contentMaxWidth
              ? { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }
              : null,
          ]}
        >
          {/* Métrica principal - Ventas filtradas */}
          <AdminSurface style={styles.mainMetricCard} accent={colors.primary}>
            <AdminSectionHeading
              eyebrow="Rendimiento"
              title={
                dateFilter === 'hoy'
                  ? 'Ventas de hoy'
                  : dateFilter === 'ayer'
                  ? 'Ventas de ayer'
                  : dateFilter === 'hace3dias'
                  ? 'Ventas de los últimos 3 días'
                  : dateFilter === 'semana'
                  ? 'Ventas de esta semana'
                  : 'Ventas de este mes'
              }
              subtitle="Lectura rápida del periodo seleccionado"
              icon="trending-up"
              action={<AdminStatusPill label="Periodo activo" tone="accent" />}
            />
            <Text style={[styles.mainMetricValue, { color: colors.text }]}>
              ${(metrics?.vendedorHero?.ventasHero ?? metrics?.ventasFiltradas ?? 0).toFixed(2)}
            </Text>
            <Text style={[styles.mainMetricSubtitle, { color: colors.primary }]}>
              {metrics?.vendedorHero?.subpedidosCountHero ?? metrics?.ordenesFiltradas ?? 0}{' '}
              subpedidos finalizados
            </Text>
          </AdminSurface>

          {/* Grid de métricas secundarias */}
          <View style={styles.metricsGrid}>
            <AdminMetricTile
              title="Promedio por pedido"
              value={`$${(metrics?.ticketPromedio ?? 0).toFixed(2)}`}
              subtitle="Ticket promedio acumulado"
              icon="receipt-outline"
              color={colors.primary}
              style={{ width: metricCardWidth }}
            />
            <AdminMetricTile
              title="Costo de insumos"
              value={`$${(metrics?.costoTotal ?? 0).toFixed(2)}`}
              subtitle="Inversión del periodo"
              icon="wallet-outline"
              color={colors.warning}
              style={{ width: metricCardWidth }}
            />
            <AdminMetricTile
              title="Ganancia neta"
              value={`$${(metrics?.gananciaNeta ?? 0).toFixed(2)}`}
              subtitle="Venta menos costo"
              icon="trending-up-outline"
              color={metrics?.gananciaNeta >= 0 ? colors.success : colors.danger}
              style={{ width: metricCardWidth }}
            />
            <AdminMetricTile
              title="Vendedor estrella"
              value={metrics?.vendedorEstrella?.nombre ?? 'Sin ventas'}
              subtitle={`$${(metrics?.vendedorEstrella?.monto ?? 0).toFixed(2)} · ${
                metrics?.vendedorEstrella?.subpedidos ?? 0
              } subpedidos`}
              icon="trophy-outline"
              color={colors.warning}
              style={{ width: metricCardWidth }}
            />
            <AdminMetricTile
              title="Platillo más vendido"
              value={metrics?.platilloMasVendido?.nombre ?? 'Sin ventas'}
              subtitle={`${metrics?.platilloMasVendido?.cantidad ?? 0} unidades vendidas`}
              icon="flame-outline"
              color={colors.danger}
              style={{ width: metricCardWidth }}
            />
            <AdminMetricTile
              title="Hora pico de ventas"
              value={metrics?.horaPico?.hora ?? 'N/A'}
              subtitle={`${metrics?.horaPico?.pedidos ?? 0} pedidos en esta hora`}
              icon="time-outline"
              color="#8b5cf6"
              style={{ width: metricCardWidth }}
            />
          </View>

          {/* 🚨 SECCIÓN DE ALERTAS INTELIGENTES */}
          {tieneAlertas && (
            <AdminSurface style={styles.sectionSurface} accent={colors.danger}>
              <AdminSectionHeading
                eyebrow="Atención"
                title="Alertas del negocio"
                subtitle="Señales que requieren revisión"
                icon="warning-outline"
                action={<AdminStatusPill label="Revisar" tone="danger" />}
              />

              {[
                ...alertasCriticas.map((alerta: any) => ({ ...alerta, badge: 'CRÍTICO', tone: 'critical', icon: 'alert-circle' as const })),
                ...alertasMedias.map((alerta: any) => ({ ...alerta, badge: 'RECETA INCOMPLETA', tone: 'medium', icon: 'warning' as const })),
                ...alertasBajas.map((alerta: any) => ({ ...alerta, badge: 'REABASTECIMIENTO', tone: 'low', icon: 'cube-outline' as const })),
              ].map((alerta: any) => {
                const toneColor = alerta.tone === 'critical' ? '#ef4444' : alerta.tone === 'medium' ? '#f59e0b' : '#10b981';
                return (
                  <View key={alerta.id} style={[styles.alertFeedRow, { borderLeftColor: toneColor }]}>
                    <View style={[styles.alertSeverityBadge, { backgroundColor: `${toneColor}18` }]}>
                      <Ionicons name={alerta.icon} size={14} color={toneColor} />
                      <Text style={[styles.alertSeverityText, { color: toneColor }]}>{alerta.badge}</Text>
                    </View>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertTitle} numberOfLines={1}>{alerta.titulo || alerta.productoNombre || 'Revisión operativa'}</Text>
                      <Text style={styles.alertMessage} numberOfLines={2}>{alerta.mensaje || alerta.accionSugerida || alerta.ingredienteLimitante || 'Revisar inventario y operación'}</Text>
                    </View>
                  </View>
                );
              })}
            </AdminSurface>
          )}

          {/* 🤖 SECCIÓN DE PREDICCIÓN DE STOCK */}
          <AdminSurface style={styles.sectionSurface} accent="#8b5cf6">
            <AdminSectionHeading
              eyebrow="Inventario"
              title="Predicción de reabastecimiento"
              subtitle="Prioridades sugeridas a partir del consumo"
              icon="analytics-outline"
              action={<AdminStatusPill label="Automático" tone="accent" />}
            />

            {loadingPredicciones ? (
              <View style={styles.predictionsLoading}>
                <Text style={styles.loadingText}>Calculando predicciones...</Text>
              </View>
            ) : predicciones.length === 0 ? (
              <View style={styles.emptyPredictions}>
                <Text style={styles.emptyPredictionsText}>
                  No hay suficientes datos para generar predicciones
                </Text>
              </View>
            ) : (
              <View style={styles.predictionsGrid}>
                {predicciones.map((p: any, idx: number) => {
                  const stockSuficiente =
                    p.stockSuficiente ??
                    (p.estadoStock !== 'agotado' && p.estadoStock !== 'critico');
                  const estadoColor =
                    p.estadoStock === 'agotado' || stockSuficiente === false
                      ? '#ef4444'
                      : p.estadoStock === 'critico'
                      ? '#f59e0b'
                      : p.estadoStock === 'bajo'
                      ? '#eab308'
                      : '#10b981';

                  const estadoText =
                    p.estadoStock === 'agotado'
                      ? 'AGOTADO'
                      : p.estadoStock === 'critico'
                      ? 'CRÍTICO'
                      : p.estadoStock === 'bajo'
                      ? 'BAJO'
                      : stockSuficiente
                      ? 'OK'
                      : 'REVISAR';

                  const platilloId = p.productoId || p.platilloId || `pred-${idx}`;
                  const nombrePlatillo = p.productoNombre || p.nombrePlatillo || 'Platillo';
                  const promedio = p.cantidadPosible ?? p.promedioDiario ?? 0;
                  const ingredienteLimitante =
                    p.ingredienteLimitante || p.fechaRecompraSugerida || 'En orden';

                  return (
                    <View
                      key={platilloId}
                      style={[styles.predictionCard, { width: predictionCardWidth }]}
                    >
                      <View style={styles.predictionHeader}>
                        <Text style={styles.predictionNombre} numberOfLines={1}>
                          {nombrePlatillo}
                        </Text>
                        <View style={[styles.stockBadge, { backgroundColor: `${estadoColor}20` }]}>
                          <Text style={[styles.stockBadgeText, { color: estadoColor }]}>
                            {estadoText}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.predictionMetrics}>
                        <View style={styles.predMetricItem}>
                          <Text style={styles.predMetricValue}>{promedio}</Text>
                          <Text style={styles.predMetricLabel}>Porciones posibles</Text>
                        </View>
                        <View style={styles.predMetricItem}>
                          <Text style={[styles.predMetricValue, { color: estadoColor }]}>
                            {p.diasRestantes === undefined
                              ? stockSuficiente
                                ? '∞'
                                : '0'
                              : p.diasRestantes === 999
                              ? '∞'
                              : p.diasRestantes}
                          </Text>
                          <Text style={styles.predMetricLabel}>Días rest.</Text>
                        </View>
                      </View>

                      <View style={styles.predictionFooter}>
                        <Ionicons name="cube-outline" size={14} color="#9ca3af" />
                        <Text style={styles.fechaRecompraText} numberOfLines={1}>
                          Limitante: {ingredienteLimitante}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </AdminSurface>

          {/* Gráfico de Ventas en el Tiempo */}
          <AdminSurface style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Analítica financiera</Text>
                <Text style={styles.chartSubtitle}>
                  Venta total, costo y ganancia por {dateFilter === 'hoy' || dateFilter === 'ayer' ? 'hora' : 'franja'}
                </Text>
              </View>
              <Ionicons name="trending-up" size={24} color="#10b981" />
            </View>

            {metrics.ventasPorHora.length > 0 ? (
              Platform.OS === 'web' ? (
                <InlineTrendChart
                  data={metrics.ventasPorHora}
                  color={colors.primary}
                />
              ) : (
                <SalesLineChart
                  data={metrics.ventasPorHora.map((d: any) => ({
                    label: d.label,
                    value: d.ventaTotal ?? d.total ?? 0,
                  }))}
                  height={220}
                />
              )
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>Sin datos para el período seleccionado</Text>
              </View>
            )}
          </AdminSurface>

          <View style={[styles.analyticsSplit, isDesktop && styles.analyticsSplitDesktop]}>
          {/* Gráfico de Distribución de Ventas */}
          <AdminSurface style={[styles.chartCard, isDesktop && styles.chartCardHalf]}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Distribución de Ventas</Text>
                <Text style={styles.chartSubtitle}>Por tipo de origen</Text>
              </View>
              <Ionicons name="pie-chart" size={24} color="#3b82f6" />
            </View>

            {metrics.distribucionVentas.length > 0 ? (
              <DistributionDonut
                data={metrics.distribucionVentas.map((d: any) => ({
                  label: d.label || d.name || 'Origen',
                  value: Number(d.value || d.population || 0),
                }))}
                palette={chartPalette}
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>Sin datos de distribución</Text>
              </View>
            )}
          </AdminSurface>

          {/* Top 5 Platillos Más Vendidos */}
          <AdminSurface style={[styles.chartCard, isDesktop && styles.chartCardHalf]}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Top 5 Platillos Más Vendidos</Text>
                <Text style={styles.chartSubtitle}>Por unidades vendidas</Text>
              </View>
              <Ionicons name="bar-chart" size={24} color="#f59e0b" />
            </View>

            {metrics.topPlatillos.length > 0 ? (
              <TopProductsList data={metrics.topPlatillos} color={colors.warning} />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>Sin datos de platillos</Text>
              </View>
            )}
          </AdminSurface>
          </View>
        </ScrollView>
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMeta: {
    gap: 2,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRightMobile: {
    width: '100%',
    justifyContent: 'space-between',
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  filterRowScroll: {
    maxWidth: '80%',
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterBtnActive: {
    backgroundColor: '#3b82f6',
  },
  filterBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  refreshBtn: {
    padding: 8,
    backgroundColor: '#0f172a',
    borderRadius: 10,
  },
  btnPressed: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 20,
  },
  mainMetricCard: {
    padding: 24,
  },
  mainMetricLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  mainMetricValue: {
    color: '#f8fafc',
    fontSize: 38,
    fontWeight: '900',
    marginVertical: 4,
  },
  mainMetricSubtitle: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricCard: {
    flexGrow: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#0f172a',
  },
  trendBadgeUp: {
    backgroundColor: '#10b98115',
  },
  trendBadgeDown: {
    backgroundColor: '#ef444415',
  },
  metricValue: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  metricSubtitle: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  alertsContainer: {
    gap: 12,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertCardCritical: {
    backgroundColor: '#ef444410',
    borderColor: '#ef444440',
  },
  alertCardMedium: {
    backgroundColor: '#f59e0b10',
    borderColor: '#f59e0b40',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  alertMessage: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  sectionContainer: {
    gap: 12,
  },
  sectionSurface: {
    gap: 12,
  },
  predictionsLoading: {
    padding: 20,
    alignItems: 'center',
  },
  emptyPredictions: {
    padding: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyPredictionsText: {
    color: '#64748b',
    fontSize: 14,
  },
  predictionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  predictionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  predictionNombre: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  predictionMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#33415550',
    marginBottom: 8,
  },
  predMetricItem: {
    alignItems: 'center',
  },
  predMetricValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  predMetricLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  predictionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fechaRecompraText: {
    color: '#9ca3af',
    fontSize: 11,
  },
  chartCard: {
    padding: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inlineChart: {
    height: 220,
    justifyContent: 'flex-end',
    paddingTop: 12,
  },
  inlineBars: {
    height: 180,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  inlineBarColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  inlineBar: {
    width: '70%',
    minWidth: 6,
    borderRadius: 6,
    opacity: 0.9,
  },
  inlineBarLabel: {
    color: '#64748b',
    fontSize: 9,
    maxWidth: 42,
  },
  chartTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  chartSubtitle: {
    color: '#64748b',
    fontSize: 13,
  },
  noDataContainer: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    color: '#64748b',
    fontSize: 14,
  },
  alertFeedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 58,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  alertSeverityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 82,
  },
  alertSeverityText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.35,
  },
  financialLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  financialLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  financialLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  financialLegendText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  financialHint: {
    color: '#64748b',
    fontSize: 10,
    marginLeft: 'auto',
  },
  barStack: {
    height: 170,
    width: '70%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  inlineBarColumnActive: {
    backgroundColor: '#ffffff08',
    borderRadius: 8,
  },
  inlineBarLabelActive: {
    color: '#f8fafc',
    fontWeight: '800',
  },
  inlineCostBar: {
    width: '100%',
    minWidth: 6,
    borderRadius: 6,
    backgroundColor: '#f59e0b',
    opacity: 0.82,
  },
  chartTooltip: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    gap: 10,
  },
  tooltipEyebrow: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  tooltipOrders: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  tooltipFinancials: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  tooltipLabel: {
    color: '#64748b',
    fontSize: 10,
    marginBottom: 2,
  },
  tooltipValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  analyticsSplit: {
    gap: 12,
  },
  analyticsSplitDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  chartCardHalf: {
    flex: 1,
    minWidth: 0,
  },
  distributionWrap: {
    minHeight: 164,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutStage: {
    width: 144,
    height: 144,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 92,
  },
  donutCenterValue: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
  },
  donutCenterLabel: {
    color: '#94a3b8',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  distributionLegend: {
    flex: 1,
    gap: 5,
  },
  distributionLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  distributionLegendActive: {
    backgroundColor: '#ffffff08',
  },
  distributionLegendLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    flex: 1,
  },
  distributionLegendValue: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '800',
  },
  topProductsList: {
    gap: 14,
    paddingVertical: 8,
  },
  topProductRow: {
    gap: 7,
  },
  topProductMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  topProductName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  topProductAmount: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  topProductTrack: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  topProductFill: {
    height: '100%',
    borderRadius: 4,
  },
  salesKpiCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
  },
  salesKpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  salesKpiLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  salesKpiValue: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  salesKpiSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AdminDashboardScreen;
