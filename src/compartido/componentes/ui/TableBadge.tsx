/**
 * COMPONENTE REUTILIZABLE: Badge para mesas
 * Muestra contador de items, estado, y notificaciones visuales
 * Uso: Mesera, Admin (Gestión de Mesas), Reportes
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type TableIndicator = {
  tipo: 'badge' | 'dot' | 'pulse' | 'icon';
  colorHex: string;
  valor?: number;
  icono?: string;
  pulsar: boolean;
};

type TableBadgeProps = {
  count?: number; // Número de items
  hasReady?: boolean; // Hay items listos para entregar
  hasPending?: boolean; // Hay items pendientes de enviar
  variant?: 'compact' | 'full'; // Tamaño
  indicator?: TableIndicator | null; // Indicador visual externo (stickers)
};

export function TableBadge({
  count = 0,
  hasReady = false,
  hasPending = false,
  variant = 'compact',
  indicator = null,
}: TableBadgeProps) {
  const showDefaultBadges = count > 0 || hasReady || hasPending;
  const showIndicator = Boolean(indicator);

  if (!showDefaultBadges && !showIndicator) return null;

  const renderIndicator = () => {
    if (!indicator) return null;

    const { tipo, colorHex, valor, icono, pulsar } = indicator;

    if (tipo === 'badge') {
      return (
        <View
          style={[
            styles.badge,
            styles.indicatorBadge,
            { backgroundColor: colorHex, shadowColor: colorHex, shadowOpacity: pulsar ? 0.5 : 0 },
          ]}
        >
          <Text style={styles.indicatorBadgeText}>{valor ?? '!'}</Text>
        </View>
      );
    }

    if (tipo === 'icon') {
      return (
        <View
          style={[
            styles.badge,
            styles.indicatorIcon,
            {
              borderColor: colorHex,
              backgroundColor: `${colorHex}22`,
              shadowColor: colorHex,
              shadowOpacity: pulsar ? 0.35 : 0,
            },
          ]}
        >
          <Ionicons name={(icono as any) ?? 'alert-circle'} size={12} color={colorHex} />
        </View>
      );
    }

    // dot o pulse
    return (
      <View
        style={[
          styles.badge,
          styles.indicatorDot,
          {
            backgroundColor: tipo === 'dot' ? colorHex : `${colorHex}40`,
            shadowColor: colorHex,
            shadowOpacity: pulsar ? 0.45 : 0,
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.container}>
      {showDefaultBadges && (
        <View style={styles.badgeStack}>
          {count > 0 && (
            <View style={[styles.badge, styles.countBadge]}>
              <Text style={styles.countText}>{count}</Text>
            </View>
          )}

          {hasReady && (
            <View style={[styles.badge, styles.readyBadge]}>
              <Ionicons name="checkmark-circle" size={12} color="#ffffff" />
            </View>
          )}

          {hasPending && (
            <View style={[styles.badge, styles.pendingBadge]}>
              <Ionicons name="time" size={12} color="#ffffff" />
            </View>
          )}
        </View>
      )}

      {renderIndicator()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    gap: 4,
  },
  badgeStack: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    backgroundColor: '#3b82f6',
  },
  countText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  readyBadge: {
    backgroundColor: '#16a34a',
  },
  pendingBadge: {
    backgroundColor: '#f59e0b',
  },
  indicatorBadge: {
    minWidth: 22,
  },
  indicatorBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  indicatorIcon: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
});
