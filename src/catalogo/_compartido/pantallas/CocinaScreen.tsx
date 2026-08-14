/**
 * 🍳 COCINA SCREEN (KDS - Kitchen Display System)
 * Componente visual puro para alimentos y bebidas
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../../../plataforma/core/store';
import { getRtdb } from '../../../plataforma/core/firebase';
import { useNotifications } from '../../../compartido/hooks/useNotifications';
import { useThemedColors } from '../../../compartido/hooks/useThemedColors';
import { useAppTheme } from '../../../compartido/temas';
import { useStoreNotifications } from '../../../compartido/hooks/useStoreNotifications';
import { TarjetaComanda } from '../bloques/TarjetaComanda';
import { useCocinaLogic } from '../../../plataforma/dominios/marisqueria/cocina';
import { logger } from '../../../compartido/utils/logger';

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
    gap: 12,
  },
  statBadge: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
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
  themeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  themeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
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

export function CocinaScreen() {
  const tenantPath = useStore((s) => s.sesion.tenantPath) || '';
  const ds = useStore((s) => s.dataSources);
  const db = useMemo(() => getRtdb(ds?.operacionUrl || undefined), [ds]);
  const COLORS = useThemedColors();
  const { isElite } = useAppTheme();
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
  const { orders, stats, loading, actions } = useCocinaLogic({
    db,
    tenantPath,
    urgentThresholdMinutes: 15, // Alerta roja después de 15 minutos
    autoDescuentoInventario: inventoryAutoDiscount,
  });

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: COLORS.text.tertiary }]}>Cargando cocina...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg.primary }]}>
      {/* Header con estadísticas */}
      <View
        style={[
          styles.header,
          { backgroundColor: COLORS.bg.surface, borderBottomColor: COLORS.bg.elevated },
        ]}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="restaurant" size={24} color={COLORS.primary} />
          <Text style={[styles.title, { color: COLORS.text.primary }]}>Cocina (KDS)</Text>
          <View
            style={[
              styles.themeBadge,
              { backgroundColor: COLORS.alpha.primary20, borderColor: COLORS.primary },
            ]}
          >
            <Ionicons
              name={isElite ? 'sparkles' : 'color-palette-outline'}
              size={13}
              color={COLORS.primary}
            />
            <Text style={[styles.themeBadgeText, { color: COLORS.primary }]}>
              {isElite ? 'ELITE' : 'CLÁSICO'}
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statBadge,
              { backgroundColor: COLORS.bg.tertiary, borderColor: COLORS.bg.elevated },
            ]}
          >
            <Text style={[styles.statValue, { color: COLORS.text.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: COLORS.text.muted }]}>Órdenes</Text>
          </View>
          {stats.urgentes > 0 && (
            <View
              style={[
                styles.statBadge,
                styles.statBadgeUrgent,
                { backgroundColor: COLORS.error, borderColor: COLORS.error },
              ]}
            >
              <Ionicons name="alert-circle" size={16} color={COLORS.text.primary} />
              <Text style={[styles.statValue, { color: COLORS.text.primary }]}>{stats.urgentes}</Text>
              <Text style={[styles.statLabel, { color: COLORS.text.primary }]}>Urgentes</Text>
            </View>
          )}
          <View
            style={[
              styles.statBadge,
              { backgroundColor: COLORS.bg.tertiary, borderColor: COLORS.bg.elevated },
            ]}
          >
            <Text style={[styles.statValue, { color: COLORS.text.primary }]}>{stats.itemsPendientes}</Text>
            <Text style={[styles.statLabel, { color: COLORS.text.muted }]}>Pendientes</Text>
          </View>
        </View>
      </View>

      {/* Tablero Kanban */}
      <ScrollView
        style={[styles.board, { backgroundColor: COLORS.bg.primary }]}
        contentContainerStyle={styles.boardContent}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle" size={64} color={COLORS.success} />
            <Text style={[styles.emptyStateText, { color: COLORS.text.primary }]}>Sin órdenes activas</Text>
            <Text style={[styles.emptyStateSubtext, { color: COLORS.text.muted }]}>
              Las comandas aparecerán aquí cuando se envíen desde Mesera
            </Text>
          </View>
        ) : (
          orders.map((order) => (
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

export default CocinaScreen;
