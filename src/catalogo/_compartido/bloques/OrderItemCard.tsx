import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { RADIUS, SPACING } from '../../../compartido/constantes/theme';
import { useThemedColors } from '../../../compartido/hooks/useThemedColors';

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
  getProduct?: (productId: string) => any | null;
};

const LEGACY_VARIANT_LABELS: Record<string, string> = {
  snAgu: 'Sin aguacate',
  oGr: 'Grande',
};

function readableVariant(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (LEGACY_VARIANT_LABELS[raw]) return LEGACY_VARIANT_LABELS[raw];
  return raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
}

function resolveVariantLabels(item: any, getProduct?: (productId: string) => any | null): string[] {
  const productId = item.productId ?? item.productoId;
  const product = productId ? getProduct?.(String(productId)) : null;
  const groups = product?.variantes?.grupos ?? {};
  const source = Array.isArray(item.variantLabels)
    ? item.variantLabels
    : item.simpleVariants && Array.isArray(item.simpleVariants)
    ? item.simpleVariants
    : item.variantes && typeof item.variantes === 'object'
    ? Object.entries(item.variantes).flatMap(([groupId, options]) => {
        const group = groups[groupId];
        return (Array.isArray(options) ? options : [options]).map((optionId) => {
          const option = group?.opciones?.[String(optionId)];
          return option?.titulo ?? optionId;
        });
      })
    : [];

  return source.map(readableVariant).filter(Boolean);
}

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
  getProduct,
}: OrderItemCardProps) => {
  const COLORS = useThemedColors();
  const resolvedActionColor = actionColor ?? COLORS.primary;
  const qty = Number(item.qty ?? item.cantidad ?? 1);
  const price = Number(item.price ?? item.precio ?? 0);
  // Precio sin decimales si es entero
  const totalNum = qty * price;
  const total = Number.isInteger(totalNum) ? `$${totalNum}` : `$${totalNum.toFixed(2)}`;
  const name = String(item.name ?? item.nombre ?? 'Item');

  const variants = resolveVariantLabels(item, getProduct);

  return (
    <Animated.View
      entering={FadeInUp.duration(350).springify().damping(15)}
      layout={Layout.springify()}
      style={{
        backgroundColor: COLORS.bg.secondary,
        borderRadius: RADIUS.xl,
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.lg,
        minHeight: 92,
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

            {variants.length > 0 && (
              <Text
                numberOfLines={2}
                style={{
                  color: COLORS.text.secondary,
                  fontSize: 13,
                  lineHeight: 18,
                  marginTop: 3,
                }}
              >
                {variants.join(', ')}
              </Text>
            )}
          </View>
        </View>

        {/* PENDING ACTIONS */}
        {isPending && (
          <View style={{ flexDirection: 'row', gap: 6, marginLeft: 8, alignItems: 'center' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Reducir cantidad de ${name}`}
              onPress={onDec}
              style={({ pressed }) => ({
                backgroundColor: COLORS.bg.elevated,
                width: 48,
                height: 48,
                borderRadius: RADIUS.md,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="remove" size={22} color={COLORS.text.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Aumentar ${name}`}
              onPress={onInc}
              style={({ pressed }) => ({
                backgroundColor: COLORS.alpha.primary20,
                width: 48,
                height: 48,
                borderRadius: RADIUS.md,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="add" size={22} color={COLORS.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${name}`}
              onPress={onRemove}
              style={({ pressed }) => ({
                backgroundColor: COLORS.alpha.error10,
                width: 48,
                height: 48,
                borderRadius: RADIUS.md,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="trash-outline" size={19} color={COLORS.error} />
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
