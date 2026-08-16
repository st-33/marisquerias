import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { RADIUS, SPACING } from '../../../compartido/constantes/theme';
import { useThemedColors, useThemedShadows } from '../../../compartido/hooks/useThemedColors';

type OrderItemCardProps = {
  item: any;
  statusConfig: { label: string; color: string; bgColor: string; dotColor: string };
  isPending?: boolean;
  onInc?: () => void;
  onDec?: () => void;
  onRemove?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  actionColor?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
};

export const OrderItemCard = ({
  item,
  statusConfig,
  isPending,
  onInc,
  onDec,
  onRemove,
  onAction,
  actionLabel,
  actionColor,
  actionIcon,
}: OrderItemCardProps) => {
  const COLORS = useThemedColors();
  const SHADOWS = useThemedShadows();
  const resolvedActionColor = actionColor ?? COLORS.primary;
  const qty = Math.max(1, Number(item.qty ?? item.cantidad ?? 1));
  const price = Number(item.price ?? item.precio ?? 0);
  const totalNum = qty * price;
  const total = Number.isInteger(totalNum) ? `$${totalNum}` : `$${totalNum.toFixed(2)}`;
  const name = String(item.name ?? item.nombre ?? 'Item');

  let variants: string[] = [];
  if (Array.isArray(item.variantLabels)) {
    variants = item.variantLabels;
  } else if (isPending && Array.isArray(item.simpleVariants)) {
    variants = item.simpleVariants;
  } else if (item.variantes && typeof item.variantes === 'object') {
    variants = Object.values(item.variantes).flat().map(String);
  }

  const statusLabel = statusConfig.label === 'NUEVO' ? 'Nueva' : statusConfig.label;

  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      layout={Layout.springify()}
      style={{
        backgroundColor: COLORS.bg.secondary,
        borderRadius: RADIUS.lg,
        paddingVertical: 10,
        paddingHorizontal: 12,
        minHeight: 64,
        borderWidth: 1,
        borderColor: COLORS.bg.elevated,
        borderLeftWidth: 3,
        borderLeftColor: statusConfig.dotColor,
        marginBottom: 8,
        ...SHADOWS.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          style={{
            color: COLORS.text.primary,
            fontWeight: '900',
            fontSize: 14,
            minWidth: 22,
          }}
        >
          {qty}x
        </Text>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              color: COLORS.text.primary,
              fontWeight: '700',
              fontSize: 15,
            }}
          >
            {name}
          </Text>
          {(variants.length > 0 || isPending) && (
            <Text
              numberOfLines={1}
              style={{
                color: variants.length > 0 ? COLORS.text.secondary : statusConfig.color,
                fontSize: 11,
                fontWeight: '600',
                marginTop: 3,
              }}
            >
              {variants.length > 0 ? variants.join(' · ') : statusLabel}
            </Text>
          )}
        </View>

        <Text
          style={{
            color: COLORS.text.primary,
            fontWeight: '800',
            fontSize: 15,
            minWidth: 56,
            textAlign: 'right',
          }}
        >
          {total}
        </Text>

        {isPending && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 2 }}>
            {qty > 1 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Reducir cantidad de ${name}`}
                onPress={onDec}
                hitSlop={6}
                style={({ pressed }) => ({
                  width: 34,
                  height: 34,
                  borderRadius: RADIUS.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: COLORS.bg.elevated,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="remove" size={18} color={COLORS.text.primary} />
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Aumentar ${name}`}
              onPress={onInc}
              hitSlop={6}
              style={({ pressed }) => ({
                width: 34,
                height: 34,
                borderRadius: RADIUS.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: COLORS.alpha.primary20,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="add" size={19} color={COLORS.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${name}`}
              onPress={onRemove}
              hitSlop={6}
              style={({ pressed }) => ({
                width: 34,
                height: 34,
                borderRadius: RADIUS.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: COLORS.alpha.error10,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="trash-outline" size={17} color={COLORS.error} />
            </Pressable>
          </View>
        )}
      </View>

      {!isPending && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: statusConfig.dotColor,
              }}
            />
            <Text style={{ color: statusConfig.color, fontSize: 11, fontWeight: '800' }}>
              {statusLabel}
            </Text>
          </View>
          {onAction && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={actionLabel || 'Acción del pedido'}
              onPress={onAction}
              style={({ pressed }) => ({
                backgroundColor: resolvedActionColor,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: RADIUS.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              {actionIcon && <Ionicons name={actionIcon} size={14} color="white" />}
              {actionLabel && (
                <Text style={{ color: 'white', fontSize: 11, fontWeight: '800' }}>
                  {actionLabel}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      )}
    </Animated.View>
  );
};
