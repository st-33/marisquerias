/**
 * 👐 MANOS - TARJETA DE COMANDA
 * Componente visual con colores dinámicos según tema
 *
 * SEPARACIÓN SAGRADA:
 * - Este componente NUNCA consulta Firebase
 * - Solo recibe datos y callbacks del cerebro (useCocinaLogic)
 */

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useThemedColors } from '../../compartido/hooks/useThemedColors';
import { etiquetaEstadoLogistico } from '../../logica/dominio/logistica';
import type { OrdenCocina } from '../../sistema/motores/KitchenQueueEngine';
import { AnimatedPressable } from './AnimatedPressable';
import { Badge } from './Badge';

type TarjetaComandaProps = {
  order: OrdenCocina;
  onStartItem: (itemId: string) => void;
  onFinishItem: (itemId: string) => void;
  onFinishOrder: () => void;
};

// ⏱️ CRONÓMETRO DE ORDEN (Header)
function OrderTimer({ baseTimestamp, isUrgent }: { baseTimestamp: number; isUrgent: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const COLORS = useThemedColors();

  useEffect(() => {
    const calculateElapsed = () => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - baseTimestamp) / 1000);
      setElapsed(elapsedSeconds);
    };
    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [baseTimestamp]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <View
      style={[
        staticStyles.timer,
        { backgroundColor: COLORS.bg.elevated },
        isUrgent && staticStyles.timerUrgent,
      ]}
    >
      <Ionicons name="time-outline" size={16} color={isUrgent ? '#ffffff' : COLORS.text.muted} />
      <Text
        style={[
          staticStyles.timerText,
          { color: COLORS.text.tertiary },
          isUrgent && staticStyles.timerTextUrgent,
        ]}
      >
        {mins}:{secs.toString().padStart(2, '0')}
      </Text>
    </View>
  );
}

// ⏱️ CRONÓMETRO DE ITEM (Individual)
function ItemTimer({ startedAt, prepMin }: { startedAt?: number; prepMin?: number }) {
  const [elapsed, setElapsed] = useState(0);
  const COLORS = useThemedColors();

  useEffect(() => {
    if (!startedAt) return;
    const calculateElapsed = () => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startedAt) / 1000);
      setElapsed(elapsedSeconds);
    };
    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  if (!startedAt || !prepMin) return null;

  const limitSeconds = prepMin * 60;
  const isOverLimit = elapsed >= limitSeconds;
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <View
      style={[
        staticStyles.itemTimer,
        { backgroundColor: COLORS.bg.elevated },
        isOverLimit && staticStyles.itemTimerOverLimit,
      ]}
    >
      <Ionicons
        name="timer-outline"
        size={12}
        color={isOverLimit ? '#ffffff' : COLORS.text.muted}
      />
      <Text
        style={[
          staticStyles.itemTimerText,
          { color: COLORS.text.muted },
          isOverLimit && staticStyles.itemTimerTextOverLimit,
        ]}
      >
        {mins}:{secs.toString().padStart(2, '0')}
      </Text>
    </View>
  );
}

