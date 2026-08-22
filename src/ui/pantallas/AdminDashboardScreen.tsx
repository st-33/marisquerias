/**
 * Dirección visual: centro de control oscuro y denso de la referencia; métricas,
 * gráfica, alertas e inventario en capas, sin inventar datos ni tocar sus hooks.
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SalesDistributionPieChart } from '../../compartido/componentes/charts/SalesDistributionPieChart';
import { SalesLineChart } from '../../compartido/componentes/charts/SalesLineChart';
import { TopProductsBarChart } from '../../compartido/componentes/charts/TopProductsBarChart';
import { AdminLayout } from '../../compartido/componentes/layouts/AdminLayout';
import { useNotifications } from '../../compartido/hooks/useNotifications';
import { useStoreNotifications } from '../../compartido/hooks/useStoreNotifications';
import { logger } from '../../compartido/utils/logger';
import { useAdminLogic, useAlertasInteligentes, usePrediccionStock, usePuenteAccionesFlotantes } from '../../capacidades';
import { getRtdb } from '../../sistema/firebase';
import { useStore } from '../../sistema/store';
import type { FabItem } from '../../sistema/tipos/contratos';

const chartPalette = ['#D4AF37', '#64D7A0', '#E6A85C', '#DD6B69', '#8EA3C4', '#6AB7C7'];
const DASHBOARD_FILTERS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'ayer', label: 'Ayer' },
  { key: 'hace3dias', label: '3 días' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
] as const;

const money = (value: number | undefined | null) => `$${Number(value ?? 0).toFixed(2)}`;

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'gold' | 'green' | 'blue' | 'orange';
  wide?: boolean;
};

function MetricCard({ label, value, detail, icon, tone, wide }: MetricCardProps) {
  const toneStyle = tone === 'green' ? styles.toneGreen : tone === 'blue' ? styles.toneBlue : tone === 'orange' ? styles.toneOrange : styles.toneGold;
  return (
    <View style={[styles.metricCard, wide && styles.metricCardWide]}>
      <View style={styles.metricTopline}>
        <View style={[styles.metricIcon, toneStyle]}><Ionicons name={icon} size={17} color={tone === 'green' ? '#64D7A0' : tone === 'blue' ? '#76A9FF' : tone === 'orange' ? '#E6A85C' : '#D4AF37'} /></View>
        <View style={[styles.metricTag, toneStyle]}><Text style={styles.metricTagText}>{label}</Text></View>
      </View>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricDetail} numberOfLines={2}>{detail}</Text>
    </View>
  );
}

function SmallSectionTitle({ icon, eyebrow, title }: { icon: keyof typeof Ionicons.glyphMap; eyebrow: string; title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionIcon}><Ionicons name={icon} size={17} color="#D4AF37" /></View>
      <View><Text style={styles.sectionEyebrow}>{eyebrow}</Text><Text style={styles.sectionTitle}>{title}</Text></View>
    </View>
  );
}

export function AdminDashboardScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 620;
  const isWide = width >= 1000;
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const tenantPath = useStore((s) => s.sesion.tenantPath) || '';
  const dataSources = useStore((s: any) => s.dataSources);
  const db = useMemo(() => getRtdb(dataSources?.operacionUrl || undefined), [dataSources]);
  const { notify } = useNotifications();

  useStoreNotifications({
    enabled: true,
    onNotification: React.useCallback(({ mesaId, type }) => {
      logger.debug('[admin/metricas]', 'notificación visible en centro de control', { mesaId, type });
      notify({ type, mesaId }, 'admin');
    }, [notify]),
  });

  const { metrics, loading, actions, dateFilter } = useAdminLogic({ db, tenantPath });
  const { predicciones, loading: loadingPredicciones } = usePrediccionStock();
  const { alertasCriticas, alertasMedias, tieneAlertas } = useAlertasInteligentes();

  const navItems = useMemo<FabItem[]>(() => [
    { key: 'metricas-home', label: 'Métricas', icon: <Ionicons name="stats-chart" size={23} color="white" />, onPress: () => router.replace('/_role/admin/dashboard') },
    { key: 'menu', label: 'Menú', icon: <Ionicons name="restaurant" size={22} color="white" />, onPress: () => router.push('/_role/admin/menu') },
    { key: 'inventory', label: 'Inventario', icon: <Ionicons name="cube" size={20} color="white" />, onPress: () => router.push('/_role/admin/inventory') },
    { key: 'tables', label: 'Mesas', icon: <Ionicons name="grid" size={20} color="white" />, onPress: () => router.push('/_role/admin/tables') },
  ], []);

  usePuenteAccionesFlotantes(useMemo(() => ({ items: navItems, initialKey: 'metricas-home', position: 'bottom-right' as const }), [navItems]));

  if (loading || !metrics) {
    return <View style={styles.loading}><Ionicons name="pulse" size={31} color="#D4AF37" /><Text style={styles.loadingText}>Preparando centro de control…</Text></View>;
  }

  const ventas = metrics.vendedorHero?.ventasHero ?? metrics.ventasFiltradas ?? 0;
  const ordenes = metrics.vendedorHero?.subpedidosCountHero ?? metrics.ordenesFiltradas ?? 0;
  const alerts = [...alertasCriticas, ...alertasMedias];
  const selectedPeriod = DASHBOARD_FILTERS.find((filter) => filter.key === dateFilter) ?? DASHBOARD_FILTERS[0];

  return (
    <AdminLayout>
      <View style={styles.root}>
        <View style={[styles.topbar, isCompact && styles.topbarCompact]}>
          <View style={styles.titleRow}>
            <View style={styles.topIcon}><Ionicons name="bar-chart" size={20} color="#E7C46C" /></View>
            <View><Text style={styles.topEyebrow}>Centro de control</Text><Text style={styles.topTitle}>Métricas y datos</Text></View>
            <View style={styles.operativoPill}><View style={styles.operativoDot} /><Text style={styles.operativoText}>Operativo</Text></View>
          </View>
          <View style={[styles.controls, isCompact && styles.controlsCompact]}>
            <View style={styles.periodAnchor}>
              <Pressable accessibilityRole="button" accessibilityLabel="Seleccionar período" onPress={() => setIsPeriodOpen((open) => !open)} style={({ pressed }) => [styles.periodToggle, pressed && styles.pressed]}>
                <Text style={styles.periodToggleText}>{selectedPeriod.label}</Text>
                <Ionicons name={isPeriodOpen ? 'chevron-up' : 'chevron-down'} size={15} color="#DDE4EF" />
              </Pressable>
              {isPeriodOpen && <View style={styles.periodPopover}>{DASHBOARD_FILTERS.map((filter) => {
                const active = dateFilter === filter.key;
                return <Pressable key={filter.key} onPress={() => { actions.setDateFilter(filter.key as any); setIsPeriodOpen(false); }} style={({ pressed }) => [styles.periodOption, active && styles.periodOptionActive, pressed && styles.pressed]}><Text style={[styles.periodOptionText, active && styles.periodOptionTextActive]}>{filter.label}</Text>{active && <Ionicons name="checkmark" size={14} color="#D4AF37" />}</Pressable>;
              })}</View>}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Actualizar métricas" onPress={actions.refreshMetrics} style={({ pressed }) => [styles.utilityButton, pressed && styles.pressed]}><Ionicons name="refresh" size={19} color="#D4AF37" /></Pressable>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, isWide && styles.scrollWide]} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#252b42', '#171d2a', '#12141b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <View style={[styles.heroTop, isCompact && styles.heroTopCompact]}>
              <View style={styles.heroInfo}><Text style={styles.heroKicker}>{dateFilter === 'hoy' ? 'Ventas de hoy' : 'Rendimiento del período'}</Text><Text style={styles.heroAmount}>{money(ventas)}</Text><Text style={styles.heroDetail}>{ordenes} subpedidos finalizados</Text></View>
              <View style={styles.heroSideCard}><View style={styles.heroSideIcon}><Ionicons name="trending-up" size={16} color="#64D7A0" /></View><View><Text style={styles.heroSideLabel}>Ticket promedio</Text><Text style={styles.heroSideValue}>{money(metrics.ticketPromedio)}</Text></View></View>
            </View>
            <View style={styles.heroChartWrap}>{metrics.ventasPorHora.length > 0 ? <SalesLineChart data={metrics.ventasPorHora.map((d: any) => ({ label: d.label, total: d.monto ?? d.total ?? 0 }))} height={isCompact ? 150 : 190} /> : <View style={styles.emptyChart}><Text style={styles.emptyChartText}>Sin datos para el período seleccionado</Text></View>}</View>
          </LinearGradient>

          <View style={styles.metricGrid}>
            <MetricCard label="Ticket promedio" value={money(metrics.ticketPromedio)} detail="Acumulado del período" icon="receipt-outline" tone="gold" />
            <MetricCard label="Pedidos" value={`${ordenes}`} detail="Subpedidos finalizados" icon="file-tray-full-outline" tone="blue" />
            <MetricCard label="Vendedor estrella" value={metrics.vendedorEstrella?.nombre ?? 'Sin ventas'} detail={money(metrics.vendedorEstrella?.monto)} icon="trophy-outline" tone="gold" />
            <MetricCard label="Hora pico" value={metrics.horaPico?.hora ?? 'Sin datos'} detail={`${metrics.horaPico?.pedidos ?? 0} pedidos en esta hora`} icon="time-outline" tone="orange" />
          </View>

          <View style={[styles.dualRow, isCompact && styles.dualRowCompact]}>
            <View style={[styles.alertPanel, isCompact && styles.stackPanel]}>
              <SmallSectionTitle icon="warning-outline" eyebrow="Atención" title="Alertas críticas de inventario" />
              {tieneAlertas ? alerts.slice(0, 6).map((alerta) => <View style={styles.alertRow} key={alerta.id}><View style={styles.alertBadge}><Ionicons name="alert-circle" size={14} color="#E6A85C" /><Text style={styles.alertBadgeText}>{alerta.severidad === 'alta' ? 'Crítico' : 'Revisar'}</Text></View><View style={styles.alertCopy}><Text style={styles.alertName} numberOfLines={1}>{alerta.titulo}</Text><Text style={styles.alertMessage} numberOfLines={1}>{alerta.mensaje}</Text></View></View>) : <View style={styles.goodState}><Ionicons name="checkmark-circle" size={18} color="#64D7A0" /><Text style={styles.goodStateText}>Sin alertas críticas para este período</Text></View>}
            </View>
            <View style={[styles.predictionPanel, isCompact && styles.stackPanel]}>
              <SmallSectionTitle icon="analytics-outline" eyebrow="Inventario" title="Predicción de reabastecimiento" />
              {loadingPredicciones ? <Text style={styles.sectionLoading}>Calculando predicciones…</Text> : predicciones.length === 0 ? <Text style={styles.sectionLoading}>No hay suficientes datos para generar predicciones</Text> : <View style={styles.predictionGrid}>{predicciones.slice(0, 6).map((p: any, idx: number) => {
                const stockSuficiente = p.stockSuficiente ?? (p.estadoStock !== 'agotado' && p.estadoStock !== 'critico');
                const estadoCritico = p.estadoStock === 'agotado' || p.estadoStock === 'critico' || stockSuficiente === false;
                const nombre = p.productoNombre || p.nombrePlatillo || 'Platillo';
                const posible = p.cantidadPosible ?? p.promedioDiario ?? 0;
                const dias = p.diasRestantes === undefined ? (stockSuficiente ? '∞' : '0') : p.diasRestantes === 999 ? '∞' : p.diasRestantes;
                return <View style={styles.predictionCard} key={p.productoId || p.platilloId || `pred-${idx}`}><View style={styles.predictionHead}><Text style={styles.predictionName} numberOfLines={1}>{nombre}</Text><Text style={[styles.reviewTag, estadoCritico && styles.reviewTagCritical]}>{estadoCritico ? 'Revisar' : 'OK'}</Text></View><View style={styles.predictionNumbers}><View><Text style={styles.predictionValue}>{posible}</Text><Text style={styles.predictionLabel}>Porciones posibles</Text></View><View><Text style={[styles.predictionValue, estadoCritico && styles.predictionValueCritical]}>{dias}</Text><Text style={styles.predictionLabel}>Días de descanso</Text></View></View><Text style={styles.limitText} numberOfLines={1}>◌ Limitante: {p.ingredienteLimitante || p.fechaRecompraSugerida || 'En orden'}</Text></View>;
              })}</View>}
            </View>
          </View>

          <View style={[styles.chartRow, isCompact && styles.chartRowCompact]}>
            <View style={[styles.lowerChart, isCompact && styles.stackPanel]}><SmallSectionTitle icon="pie-chart-outline" eyebrow="Origen" title="Distribución de ventas" />{metrics.distribucionVentas.length > 0 ? <SalesDistributionPieChart title="" data={metrics.distribucionVentas.map((d: any, index: number) => ({ name: d.label || d.name || 'Origen', population: Number(d.value || d.population || 0), color: chartPalette[index % chartPalette.length], legendFontColor: '#AAB5C9', legendFontSize: 10 }))} /> : <Text style={styles.sectionLoading}>Sin datos de distribución</Text>}</View>
            <View style={[styles.lowerChart, isCompact && styles.stackPanel]}><SmallSectionTitle icon="bar-chart-outline" eyebrow="Rendimiento" title="Top 5 platillos más vendidos" />{metrics.topPlatillos.length > 0 ? <TopProductsBarChart title="" data={metrics.topPlatillos} /> : <Text style={styles.sectionLoading}>Sin datos de platillos</Text>}</View>
          </View>
        </ScrollView>
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080A0F' },
  loading: { alignItems: 'center', backgroundColor: '#080A0F', flex: 1, gap: 14, justifyContent: 'center' },
  loadingText: { color: '#B6BCC8', fontSize: 13, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  topbar: { alignItems: 'center', backgroundColor: '#11141D', borderBottomColor: 'rgba(223,229,240,0.11)', borderBottomWidth: 1, elevation: 12, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 15, zIndex: 30 },
  topbarCompact: { alignItems: 'flex-start', flexDirection: 'column', gap: 14, paddingHorizontal: 15 },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  topIcon: { alignItems: 'center', backgroundColor: 'rgba(212,175,55,0.12)', borderRadius: 10, height: 38, justifyContent: 'center', width: 38 },
  topEyebrow: { color: '#D9B95A', fontSize: 9, fontWeight: '800', letterSpacing: 2.2, textTransform: 'uppercase' },
  topTitle: { color: '#F4F0E8', fontSize: 21, fontWeight: '800', letterSpacing: -0.4, marginTop: 1 },
  operativoPill: { alignItems: 'center', backgroundColor: 'rgba(67,172,113,0.12)', borderColor: 'rgba(100,215,160,0.22)', borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 6, marginLeft: 8, paddingHorizontal: 9, paddingVertical: 5 },
  operativoDot: { backgroundColor: '#64D7A0', borderRadius: 4, height: 7, width: 7 },
  operativoText: { color: '#7ADEAA', fontSize: 9, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  controls: { alignItems: 'center', flexDirection: 'row', gap: 9, zIndex: 32 },
  controlsCompact: { alignSelf: 'stretch', justifyContent: 'space-between' },
  periodAnchor: { position: 'relative', zIndex: 40 },
  periodToggle: { alignItems: 'center', backgroundColor: '#1C212D', borderColor: 'rgba(223,229,240,0.13)', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 12, justifyContent: 'space-between', minWidth: 92, paddingHorizontal: 11, paddingVertical: 9 },
  periodToggleText: { color: '#F0F3F8', fontSize: 11, fontWeight: '800' },
  periodPopover: { backgroundColor: '#171C27', borderColor: 'rgba(212,175,55,0.34)', borderRadius: 12, borderWidth: 1, minWidth: 146, padding: 5, position: 'absolute', right: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.42, shadowRadius: 18, top: 43, zIndex: 60 },
  periodOption: { alignItems: 'center', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 9 },
  periodOptionActive: { backgroundColor: 'rgba(212,175,55,0.11)' },
  periodOptionText: { color: '#B7C0D0', fontSize: 11, fontWeight: '700' },
  periodOptionTextActive: { color: '#F5D774' },
  periodShell: { backgroundColor: '#1C212D', borderColor: 'rgba(223,229,240,0.10)', borderRadius: 11, borderWidth: 1, gap: 2, padding: 3 },
  periodButton: { borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 },
  periodButtonActive: { backgroundColor: '#346CB7', borderColor: '#75ABFF', borderWidth: 1 },
  periodText: { color: '#B9C0CE', fontSize: 11, fontWeight: '700' },
  periodTextActive: { color: '#FFFFFF' },
  utilityButton: { alignItems: 'center', backgroundColor: '#1B202B', borderColor: 'rgba(223,229,240,0.13)', borderRadius: 12, borderWidth: 1, height: 38, justifyContent: 'center', width: 38 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
  scroll: { flex: 1 },
  scrollContent: { gap: 17, padding: 16, paddingBottom: 92 },
  scrollWide: { alignSelf: 'center', maxWidth: 1360, width: '100%' },
  heroCard: { borderColor: 'rgba(222,229,242,0.13)', borderRadius: 20, borderWidth: 1, minHeight: 255, overflow: 'hidden', padding: 18 },
  heroTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  heroTopCompact: { gap: 12 },
  heroInfo: { flex: 1 },
  heroKicker: { color: '#C8D0DC', fontSize: 12, fontWeight: '700' },
  heroAmount: { color: '#FFFFFF', fontSize: 37, fontWeight: '900', letterSpacing: -1.1, marginTop: 5 },
  heroDetail: { color: '#9FAABA', fontSize: 11, marginTop: 3 },
  heroSideCard: { alignItems: 'center', backgroundColor: 'rgba(12,16,23,0.52)', borderColor: 'rgba(100,215,160,0.14)', borderRadius: 13, borderWidth: 1, flexDirection: 'row', gap: 9, padding: 11 },
  heroSideIcon: { alignItems: 'center', backgroundColor: 'rgba(100,215,160,0.11)', borderRadius: 8, height: 28, justifyContent: 'center', width: 28 },
  heroSideLabel: { color: '#AAB5C6', fontSize: 9, fontWeight: '600' },
  heroSideValue: { color: '#F6F1E5', fontSize: 17, fontWeight: '800', marginTop: 2 },
  heroChartWrap: { bottom: 0, left: 14, opacity: 0.94, position: 'absolute', right: 14, top: 82 },
  emptyChart: { alignItems: 'center', height: 155, justifyContent: 'center' },
  emptyChartText: { color: '#AAB3C2', fontSize: 12 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { backgroundColor: '#171A24', borderColor: 'rgba(222,229,242,0.12)', borderRadius: 17, borderWidth: 1, flexGrow: 1, flexBasis: 220, minHeight: 142, padding: 14 },
  metricCardWide: { flexBasis: 310 },
  metricTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  metricIcon: { alignItems: 'center', borderRadius: 9, height: 31, justifyContent: 'center', width: 31 },
  toneGold: { backgroundColor: 'rgba(212,175,55,0.13)' },
  toneGreen: { backgroundColor: 'rgba(100,215,160,0.13)' },
  toneBlue: { backgroundColor: 'rgba(118,169,255,0.13)' },
  toneOrange: { backgroundColor: 'rgba(230,168,92,0.13)' },
  metricTag: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  metricTagText: { color: '#E4E8F0', fontSize: 8, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  metricValue: { color: '#F7F4EB', fontSize: 22, fontWeight: '900', letterSpacing: -0.6, marginTop: 16 },
  metricDetail: { color: '#A7AEBB', fontSize: 10, lineHeight: 14, marginTop: 4 },
  dualRow: { flexDirection: 'row', gap: 15 },
  dualRowCompact: { flexDirection: 'column' },
  alertPanel: { backgroundColor: '#181B25', borderColor: 'rgba(222,229,242,0.12)', borderRadius: 18, borderWidth: 1, flex: 0.78, overflow: 'hidden', padding: 14 },
  predictionPanel: { backgroundColor: '#181B25', borderColor: 'rgba(222,229,242,0.12)', borderRadius: 18, borderWidth: 1, flex: 1.6, overflow: 'hidden', padding: 14 },
  stackPanel: { flex: undefined },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', gap: 9, marginBottom: 12 },
  sectionIcon: { alignItems: 'center', backgroundColor: 'rgba(212,175,55,0.10)', borderRadius: 8, height: 30, justifyContent: 'center', width: 30 },
  sectionEyebrow: { color: '#C3A95A', fontSize: 8, fontWeight: '800', letterSpacing: 1.7, textTransform: 'uppercase' },
  sectionTitle: { color: '#F3F0E7', fontSize: 15, fontWeight: '800', marginTop: 1 },
  alertRow: { alignItems: 'center', borderBottomColor: 'rgba(222,229,242,0.08)', borderBottomWidth: 1, flexDirection: 'row', gap: 9, paddingVertical: 10 },
  alertBadge: { alignItems: 'center', backgroundColor: 'rgba(230,168,92,0.11)', borderRadius: 7, flexDirection: 'row', gap: 3, paddingHorizontal: 5, paddingVertical: 4 },
  alertBadgeText: { color: '#E8B66F', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  alertCopy: { flex: 1 },
  alertName: { color: '#ECEFF4', fontSize: 11, fontWeight: '800' },
  alertMessage: { color: '#99A2B0', fontSize: 10, marginTop: 2 },
  goodState: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingVertical: 24 },
  goodStateText: { color: '#8DD4A9', fontSize: 11, fontWeight: '700' },
  sectionLoading: { color: '#9BA5B5', fontSize: 11, paddingVertical: 24, textAlign: 'center' },
  predictionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  predictionCard: { backgroundColor: '#1C2230', borderColor: 'rgba(117,137,175,0.18)', borderRadius: 11, borderWidth: 1, flexBasis: 170, flexGrow: 1, minHeight: 124, padding: 10 },
  predictionHead: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  predictionName: { color: '#EEF0F5', flex: 1, fontSize: 10, fontWeight: '800' },
  reviewTag: { backgroundColor: 'rgba(100,215,160,0.12)', borderRadius: 6, color: '#83D9A8', fontSize: 8, fontWeight: '900', paddingHorizontal: 5, paddingVertical: 3, textTransform: 'uppercase' },
  reviewTagCritical: { backgroundColor: 'rgba(230,168,92,0.13)', color: '#E9AD62' },
  predictionNumbers: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  predictionValue: { color: '#F4F0E8', fontSize: 16, fontWeight: '900' },
  predictionValueCritical: { color: '#DD7871' },
  predictionLabel: { color: '#838D9C', fontSize: 8, marginTop: 2 },
  limitText: { color: '#8D97A5', fontSize: 8, marginTop: 12 },
  chartRow: { flexDirection: 'row', gap: 15 },
  chartRowCompact: { flexDirection: 'column' },
  lowerChart: { backgroundColor: '#181B25', borderColor: 'rgba(222,229,242,0.12)', borderRadius: 18, borderWidth: 1, flex: 1, minHeight: 230, overflow: 'hidden', padding: 14 },
});

export default AdminDashboardScreen;
