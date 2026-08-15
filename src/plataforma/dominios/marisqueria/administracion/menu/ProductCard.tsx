import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getVariantOptionLabel, type Producto } from '../../../../base/_persistencia';
import { theme } from '@compartido/theme';
import { useThemedColors, useThemedShadows } from '../../../../../compartido/hooks/useThemedColors';

type ProductCardProps = {
  producto: Producto;
  onEdit: (producto: Producto) => void;
  onToggle: (producto: Producto) => void;
  onRecipe: (producto: Producto) => void;
  onDelete: (producto: Producto) => void;
};

export function ProductCard({ producto, onEdit, onToggle, onRecipe, onDelete }: ProductCardProps) {
  const COLORS = useThemedColors();
  const SHADOWS = useThemedShadows();
  const activo = producto.activo ?? true;
  const hasRecipe =
    producto.receta?.ingredientes && Object.keys(producto.receta.ingredientes).length > 0;
  const variantCount = producto.variantes?.grupos
    ? Object.keys(producto.variantes.grupos).length
    : 0;
  const hasVariants = variantCount > 0;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: COLORS.bg.surface, borderColor: COLORS.bg.elevated },
        SHADOWS.sm,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar producto ${producto.nombre}`}
        style={({ pressed }) => [
          styles.touchableArea,
          pressed && { backgroundColor: COLORS.alpha.primary10 },
        ]}
        onPress={() => onEdit(producto)}
      >
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={[styles.name, { color: COLORS.text.primary }]} numberOfLines={2}>
              {producto.nombre}
            </Text>
            <Text style={[styles.price, { color: COLORS.primary }]}>${producto.precio.toFixed(2)}</Text>
          </View>

          <View style={styles.metaRow}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onToggle(producto);
              }}
              style={[
                styles.statusPill,
                activo
                  ? { backgroundColor: COLORS.alpha.success10, borderColor: COLORS.success }
                  : { backgroundColor: COLORS.alpha.error10, borderColor: COLORS.error },
              ]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: activo ? COLORS.success : COLORS.error }]}
              />
              <Text style={[styles.statusText, { color: activo ? COLORS.success : COLORS.error }]}>
                {activo ? 'Activo' : 'Inactivo'}
              </Text>
            </Pressable>

            {hasVariants && (
              <>
                <View
                  style={[
                    styles.metaPill,
                    { backgroundColor: COLORS.alpha.primary10, borderColor: COLORS.bg.elevated },
                  ]}
                >
                  <Ionicons name="options-outline" size={13} color={COLORS.primary} />
                  <Text style={[styles.metaText, { color: COLORS.primary }]}>
                    {variantCount} {variantCount === 1 ? 'grupo' : 'grupos'} de variantes
                  </Text>
                </View>
                <View style={styles.variantsContainer}>

                {Object.entries(producto.variantes?.grupos || {}).map(
                  ([key, group]: [string, any]) => (
                    <View key={key} style={styles.variantGroup}>
                      <Text style={styles.variantGroupTitle}>{group.titulo || group.rol}:</Text>
                      <View style={styles.variantOptionsRow}>
                        {Object.entries(group.opciones || {}).map(
                          ([optKey, opt]: [string, any]) => {
                            const deltaNum = Number(opt.delta || 0);
                            return (
                              <View key={optKey} style={styles.miniChip}>
                                <Text style={styles.miniChipText}>
                                  {getVariantOptionLabel(opt, optKey)}
                                </Text>
                                {deltaNum > 0 && (
                                  <Text style={styles.miniChipDelta}>+${deltaNum.toFixed(0)}</Text>
                                )}
                              </View>
                            );
                          }
                        )}
                      </View>
                    </View>
                  )
                )}
                </View>
              </>
            )}

            {producto.prepMin ? (
              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <Ionicons name="time-outline" size={14} color={COLORS.warning} />
                  <Text style={[styles.metaText, { color: COLORS.text.muted }]}>{producto.prepMin} min de preparación</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>

      <View
        style={[
          styles.actionsRow,
          { backgroundColor: COLORS.bg.secondary, borderTopColor: COLORS.bg.elevated },
        ]}
      >
          <CardButton
          icon="restaurant-outline"
          color={hasRecipe ? COLORS.success : COLORS.text.muted}
          onPress={() => onRecipe(producto)}
          label="Receta"
        />
        <CardButton
          icon="trash-outline"
          color={COLORS.error}
          onPress={() => onDelete(producto)}
        />
      </View>
    </View>
  );
}

type CardButtonProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  onPress: () => void;
  label?: string;
};

function CardButton({ icon, color, onPress, label }: CardButtonProps) {
  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      style={styles.cardButton}
    >
      <Ionicons name={icon} size={18} color={color} />
      {label && <Text style={[styles.btnLabel, { color }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    flex: 1,
    minWidth: 300, // Ensure good width in grid
  },
  touchableArea: {
    padding: theme.spacing.md,
  },
  content: {
    gap: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  name: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
  price: {
    color: theme.colors.secondary,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: 2,
  },
  variantsContainer: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 6,
  },
  variantGroup: {
    gap: 2,
    minWidth: 80,
  },
  variantGroupTitle: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  variantOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  miniChipText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  miniChipDelta: {
    fontSize: 9,
    color: theme.colors.secondary,
    fontWeight: theme.typography.weights.bold,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surfaceDark,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusActive: {
    borderColor: 'rgba(16,185,129,0.3)',
  },
  statusInactive: {
    borderColor: 'rgba(239,68,68,0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.secondary,
  },
  statusText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceDark,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderRadius: theme.borderRadius.sm,
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
  },
});
