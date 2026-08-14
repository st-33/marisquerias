/**
 * 📊 MÉTRICAS Y DATOS SCREEN (Admin Dashboard)
 * Componente visual para alimentos y bebidas
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SalesDistributionPieChart } from '../../../compartido/componentes/charts/SalesDistributionPieChart';
import { SalesLineChart } from '../../../compartido/componentes/charts/SalesLineChart';
import { TopProductsBarChart } from '../../../compartido/componentes/charts/TopProductsBarChart';
import { AdminLayout } from '../../../compartido/componentes/layouts/AdminLayout';
import { getRtdb } from '../../../plataforma/core/firebase';
import { useStore } from '../../../plataforma/core/store';
import { useNotifications } from '../../../compartido/hooks/useNotifications';
import { useStoreNotifications } from '../../../compartido/hooks/useStoreNotifications';
import { logger } from '../../../compartido/utils/logger';
import {
  useAdminLogic,
  useAlertasInteligentes,
  usePrediccionStock,
  usePuenteAccionesFlotantes,
} from '../../../plataforma/dominios/alimentos_y_bebidas';
import type { FabItem } from '../../../plataforma/core/types/contratos';

const chartPalette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];

type MetricCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  containerStyle?: any;
};

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  containerStyle,
}: MetricCardProps) {
  return (
    <View style={[styles.metricCard, containerStyle]}>
      <View style={styles.metricHeader}>
        <View style={[styles.iconBadge, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        {trend && (
          <View
            style={[
              styles.trendBadge,
              trend === 'up' && styles.trendBadgeUp,
              trend === 'down' && styles.trendBadgeDown,
            ]}
          >
            <Ionicons
              name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
              size={14}
              color={trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280'}
            />
          </View>
        )}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );
}

export function AdminDashboardScreen() {
  const { width } = useWindowDimensions();
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
  const { alertasCriticas, alertasMedias, tieneAlertas } = useAlertasInteligentes();

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
  }, [features]);

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
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <View style={styles.headerLeft}>
            <Ionicons name="stats-chart" size={26} color="#ffffff" />
            <Text style={styles.title}>Métricas y Datos</Text>
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
            <Pressable
              onPress={actions.refreshMetrics}
              style={({ pressed }) => [styles.refreshBtn, pressed && styles.btnPressed]}
            >
              <Ionicons name="refresh" size={20} color="#3b82f6" />
            </Pressable>
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
          <View style={styles.mainMetricCard}>
            <Text style={styles.mainMetricLabel}>
              {dateFilter === 'hoy'
                ? 'Ventas de Hoy'
                : dateFilter === 'ayer'
                ? 'Ventas de Ayer'
                : dateFilter === 'hace3dias'
                ? 'Ventas últimos 3 días'
                : dateFilter === 'semana'
                ? 'Ventas de esta Semana'
                : 'Ventas de este Mes'}
            </Text>
            <Text style={styles.mainMetricValue}>
              ${(metrics?.vendedorHero?.ventasHero ?? metrics?.ventasFiltradas ?? 0).toFixed(2)}
            </Text>
            <Text style={styles.mainMetricSubtitle}>
              {metrics?.vendedorHero?.subpedidosCountHero ?? metrics?.ordenesFiltradas ?? 0}{' '}
              subpedidos finalizados
            </Text>
          </View>

          {/* Grid de métricas secundarias */}
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Promedio por Pedido"
              value={`$${(metrics?.ticketPromedio ?? 0).toFixed(2)}`}
              subtitle="Ticket promedio acumulado"
              icon="receipt"
              color="#3b82f6"
              containerStyle={{ width: metricCardWidth }}
            />
            <MetricCard
              title="Vendedor Estrella"
              value={metrics?.vendedorEstrella?.nombre ?? 'Sin ventas'}
              subtitle={`$${(metrics?.vendedorEstrella?.monto ?? 0).toFixed(2)} (${
                metrics?.vendedorEstrella?.subpedidos ?? 0
              } subpedidos)`}
              icon="trophy"
              color="#f59e0b"
              containerStyle={{ width: metricCardWidth }}
            />
            <MetricCard
              title="Platillo Más Vendido"
              value={metrics?.platilloMasVendido?.nombre ?? 'Sin ventas'}
              subtitle={`${metrics?.platilloMasVendido?.cantidad ?? 0} unidades vendidas`}
              icon="flame"
              color="#ef4444"
              containerStyle={{ width: metricCardWidth }}
            />
            <MetricCard
              title="Hora Pico de Ventas"
              value={metrics?.horaPico?.hora ?? 'N/A'}
              subtitle={`${metrics?.horaPico?.pedidos ?? 0} pedidos en esta hora`}
              icon="time"
              color="#8b5cf6"
              containerStyle={{ width: metricCardWidth }}
            />
          </View>

          {/* 🚨 SECCIÓN DE ALERTAS INTELIGENTES */}
          {tieneAlertas && (
            <View style={styles.alertsContainer}>
              <View style={styles.sectionHeaderContainer}>
                <Ionicons name="warning" size={22} color="#ef4444" />
                <Text style={styles.sectionTitle}>Alertas del Negocio</Text>
              </View>

              {alertasCriticas.map((alerta) => (
                <View key={alerta.id} style={[styles.alertCard, styles.alertCardCritical]}>
                  <Ionicons name="alert-circle" size={24} color="#ef4444" />
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>{alerta.titulo}</Text>
                    <Text style={styles.alertMessage}>{alerta.mensaje}</Text>
                  </View>
                </View>
              ))}

              {alertasMedias.map((alerta) => (
                <View key={alerta.id} style={[styles.alertCard, styles.alertCardMedium]}>
                  <Ionicons name="warning" size={24} color="#f59e0b" />
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>{alerta.titulo}</Text>
                    <Text style={styles.alertMessage}>{alerta.mensaje}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 🤖 SECCIÓN DE PREDICCIÓN DE STOCK */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderContainer}>
              <Ionicons name="analytics" size={22} color="#8b5cf6" />
              <Text style={styles.sectionTitle}>Predicción de Reabastecimiento</Text>
            </View>

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
          </View>

          {/* Gráfico de Ventas en el Tiempo */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Ventas en el Tiempo</Text>
                <Text style={styles.chartSubtitle}>
                  Evolución por {dateFilter === 'hoy' || dateFilter === 'ayer' ? 'hora' : 'día'}
                </Text>
              </View>
              <Ionicons name="trending-up" size={24} color="#10b981" />
            </View>

            {metrics.ventasPorHora.length > 0 ? (
              <SalesLineChart
                data={metrics.ventasPorHora.map((d: any) => ({
                  label: d.label,
                  value: d.monto ?? d.total ?? 0,
                }))}
                height={220}
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>Sin datos para el período seleccionado</Text>
              </View>
            )}
          </View>

          {/* Gráfico de Distribución de Ventas */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Distribución de Ventas</Text>
                <Text style={styles.chartSubtitle}>Por tipo de origen</Text>
              </View>
              <Ionicons name="pie-chart" size={24} color="#3b82f6" />
            </View>

            {metrics.distribucionVentas.length > 0 ? (
              <SalesDistributionPieChart
                title="Distribución de Ventas"
                data={metrics.distribucionVentas.map((d: any, index: number) => ({
                  name: d.label || d.name || 'Origen',
                  population: Number(d.value || d.population || 0),
                  color: chartPalette[index % chartPalette.length],
                  legendFontColor: '#94a3b8',
                  legendFontSize: 12,
                }))}
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>Sin datos de distribución</Text>
              </View>
            )}
          </View>

          {/* Top 5 Platillos Más Vendidos */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Top 5 Platillos Más Vendidos</Text>
                <Text style={styles.chartSubtitle}>Por unidades vendidas</Text>
              </View>
              <Ionicons name="bar-chart" size={24} color="#f59e0b" />
            </View>

            {metrics.topPlatillos.length > 0 ? (
              <TopProductsBarChart title="Top 5 Platillos" data={metrics.topPlatillos} />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>Sin datos de platillos</Text>
              </View>
            )}
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
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#3b82f650',
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
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
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
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
