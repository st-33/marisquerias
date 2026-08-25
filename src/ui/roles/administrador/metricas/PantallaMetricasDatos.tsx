/**
 * 📊 MÉTRICAS Y DATOS (rol Administrador)
 * Pantalla principal del módulo Métricas y Datos.
 *
 * Composición de responsabilidades:
 *  - Datos y estado: useLogicaMetricas, useRegistroVentasDelDia,
 *    usePrediccionStock, useAlertasInteligentes (lógica en capacidades/metricas).
 *  - Navegación flotante: usePuenteAccionesFlotantes (capacidad admin compartida).
 *  - Piezas visuales: componentes/ y graficas/ del propio módulo.
 *
 * Historial: antes `AdminDashboardScreen.tsx` (963 líneas con subcomponentes
 * y estilos internos); se extrajeron TarjetaMetrica, FiltroPeriodo,
 * SeccionAlertas, SeccionPredicciones, SeccionGrafica, VistaSinDatos y las
 * gráficas (antes en compartido/componentes/charts).
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { getRtdb } from '../../../../sistema/firebase';
import { useStore } from '../../../../sistema/store';
import type { FabItem } from '../../../../sistema/tipos/contratos';
import { useNotifications } from '../../../../compartido/hooks/useNotifications';
import { useStoreNotifications } from '../../../../compartido/hooks/useStoreNotifications';
import { logger } from '../../../../compartido/utils/logger';
import { AdminLayout } from '../../../../compartido/componentes/layouts/AdminLayout';
import { usePuenteAccionesFlotantes } from '../../../../capacidades/admin';
import {
  useAlertasInteligentes,
  useLogicaMetricas,
  usePrediccionStock,
  useRegistroVentasDelDia,
} from '../../../../capacidades/metricas';
import { AtmosphereLayer } from '../../../../ui/primitivos/AtmosphereLayer';
import { RegistroVentasDia } from './RegistroVentasDia';
import { FiltroPeriodo } from './componentes/FiltroPeriodo';
import { SeccionAlertas } from './componentes/SeccionAlertas';
import { SeccionGrafica } from './componentes/SeccionGrafica';
import { SeccionPredicciones } from './componentes/SeccionPredicciones';
import { TarjetaMetrica } from './componentes/TarjetaMetrica';
import { VistaSinDatos } from './componentes/VistaSinDatos';
import { GraficaDistribucionVentas } from './graficas/GraficaDistribucionVentas';
import { GraficaTopProductos } from './graficas/GraficaTopProductos';
import { GraficaVentasTiempo } from './graficas/GraficaVentasTiempo';

const PALETA_GRAFICAS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
];

export function PantallaMetricasDatos() {
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

  // 🧠 Lógica del módulo
  const { metrics, loading, actions, features, dateFilter } = useLogicaMetricas({ db, tenantPath });
  const fechaDelDia = useMemo(() => {
    const fecha = new Date();
    fecha.setHours(12, 0, 0, 0);
    return fecha.getTime();
  }, []);
  const {
    registros: ventasDelDia,
    loading: ventasDelDiaLoading,
    error: ventasDelDiaError,
    recargar: recargarVentasDelDia,
  } = useRegistroVentasDelDia({ db, tenantPath, timestamp: fechaDelDia });
  const { predicciones, loading: loadingPredicciones } = usePrediccionStock();
  const { alertasCriticas, alertasMedias, tieneAlertas } = useAlertasInteligentes();

  const navItems = useMemo<FabItem[]>(() => {
    const items: FabItem[] = [];

    if (features?.admin_dashboard !== false) {
      items.push({
        key: 'metricas-home',
        label: 'Métricas',
        icon: <Ionicons name="stats-chart" size={26} color="white" />,
        onPress: () => router.replace('/_role/admin/dashboard'),
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

    return items;
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
      <View style={styles.root}>
        <AtmosphereLayer variant="command" />
        <View style={styles.contentLayer}>
          <View style={[styles.header, isMobile && styles.headerMobile]}>
            <View style={styles.headerLeft}>
              <Ionicons name="stats-chart" size={26} color="#ffffff" />
              <Text style={styles.title}>Métricas y Datos</Text>
            </View>
            <View style={[styles.headerRight, isMobile && styles.headerRightMobile]}>
              <FiltroPeriodo
                filtroActual={dateFilter}
                onSeleccionar={(filtro) => actions.setDateFilter(filtro)}
              />
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

            <RegistroVentasDia
              registros={ventasDelDia}
              loading={ventasDelDiaLoading}
              error={ventasDelDiaError}
              onReload={recargarVentasDelDia}
            />

            {/* Grid de métricas secundarias */}
            <View style={styles.metricsGrid}>
              <TarjetaMetrica
                titulo="Promedio por Pedido"
                valor={`$${(metrics?.ticketPromedio ?? 0).toFixed(2)}`}
                subtitulo="Ticket promedio acumulado"
                icono="receipt"
                color="#3b82f6"
                containerStyle={{ width: metricCardWidth }}
              />
              <TarjetaMetrica
                titulo="Vendedor Estrella"
                valor={metrics?.vendedorEstrella?.nombre ?? 'Sin ventas'}
                subtitulo={`$${(metrics?.vendedorEstrella?.monto ?? 0).toFixed(2)} (${
                  metrics?.vendedorEstrella?.subpedidos ?? 0
                } subpedidos)`}
                icono="trophy"
                color="#f59e0b"
                containerStyle={{ width: metricCardWidth }}
              />
              <TarjetaMetrica
                titulo="Platillo Más Vendido"
                valor={metrics?.platilloMasVendido?.nombre ?? 'Sin ventas'}
                subtitulo={`${metrics?.platilloMasVendido?.cantidad ?? 0} unidades vendidas`}
                icono="flame"
                color="#ef4444"
                containerStyle={{ width: metricCardWidth }}
              />
              <TarjetaMetrica
                titulo="Hora Pico de Ventas"
                valor={metrics?.horaPico?.hora ?? 'N/A'}
                subtitulo={`${metrics?.horaPico?.pedidos ?? 0} pedidos en esta hora`}
                icono="time"
                color="#8b5cf6"
                containerStyle={{ width: metricCardWidth }}
              />
            </View>

            {/* 🚨 Sección de alertas del negocio */}
            <SeccionAlertas
              criticas={alertasCriticas}
              medias={alertasMedias}
              tieneAlertas={tieneAlertas}
            />

            {/* 🤖 Sección de predicción de reabastecimiento */}
            <SeccionPredicciones
              predicciones={predicciones}
              loading={loadingPredicciones}
              anchoTarjeta={predictionCardWidth}
            />

            {/* Gráfico de Ventas en el Tiempo */}
            <SeccionGrafica
              icono="trending-up"
              color="#10b981"
              titulo="Ventas en el Tiempo"
              subtitulo={`Evolución por ${dateFilter === 'hoy' || dateFilter === 'ayer' ? 'hora' : 'día'}`}
            >
              {metrics.ventasPorHora.length > 0 ? (
                <GraficaVentasTiempo
                  data={metrics.ventasPorHora.map((d: any) => ({
                    label: d.label,
                    total: d.monto ?? d.total ?? 0,
                  }))}
                  height={220}
                />
              ) : (
                <VistaSinDatos texto="Sin datos para el período seleccionado" />
              )}
            </SeccionGrafica>

            {/* Gráfico de Distribución de Ventas */}
            <SeccionGrafica
              icono="pie-chart"
              color="#3b82f6"
              titulo="Distribución de Ventas"
              subtitulo="Por tipo de origen"
            >
              {metrics.distribucionVentas.length > 0 ? (
                <GraficaDistribucionVentas
                  title=""
                  data={metrics.distribucionVentas.map((d: any, index: number) => ({
                    name: d.label || d.name || 'Origen',
                    population: Number(d.value || d.population || 0),
                    color: PALETA_GRAFICAS[index % PALETA_GRAFICAS.length],
                    legendFontColor: '#94a3b8',
                    legendFontSize: 12,
                  }))}
                />
              ) : (
                <VistaSinDatos texto="Sin datos de distribución" />
              )}
            </SeccionGrafica>

            {/* Top 5 Platillos Más Vendidos */}
            <SeccionGrafica
              icono="bar-chart"
              color="#f59e0b"
              titulo="Top 5 Platillos Más Vendidos"
              subtitulo="Por unidades vendidas"
            >
              {metrics.topPlatillos.length > 0 ? (
                <GraficaTopProductos title="" data={metrics.topPlatillos} />
              ) : (
                <VistaSinDatos texto="Sin datos de platillos" />
              )}
            </SeccionGrafica>
          </ScrollView>
        </View>
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080A0F',
    overflow: 'hidden',
  },
  contentLayer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#080A0F',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080A0F',
  },
  loadingText: {
    color: '#B6BCC8',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 15,
    backgroundColor: 'rgba(12,15,23,0.93)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(223,229,240,0.12)',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.23,
    shadowRadius: 18,
    zIndex: 30,
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
    color: '#F4F0E8',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
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
    backgroundColor: '#151E31',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(151,181,237,0.24)',
    elevation: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 26,
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
});

export default PantallaMetricasDatos;
