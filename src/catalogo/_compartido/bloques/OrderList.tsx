import React, { useCallback, useMemo, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';
import { COLORS, SPACING } from '../../../compartido/constantes/theme';

import {
  OrderItem,
  PendingItem,
} from '../../../plataforma/dominios/marisqueria/mesero/useMeseroLogic';
import { Product } from '../../../plataforma/dominios/marisqueria/mesero/useProductSelector';
import { OrderItemCard } from './OrderItemCard';

type OrderListProps = {
  pending: PendingItem[];
  liveItems: OrderItem[];
  getProduct: (id: string) => Product | null;
  onIncPending: (index: number) => void;
  onRemovePending: (index: number) => void;
  onMarkDelivered?: (itemId: string) => void;
  onDoubleSwipeUp?: () => void;
};

function OrderListComponent(props: OrderListProps) {
  const { pending, liveItems, onIncPending, onRemovePending, onMarkDelivered, onDoubleSwipeUp } =
    props;

  // Detección de gesto: 2 deslizadas largas consecutivas hacia arriba
  const lastScrollY = useRef(0);
  const swipeCount = useRef(0);
  const swipeTimer = useRef<NodeJS.Timeout | null>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const deltaY = lastScrollY.current - currentY;

    // Detectar deslizada larga hacia arriba (delta > media pantalla ~200px)
    if (deltaY > 200) {
      swipeCount.current += 1;

      // Limpiar timer anterior
      if (swipeTimer.current) {
        clearTimeout(swipeTimer.current);
      }

      // Si es la segunda deslizada, disparar evento
      if (swipeCount.current >= 2) {
        onDoubleSwipeUp?.();
        swipeCount.current = 0;
      } else {
        // Resetear contador después de 1 segundo si no hay segunda deslizada
        swipeTimer.current = setTimeout(() => {
          swipeCount.current = 0;
        }, 1000);
      }
    }

    lastScrollY.current = currentY;
  };

  // Agrupar items por estado con deduplicación (SIN TRANSICIONES COMPLEJAS)
  const groupedItems = useMemo(() => {
    const groups: Record<string, any[]> = {
      en_cocina: [],
      preparando: [],
      listo: [],
      entregado: [],
    };

    // Crear un mapa para evitar duplicados por ID
    const itemsById = new Map<string, any>();

    liveItems.forEach((it: any) => {
      if (it?.id && !itemsById.has(it.id)) {
        itemsById.set(it.id, it);
      }
    });

    // Procesar items únicos
    Array.from(itemsById.values()).forEach((it: any) => {
      const estado = String(it?.estado || 'en_cocina').toLowerCase();
      const normalizedState = estado === 'nuevo' ? 'en_cocina' : estado;

      if (normalizedState === 'en_cocina') {
        groups.en_cocina.push(it);
      } else if (normalizedState === 'en_preparacion' || normalizedState === 'preparando') {
        groups.preparando.push(it);
      } else if (normalizedState === 'listo') {
        groups.listo.push(it);
      } else if (normalizedState === 'entregado') {
        groups.entregado.push(it);
      }
    });

    return groups;
  }, [liveItems]);

  // Memoizar configuración de estados
  const getStatusConfig = useCallback((status: string) => {
    switch (status) {
      case 'en_cocina':
        return {
          label: 'EN COCINA',
          color: COLORS.warning,
          bgColor: COLORS.alpha.warning20,
          dotColor: COLORS.warning,
        };
      case 'preparando':
        return {
          label: 'PREPARANDO',
          color: COLORS.info,
          bgColor: COLORS.alpha.primary20,
          dotColor: COLORS.info,
        };
      case 'listo':
        return {
          label: 'LISTO',
          color: COLORS.success,
          bgColor: COLORS.alpha.success20,
          dotColor: COLORS.success,
        };
      case 'entregado':
        return {
          label: 'ENTREGADO',
          color: COLORS.success,
          bgColor: COLORS.alpha.success20,
          dotColor: COLORS.success,
        };
      default:
        return {
          label: 'NUEVO',
          color: COLORS.text.muted,
          bgColor: COLORS.alpha.primary10,
          dotColor: COLORS.text.muted,
        };
    }
  }, []);

  return (
    <View style={{ flex: 6.88, paddingHorizontal: SPACING.md - 3, paddingTop: SPACING.sm - 2 }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* PENDING ITEMS */}
          {pending.map((it, idx) => (
            <OrderItemCard
              key={`pending-${idx}`}
              item={it}
              statusConfig={getStatusConfig('nuevo')}
              isPending={true}
              onInc={() => onIncPending(idx)}
              onRemove={() => onRemovePending(idx)}
            />
          ))}

          {/* EN COCINA */}
          {groupedItems.en_cocina.length > 0 && (
            <View style={{ marginTop: pending.length > 0 ? 6 : 0 }}>
              {groupedItems.en_cocina.map((it: any) => (
                <OrderItemCard key={it.id} item={it} statusConfig={getStatusConfig('en_cocina')} />
              ))}
            </View>
          )}

          {/* PREPARANDO */}
          {groupedItems.preparando.length > 0 && (
            <View
              style={{ marginTop: pending.length > 0 || groupedItems.en_cocina.length > 0 ? 6 : 0 }}
            >
              {groupedItems.preparando.map((it: any) => (
                <OrderItemCard key={it.id} item={it} statusConfig={getStatusConfig('preparando')} />
              ))}
            </View>
          )}

          {/* LISTO */}
          {groupedItems.listo.length > 0 && (
            <View
              style={{
                marginTop:
                  pending.length > 0 ||
                  groupedItems.en_cocina.length > 0 ||
                  groupedItems.preparando.length > 0
                    ? 6
                    : 0,
              }}
            >
              {groupedItems.listo.map((it: any) => (
                <OrderItemCard
                  key={it.id}
                  item={it}
                  statusConfig={getStatusConfig('listo')}
                  onAction={() => onMarkDelivered?.(it.id)}
                  actionLabel="ENTREGAR"
                  actionColor="#10b981"
                  actionIcon="checkmark-circle"
                />
              ))}
            </View>
          )}

          {/* ENTREGADO */}
          {groupedItems.entregado.length > 0 && (
            <View style={{ marginTop: 6, opacity: 0.6 }}>
              {groupedItems.entregado.map((it: any) => (
                <OrderItemCard
                  key={it.id}
                  item={it}
                  statusConfig={getStatusConfig('entregado')}
                  actionLabel="✓"
                  actionColor="transparent"
                  actionIcon="checkmark-done"
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

export const OrderList = React.memo(OrderListComponent);
