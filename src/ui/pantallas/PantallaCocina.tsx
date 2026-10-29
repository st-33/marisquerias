/**
 * 🍳 COCINA SCREEN (KDS - Kitchen Display System)
 * Componente visual puro para alimentos y bebidas
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore, useProductos } from '../../sistema/store';
import { useNotificaciones as useNotifications } from '../../compartido/hooks/useNotificaciones';
import { useNotificacionesAlmacen as useStoreNotifications } from '../../compartido/hooks/useNotificacionesAlmacen';
import { TarjetaComanda } from '../bloques/TarjetaComanda';
import { useLogicaCocina } from '../../roles/logica/cocina';
import { logger } from '../../sistema/monitoreo';

import { filtrarComandasPorEstacion } from '../../roles/logica/cocina/filtrosKDS';

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
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBadge: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statBadgeUrgent: {
    backgroundColor: '#dc2626',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 12,
  },
  board: {
    flex: 1,
  },
  boardContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export interface PantallaCocinaProps {
  estacion?: string;
}

export function PantallaCocina({ estacion }: PantallaCocinaProps = {}) {
  const productos = useProductos();
  const inventoryAutoDiscount =
    useStore((s) => s.negocio.features?.inventory_auto_discount?.enabled) === true;

  // 🔔 Sistema de notificaciones (solo audio en cocina)
  const { notify } = useNotifications();

  // 👂 Detectar cambios en store (sin crear listeners adicionales)
  useStoreNotifications({
    enabled: true,
    onNotification: React.useCallback(
      ({ mesaId, type }) => {
        logger.debug('[CocinaScreen.tsx]', '🔔 Notificación', { mesaId, type });
        // Solo audio, sin toast
        notify({ type, mesaId }, 'cocina');
      },
      [notify]
    ),
  });

  // 🧠 CEREBRO: Hook de lógica pura (usa repositorios)
  const { orders, stats, loading, actions } = useLogicaCocina({
    urgentThresholdMinutes: 15, // Alerta roja después de 15 minutos
    autoDescuentoInventario: inventoryAutoDiscount,
  });

  // Filtrado por estación si está definida
  const comandasFiltradas = useMemo(
    () => filtrarComandasPorEstacion(orders, productos, estacion),
    [orders, productos, estacion]
  );

  const statsFiltradas = useMemo(() => {
    if (!estacion) return stats;
    const total = comandasFiltradas.length;
    const urgentes = comandasFiltradas.filter((o) => o.esUrgente).length;
    const itemsPendientes = comandasFiltradas.reduce((acc, o) => acc + o.itemsPendientes, 0);
    const itemsListos = comandasFiltradas.reduce((acc, o) => acc + o.itemsListos, 0);
    return { total, urgentes, itemsPendientes, itemsListos };
  }, [comandasFiltradas, stats, estacion]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando cocina...</Text>
        </View>
      </View>
    );
  }

  const tituloHeader = estacion
    ? `KDS — ${estacion.charAt(0).toUpperCase() + estacion.slice(1)}`
    : 'Cocina (KDS)';

  return (
    <View style={styles.container}>
      {/* Header con estadísticas */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="restaurant" size={24} color="#ffffff" />
          <Text style={styles.title}>{tituloHeader}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <Text style={styles.statValue}>{statsFiltradas.total}</Text>
            <Text style={styles.statLabel}>Órdenes</Text>
          </View>
          {statsFiltradas.urgentes > 0 && (
            <View style={[styles.statBadge, styles.statBadgeUrgent]}>
              <Ionicons name="alert-circle" size={16} color="#ffffff" />
              <Text style={styles.statValue}>{statsFiltradas.urgentes}</Text>
              <Text style={styles.statLabel}>Urgentes</Text>
            </View>
          )}
          <View style={styles.statBadge}>
            <Text style={styles.statValue}>{statsFiltradas.itemsPendientes}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
        </View>
      </View>

      {/* Tablero Kanban */}
      <ScrollView style={styles.board} contentContainerStyle={styles.boardContent}>
        {comandasFiltradas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle" size={64} color="#374151" />
            <Text style={styles.emptyStateText}>Sin órdenes activas</Text>
            <Text style={styles.emptyStateSubtext}>
              {estacion
                ? `No hay comandas pendientes para la estación ${estacion}`
                : 'Las comandas aparecerán aquí cuando se envíen desde Mesera'}
            </Text>
          </View>
        ) : (
          comandasFiltradas.map((order) => (
            <TarjetaComanda
              key={order.id}
              order={order}
              onStartItem={(itemId) => actions.startItem(order.id, itemId)}
              onFinishItem={(itemId) => actions.finishItem(order.id, itemId)}
              onFinishOrder={() => actions.finishOrder(order.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
export default PantallaCocina;
export const CocinaScreen = PantallaCocina;