export function TarjetaComanda({
  order,
  onStartItem,
  onFinishItem,
  onFinishOrder,
}: TarjetaComandaProps) {
  const COLORS = useThemedColors();

  // Estilos dinámicos según tema
  const themedStyles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: COLORS.bg.tertiary,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: COLORS.bg.elevated,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 4,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.bg.elevated,
        },
        originLabel: {
          color: COLORS.text.primary,
          fontSize: 16,
          fontWeight: '700',
        },
        itemRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: COLORS.bg.surface,
          padding: 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: 'transparent',
          marginBottom: 6,
        },
        itemName: {
          color: COLORS.text.primary,
          fontSize: 15,
          fontWeight: '700',
        },
        vMiniChip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: 'rgba(255,255,255,0.05)',
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        },
        vMiniDot: {
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: COLORS.primary,
        },
        vMiniChipText: {
          color: COLORS.text.muted,
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'uppercase',
        },
        quantityBadge: {
          backgroundColor: COLORS.primary,
          minWidth: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 8,
          marginRight: 4,
        },
      }),
    [COLORS]
  );

  const getOriginIcon = () => {
    switch (order.tipo) {
      case 'mesa':
        return 'restaurant' as const;
      case 'para_llevar':
        return 'bag-handle' as const;
      case 'delivery':
        return 'bicycle' as const;
      default:
        return 'help-circle' as const;
    }
  };

  const getOriginLabel = () => {
    switch (order.tipo) {
      case 'mesa':
        return `Mesa ${order.mesaId || '?'}`;
      case 'para_llevar':
        return 'Para Llevar';
      case 'delivery':
        return 'Delivery';
      default:
        return 'Orden';
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify().damping(16)}
      exiting={FadeOutUp.duration(300)}
      style={[themedStyles.card, order.esUrgente && staticStyles.cardUrgent]}
    >
      {/* Header */}
      <View style={themedStyles.header}>
        <View style={staticStyles.headerLeft}>
          <Ionicons name={getOriginIcon()} size={20} color={COLORS.text.primary} />
          <Text style={themedStyles.originLabel}>{getOriginLabel()}</Text>
          {order.logistica?.requiereEntrega && (
            <View style={{ marginLeft: 4, maxWidth: 180 }}>
              <Text
                numberOfLines={1}
                style={{ color: COLORS.primary, fontSize: 10, fontWeight: '900' }}
              >
                A DOMICILIO · {etiquetaEstadoLogistico(order.logistica.estado)}
              </Text>
              {order.logistica.referenciaMision && (
                <Text
                  numberOfLines={1}
                  style={{ color: COLORS.text.muted, fontSize: 9, marginTop: 2 }}
                >
                  {order.logistica.referenciaMision}
                </Text>
              )}
            </View>
          )}
        </View>
        <OrderTimer
          baseTimestamp={order.sentToKitchenAt || order.createdAt}
          isUrgent={order.esUrgente}
        />
        {order.esUrgente && <Badge label="URGENTE" backgroundColor="#dc2626" />}
      </View>

      {/* Items */}
      <View style={staticStyles.itemsContainer}>
        {order.items.map((item) => (
          <View
            key={item.id}
            style={[
              themedStyles.itemRow,
              item.estado === 'en_preparacion' && staticStyles.itemRowActive,
            ]}
          >
            <View style={staticStyles.itemInfo}>
              <View style={staticStyles.itemHeader}>
                {(item.cantidad > 1 || (item.idsAgrupados?.length || 0) > 1) && (
                  <View
                    style={[
                      themedStyles.quantityBadge,
                      item.estado === 'en_preparacion' && { backgroundColor: '#1d4ed8' },
                    ]}
                  >
                    <Text style={staticStyles.quantityBadgeText}>{item.cantidad}</Text>
                  </View>
                )}

                <Text
                  style={[
                    themedStyles.itemName,
                    item.estado === 'en_preparacion' && { color: '#60a5fa' },
                  ]}
                >
                  {item.nombre}
                </Text>
                {(item.variantLabels?.length || item.variantes) && (
                  <View style={staticStyles.variantsChipContainer}>
                    {(item.variantLabels?.length
                      ? item.variantLabels
                      : Object.values(item.variantes || {}).flat()
                    ).map((v, idx) => (
                      <View key={idx} style={themedStyles.vMiniChip}>
                        <View style={themedStyles.vMiniDot} />
                        <Text style={themedStyles.vMiniChipText}>{v}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {item.notas && <Text style={staticStyles.itemNotes}>📝 {item.notas}</Text>}
                {item.estado === 'en_preparacion' && (
                  <ItemTimer startedAt={item.startedAt} prepMin={item.prepMin} />
                )}
              </View>
            </View>

            {/* Botones de acción por item */}
            <View style={staticStyles.itemActions}>
              {(item.estado === 'nuevo' || item.estado === 'en_cocina') && (
                <AnimatedPressable
                  onPress={() => onStartItem(item.id)}
                  style={[staticStyles.btnStart]}
                >
                  <Ionicons name="play" size={20} color="#ffffff" />
                  <Text style={staticStyles.btnText}>Comenzar</Text>
                </AnimatedPressable>
              )}
              {item.estado === 'en_preparacion' && (
                <AnimatedPressable
                  onPress={() => onFinishItem(item.id)}
                  style={[staticStyles.btnFinish]}
                >
                  <Ionicons name="checkmark" size={20} color="#ffffff" />
                  <Text style={staticStyles.btnTextFinish}>Listo</Text>
                </AnimatedPressable>
              )}
              {item.estado === 'listo' && (
                <View style={staticStyles.badgeReady}>
                  <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                  <Text style={staticStyles.badgeReadyText}>Listo</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Footer con botón de completar orden */}
      {order.itemsPendientes === 0 && order.itemsListos > 0 && (
        <AnimatedPressable onPress={onFinishOrder} style={[staticStyles.btnCompleteOrder]}>
          <Ionicons name="checkmark-done" size={18} color="#ffffff" />
          <Text style={staticStyles.btnCompleteOrderText}>Orden Completa</Text>
        </AnimatedPressable>
      )}
    </Animated.View>
  );
}

// Estilos estáticos (no cambian con tema)
const staticStyles = StyleSheet.create({
  cardUrgent: {
    borderColor: '#dc2626',
    borderWidth: 2,
    backgroundColor: '#351216',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerUrgent: {
    backgroundColor: '#dc2626',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  timerTextUrgent: {
    color: '#ffffff',
  },
  itemsContainer: {
    gap: 8,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  variantsChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  itemNotes: {
    color: '#f59e0b',
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  quantityBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  itemActions: {
    marginLeft: 8,
  },
  btnStart: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 110,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  btnFinish: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 100,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnTextFinish: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  badgeReady: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeReadyText: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '700',
  },
  btnCompleteOrder: {
    marginTop: 12,
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnCompleteOrderText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  itemTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  itemTimerOverLimit: {
    backgroundColor: '#dc2626',
  },
  itemTimerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemTimerTextOverLimit: {
    color: '#ffffff',
  },
  itemRowActive: {
    backgroundColor: '#1e3a8a25',
    borderColor: '#3b82f6',
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
});
