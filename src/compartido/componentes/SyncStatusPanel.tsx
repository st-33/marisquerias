import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constantes/theme';

export type SyncEvent = {
  type: 'local_operation' | 'remote_snapshot' | 'eco_local_aplicado';
  timestamp: number;
  mesaId: string;
  itemsCount: number;
  operation?: string;
};

type SyncStatusPanelProps = {
  isOnline: boolean;
  lastSync: number;
  events: SyncEvent[];
  mesaId: string | null;
};

export function SyncStatusPanel({ isOnline, lastSync, events, mesaId }: SyncStatusPanelProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEventIcon = (type: SyncEvent['type']) => {
    switch (type) {
      case 'local_operation':
        return { name: 'arrow-up-circle' as const, color: COLORS.primary };
      case 'remote_snapshot':
        return { name: 'arrow-down-circle' as const, color: COLORS.success };
      case 'eco_local_aplicado':
        return { name: 'checkmark-circle' as const, color: COLORS.warning };
    }
  };

  const getEventLabel = (type: SyncEvent['type']) => {
    switch (type) {
      case 'local_operation':
        return 'LOCAL';
      case 'remote_snapshot':
        return 'REMOTO';
      case 'eco_local_aplicado':
        return 'ECO';
    }
  };

  const timeSinceLastSync = lastSync > 0 ? Date.now() - lastSync : null;
  const syncStatus = timeSinceLastSync !== null && timeSinceLastSync < 5000 ? 'ACTIVO' : 'IDLE';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <Ionicons
            name={isOnline ? 'wifi' : 'wifi-outline'}
            size={16}
            color={isOnline ? COLORS.success : COLORS.error}
          />
          <Text style={[styles.statusText, { color: isOnline ? COLORS.success : COLORS.error }]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Ionicons
            name="sync"
            size={16}
            color={syncStatus === 'ACTIVO' ? COLORS.primary : COLORS.text.muted}
          />
          <Text
            style={[
              styles.statusText,
              { color: syncStatus === 'ACTIVO' ? COLORS.primary : COLORS.text.muted },
            ]}
          >
            {syncStatus}
          </Text>
        </View>

        {mesaId && (
          <View style={styles.mesaBadge}>
            <Text style={styles.mesaText}>Mesa {mesaId}</Text>
          </View>
        )}
      </View>

      {lastSync > 0 && <Text style={styles.lastSyncText}>Última sync: {formatTime(lastSync)}</Text>}

      <ScrollView style={styles.eventsContainer} showsVerticalScrollIndicator={false}>
        {events.length === 0 ? (
          <Text style={styles.emptyText}>Sin eventos recientes</Text>
        ) : (
          events.map((event, index) => {
            const icon = getEventIcon(event.type);
            const label = getEventLabel(event.type);

            return (
              <View key={`${event.timestamp}-${index}`} style={styles.eventRow}>
                <Ionicons name={icon.name} size={14} color={icon.color} />
                <Text style={[styles.eventLabel, { color: icon.color }]}>{label}</Text>
                <Text style={styles.eventTime}>{formatTime(event.timestamp)}</Text>
                <Text style={styles.eventCount}>{event.itemsCount} items</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bg.elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.bg.elevated,
    maxHeight: 180,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bg.secondary,
  },
  statusText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  mesaBadge: {
    marginLeft: 'auto',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.alpha.primary20,
  },
  mesaText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary,
  },
  lastSyncText: {
    fontSize: 9,
    color: COLORS.text.muted,
    marginBottom: SPACING.xs,
  },
  eventsContainer: {
    flex: 1,
  },
  emptyText: {
    fontSize: 10,
    color: COLORS.text.muted,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg.secondary,
  },
  eventLabel: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
    minWidth: 50,
  },
  eventTime: {
    fontSize: 9,
    color: COLORS.text.secondary,
    flex: 1,
  },
  eventCount: {
    fontSize: 9,
    color: COLORS.text.muted,
  },
});
