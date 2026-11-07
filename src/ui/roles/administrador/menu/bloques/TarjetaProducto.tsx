import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { obtenerImagenProducto } from '@/compartido/catalogoImagenes';
import type { Producto } from '../../../../../sistema/persistencia';
import { theme, useAppTheme } from '@/compartido/temas';

type TarjetaProductoProps = {
  producto: Producto;
  onEdit: (producto: Producto) => void;
  onToggle: (producto: Producto) => void;
  onRecipe: (producto: Producto) => void;
  onDelete: (producto: Producto) => void;
};

export function TarjetaProducto({
  producto,
  onEdit,
  onToggle,
  onRecipe,
  onDelete,
}: TarjetaProductoProps) {
  const { colors } = useAppTheme();
  const activo = producto.activo ?? true;
  const esPlatillo =
    producto.origenTipo === 'platillo' ||
    Boolean(producto.receta?.ingredientes && Object.keys(producto.receta.ingredientes).length > 0);
  const variantCount = producto.variantes?.grupos
    ? Object.keys(producto.variantes.grupos).length
    : 0;
  const hasVariants = variantCount > 0;
  const costoRef = Number(producto.costoReferencia || 0);
  const gananciaAprox = costoRef > 0 ? Number((producto.precio - costoRef).toFixed(2)) : null;

  const imagenAsset = obtenerImagenProducto(
    producto.imagenId || (producto as any).imagen_id,
    producto.nombre,
    esPlatillo ? 'platillos' : 'inventario'
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardElevated,
          borderColor: activo ? colors.borderLight : `${colors.danger}55`,
          shadowColor: '#000',
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.touchableArea,
          pressed && { backgroundColor: `${colors.primary}0C` },
        ]}
        onPress={() => onEdit(producto)}
      >
        <View style={styles.content}>
          <View style={styles.headerRow}>
            {imagenAsset ? (
              <View style={styles.floatingImageWrap}>
                <Image
                  source={imagenAsset}
                  style={{ width: 58, height: 64 }}
                  contentFit="contain"
                />
              </View>
            ) : (
              <View
                style={[
                  styles.fallbackIconWrap,
                  {
                    backgroundColor: `${esPlatillo ? colors.accent : colors.primary}18`,
                    borderColor: `${esPlatillo ? colors.accent : colors.primary}40`,
                  },
                ]}
              >
                <Ionicons
                  name={esPlatillo ? 'restaurant-outline' : 'cube-outline'}
                  size={24}
                  color={esPlatillo ? colors.accent : colors.primary}
                />
              </View>
            )}

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                {producto.nombre}
              </Text>
              <View style={styles.originRow}>
                <View
                  style={[
                    styles.originBadge,
                    {
                      backgroundColor: `${esPlatillo ? colors.accent : colors.primary}18`,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: esPlatillo ? colors.accent : colors.primary,
                      fontWeight: '700',
                    }}
                  >
                    {esPlatillo
                      ? producto.modoPreparacion === 'produccion_anticipada'
                        ? '🍮 Lote de Cocina'
                        : '🍳 Cocina'
                      : '📦 Inventario'}
                  </Text>
                </View>

                {costoRef > 0 && (
                  <Text style={[styles.costHintText, { color: colors.textSecondary }]}>
                    Sale en ~${costoRef.toFixed(0)}
                    {gananciaAprox != null && gananciaAprox > 0
                      ? ` · Ganas +$${gananciaAprox.toFixed(0)}`
                      : ''}
                  </Text>
                )}
              </View>
            </View>

            <View
              style={[
                styles.pricePill,
                {
                  backgroundColor: `${colors.primary}1C`,
                  borderColor: `${colors.primary}55`,
                },
              ]}
            >
              <Text style={[styles.price, { color: colors.primaryLight }]}>
                ${producto.precio.toFixed(0)}
              </Text>
            </View>
          </View>

          {hasVariants && (
            <View style={[styles.variantsContainer, { borderTopColor: colors.border }]}>
              {Object.entries(producto.variantes?.grupos || {}).map(
                ([key, group]: [string, any]) => (
                  <View key={key} style={styles.variantGroup}>
                    <Text style={[styles.variantGroupTitle, { color: colors.textMuted }]}>
                      {group.titulo || group.rol}:
                    </Text>
                    <View style={styles.variantOptionsRow}>
                      {Object.entries(group.opciones || {}).map(
                        ([optKey, opt]: [string, any]) => {
                          const deltaNum = Number(opt.delta || 0);
                          return (
                            <View
                              key={optKey}
                              style={[
                                styles.miniChip,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: colors.borderLight,
                                },
                              ]}
                            >
                              <Text style={[styles.miniChipText, { color: colors.textSecondary }]}>
                                {opt.titulo}
                              </Text>
                              {deltaNum > 0 && (
                                <Text style={[styles.miniChipDelta, { color: colors.primary }]}>
                                  +${deltaNum.toFixed(0)}
                                </Text>
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
          )}
        </View>
      </Pressable>

      {/* Pie de tarjeta compacto y unificado */}
      <View
        style={[
          styles.actionsRow,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <View style={styles.footerLeft}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggle(producto);
            }}
            style={[
              styles.statusPill,
              {
                backgroundColor: activo ? colors.successSoft : `${colors.danger}18`,
                borderColor: activo ? `${colors.success}55` : `${colors.danger}55`,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: activo ? colors.success : colors.danger },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: activo ? colors.success : colors.danger },
              ]}
            >
              {activo ? 'En venta' : 'Pausado'}
            </Text>
          </Pressable>

          {producto.prepMin ? (
            <View style={styles.metaPill}>
              <Ionicons name="time-outline" size={14} color={colors.accent} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                ~{producto.prepMin} min
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footerRight}>
          <CardButton
            icon={esPlatillo ? 'book-outline' : 'cube-outline'}
            color={esPlatillo ? colors.accent : colors.primary}
            onPress={() => onRecipe(producto)}
            label={esPlatillo ? 'Receta' : 'Stock'}
          />
          <CardButton
            icon="create-outline"
            color={colors.textSecondary}
            onPress={() => onEdit(producto)}
          />
          <CardButton
            icon="trash-outline"
            color={colors.danger}
            onPress={() => onDelete(producto)}
          />
        </View>
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
      style={({ pressed }) => [styles.cardButton, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={17} color={color} />
      {label && <Text style={[styles.btnLabel, { color }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    flexGrow: 1,
    flexBasis: 310,
    maxWidth: 460,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  touchableArea: {
    padding: 14,
  },
  content: {
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  floatingImageWrap: {
    width: 58,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    fontFamily: theme.typography.fontFamily,
  },
  originRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  originBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  costHintText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pricePill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  price: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.heavy,
  },
  variantsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  variantGroup: {
    gap: 3,
    minWidth: 80,
  },
  variantGroupTitle: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  variantOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniChipText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
  },
  miniChipDelta: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
  },
});
