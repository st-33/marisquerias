import React, { useCallback, useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SPACING } from '../../../compartido/constantes/theme';
import { useThemedColors } from '../../../compartido/hooks/useThemedColors';

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
  onDecPending: (index: number) => void;
  onRemovePending: (index: number) => void;
  onMarkDelivered?: (itemId: string) => void;
};

function OrderListComponent(props: OrderListProps) {
  const { pending, liveItems, onIncPending, onDecPending, onRemovePending, onMarkDelivered } =
    props;
  const COLORS = useThemedColors();

  const groupedItems = useMemo(() => {
    const groups: Record<string, any[]> = {
      en_cocina: [],
      preparando: [],
      listo: [],
      entregado: [],
    };

    const itemsById = new Map<string, any>();
    liveItems.forEach((item: any) => {
      if (item?.id && !itemsById.has(item.id)) itemsById.set(item.id, item);
    });

    Array.from(itemsById.values()).forEach((item: any) => {
      const estado = String(item?.estado || 'en_cocina').toLowerCase();
      if (estado === 'en_cocina' || estado === 'nuevo') groups.en_cocina.push(item);
      else if (estado === 'en_preparacion' || estado === 'preparando') groups.preparando.push(item);
      else if (estado === 'listo') groups.listo.push(item);
      else if (estado === 'entregado') groups.entregado.push(item);
    });

    return groups;
  }, [liveItems]);

  const getStatusConfig = useCallback(
    (status: string) => {
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
    },
    [COLORS]
  );

  const hasLiveItems = liveItems.length > 0;

  return (
    <View style={{ flex: 1, paddingHorizontal: 2 }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SPACING.xs }}
      >
        {pending.length > 0 && (
          <Text
            style={{
              color: COLORS.text.muted,
              fontSize: 12,
              fontWeight: '800',
              letterSpacing: 0.35,
              marginBottom: 7,
            }}
          >
            NUEVOS EN COMANDA
          </Text>
        )}

        {pending.map((item, index) => (
          <OrderItemCard
            key={`pending-${item.id ?? index}`}
            item={item}
            statusConfig={getStatusConfig('nuevo')}
            isPending={true}
            onInc={() => onIncPending(index)}
            onDec={() => onDecPending(index)}
            onRemove={() => onRemovePending(index)}
          />
        ))}

        {hasLiveItems && (
          <Text
            style={{
              color: COLORS.text.muted,
              fontSize: 12,
              fontWeight: '800',
              letterSpacing: 0.35,
              marginTop: pending.length > 0 ? 8 : 0,
              marginBottom: 7,
            }}
          >
            EN CURSO
          </Text>
        )}

        {groupedItems.en_cocina.map((item: any) => (
          <OrderItemCard key={item.id} item={item} statusConfig={getStatusConfig('en_cocina')} />
        ))}
        {groupedItems.preparando.map((item: any) => (
          <OrderItemCard key={item.id} item={item} statusConfig={getStatusConfig('preparando')} />
        ))}
        {groupedItems.listo.map((item: any) => (
          <OrderItemCard
            key={item.id}
            item={item}
            statusConfig={getStatusConfig('listo')}
            onAction={() => onMarkDelivered?.(item.id)}
            actionLabel="ENTREGAR"
            actionColor={COLORS.success}
            actionIcon="checkmark-circle"
          />
        ))}
        {groupedItems.entregado.map((item: any) => (
          <OrderItemCard
            key={item.id}
            item={item}
            statusConfig={getStatusConfig('entregado')}
            actionLabel="✓"
            actionColor="transparent"
            actionIcon="checkmark-done"
          />
        ))}
      </ScrollView>
    </View>
  );
}

export const OrderList = React.memo(OrderListComponent);
