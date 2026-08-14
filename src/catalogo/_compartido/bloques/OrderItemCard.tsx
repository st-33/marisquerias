import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { RADIUS, SPACING } from '../../../compartido/constantes/theme';
import { useThemedColors } from '../../../compartido/hooks/useThemedColors';

type OrderItemCardProps = {
  item: any;
  statusConfig: { label: string; color: string; bgColor: string; dotColor: string };
  isPending?: boolean;
  onInc?: () => void;
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
  onRemove,
  onAction,
  actionLabel,
  actionColor,
  actionIcon,
}: OrderItemCardProps) => {
  const COLORS = useThemedColors();
  const resolvedActionColor = actionColor ?? COLORS.primary;
  const qty = Number(item.qty ?? item.cantidad ?? 1);
  const price = Number(item.price ?? item.precio ?? 0);
  // Precio sin decimales si es entero
  const totalNum = qty * price;
  const total = Number.isInteger(totalNum) ? `$${totalNum}` : `$${totalNum.toFixed(2)}`;
  const name = String(item.name ?? item.nombre ?? 'Item');

  // Extract variants
  let variants: string[] = [];
  if (Array.isArray(item.variantLabels)) {
    variants = item.variantLabels;
  } else if (isPending && Array.isArray(item.simpleVariants)) {
    variants = item.simpleVariants;
  } else if (item.variantes && typeof item.variantes === 'object') {
    variants = Object.values(item.variantes).flat().map(String);
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(350).springify().damping(15)}
      layout={Layout.springify()}
      style={{
        backgroundColor: COLORS.bg.secondary,
        borderRadius: RADIUS.xl,
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.bg.elevated,
        borderLeftWidth: 4,
        borderLeftColor: statusConfig.dotColor,
        marginBottom: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* HEADER: Qty + Name + Actions (Pending) */}
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <View style={{ flexDirection: 'row', flex: 1, gap: 8 }}>
          {/* Solo mostrar badge de cantidad si qty > 1 */}
          {qty > 1 && (
            <View
              style={{
                backgroundColor: COLORS.bg.elevated,
                borderRadius: RADIUS.sm,
                paddingHorizontal: 6,
                paddingVertical: 2,
                height: 24,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: COLORS.text.primary,
                  fontWeight: '900',
                  fontSize: 14,
                }}
              >
                {qty}x
              </Text>
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={2}
              style={{
                color: COLORS.text.primary,
                fontWeight: '700',
                fontSize: 15,
                lineHeight: 20,
              }}
            >
              {name}
            </Text>

            {/* VARIANTS (PREMIUM CHIPS) */}
            {variants.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {variants.map((v, i) => (
                  <View
                    key={i}
                    style={{
                        backgroundColor: COLORS.alpha.primary10,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: RADIUS.xs,
                      borderWidth: 1,
                      borderColor: COLORS.bg.elevated,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: statusConfig.dotColor,
                      }}
                    />
                    <Text
                      style={{
                        color: COLORS.text.secondary,
                        fontSize: 10,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: 0.3,
                      }}
                    >
                      {v}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* PENDING ACTIONS */}
        {isPending && (
          <View style={{ flexDirection: 'row', gap: 8, marginLeft: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Aumentar ${name}`}
              onPress={onInc}
              style={({ pressed }) => ({
                backgroundColor: COLORS.alpha.primary20,
                width: 36,
                height: 36,
                borderRadius: RADIUS.full,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="add" size={18} color={COLORS.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${name}`}
              onPress={onRemove}
              style={({ pressed }) => ({
                backgroundColor: COLORS.alpha.error10,
                width: 36,
                height: 36,
                borderRadius: RADIUS.full,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            </Pressable>
          </View>
        )}
      </View>

      {/* FOOTER: Price + Status + Action */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: COLORS.bg.elevated,
        }}
      >
        <Text
          style={{
            color: COLORS.text.primary,
            fontWeight: '800',
            fontSize: 16,
          }}
        >
          {total}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* STATUS BADGE */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: statusConfig.bgColor,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: RADIUS.sm,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: statusConfig.dotColor,
              }}
            />
            <Text
              style={{
                color: statusConfig.color,
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 0.5,
              }}
            >
              {statusConfig.label}
            </Text>
          </View>

          {/* ACTION BUTTON */}
          {onAction && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={actionLabel || 'Acción del pedido'}
              onPress={onAction}
              style={({ pressed }) => ({
                backgroundColor: resolvedActionColor,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: RADIUS.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                opacity: pressed ? 0.8 : 1,
                shadowColor: resolvedActionColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
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
      </View>
    </Animated.View>
  );
};
