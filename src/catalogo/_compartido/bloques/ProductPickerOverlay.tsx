import React, { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../compartido/constantes/theme';
import { useThemedColors, useThemedShadows } from '../../../compartido/hooks/useThemedColors';
import { formatMoney } from '../../../compartido/utils/formatters';

type Category = { id: string; nombre?: string };
type Product = { id: string; nombre?: string; precio?: number };

type Props = {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (id: string) => void;
  productsInCategory: Product[];
  onOpenVariant: (id: string) => void;
  onClose: () => void;
};

function ProductPickerOverlayComponent({
  categories,
  selectedCategory,
  onSelectCategory,
  productsInCategory,
  onOpenVariant,
  onClose,
}: Props) {
  const [fadeAnim] = React.useState(() => new Animated.Value(0));
  const [slideAnim] = React.useState(() => new Animated.Value(34));
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 560;
  const columnCount = isWideLayout ? 2 : 1;
  const COLORS = useThemedColors();
  const SHADOWS = useThemedShadows();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          ...StyleSheet.absoluteFill,
          backgroundColor: COLORS.alpha.black50,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.xl,
        },
        sheet: {
          backgroundColor: COLORS.bg.primary,
          borderRadius: RADIUS.xl + 4,
          width: '100%',
          maxWidth: 560,
          flex: 1,
          borderWidth: 1,
          borderColor: COLORS.bg.elevated,
          overflow: 'hidden',
          ...SHADOWS.lg,
        },
        header: {
          paddingHorizontal: SPACING.xl,
          paddingTop: SPACING.xl,
          paddingBottom: SPACING.lg,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.bg.elevated,
          backgroundColor: COLORS.bg.surface,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: SPACING.md,
        },
        eyebrow: {
          color: COLORS.primary,
          fontSize: TYPOGRAPHY.sizes.xs,
          fontWeight: TYPOGRAPHY.weights.black,
          letterSpacing: 1.4,
          marginBottom: SPACING.xs,
        },
        title: {
          color: COLORS.text.primary,
          fontSize: TYPOGRAPHY.sizes.xxxl,
          fontWeight: TYPOGRAPHY.weights.black,
          letterSpacing: -0.4,
        },
        subtitle: {
          color: COLORS.text.tertiary,
          fontSize: TYPOGRAPHY.sizes.md,
          marginTop: SPACING.xs,
        },
        closeButton: {
          width: 42,
          height: 42,
          borderRadius: RADIUS.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.bg.tertiary,
          borderWidth: 1,
          borderColor: COLORS.bg.elevated,
        },
        section: {
          paddingHorizontal: SPACING.xl,
          paddingTop: SPACING.lg,
        },
        sectionLabelRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: SPACING.sm,
        },
        sectionLabel: {
          color: COLORS.text.primary,
          fontSize: TYPOGRAPHY.sizes.lg,
          fontWeight: TYPOGRAPHY.weights.bold,
        },
        sectionMeta: {
          color: COLORS.text.muted,
          fontSize: TYPOGRAPHY.sizes.sm,
          fontWeight: TYPOGRAPHY.weights.semibold,
        },
        categoryScroller: {
          paddingBottom: SPACING.xs,
        },
        categoryRow: {
          flexDirection: 'row',
          gap: SPACING.sm,
          paddingRight: SPACING.xl,
        },
        categoryPill: {
          minHeight: 48,
          paddingHorizontal: SPACING.lg,
          borderRadius: RADIUS.full,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
        },
        categoryText: {
          fontSize: TYPOGRAPHY.sizes.md,
          fontWeight: TYPOGRAPHY.weights.bold,
        },
        productSection: {
          flex: 1,
          paddingHorizontal: SPACING.xl,
          paddingTop: SPACING.lg,
          paddingBottom: SPACING.lg,
        },
        productList: {
          paddingBottom: SPACING.lg,
        },
        productRow: {
          justifyContent: 'space-between',
          marginBottom: SPACING.md,
        },
        productCard: {
          width: '48.2%',
          minHeight: 138,
          padding: SPACING.lg,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          justifyContent: 'space-between',
        },
        productTopline: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: SPACING.sm,
        },
        productDot: {
          width: 8,
          height: 8,
          borderRadius: RADIUS.full,
          marginTop: 5,
        },
        productName: {
          flex: 1,
          color: COLORS.text.primary,
          fontSize: TYPOGRAPHY.sizes.lg,
          fontWeight: TYPOGRAPHY.weights.bold,
          lineHeight: 21,
        },
        productFooter: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: SPACING.sm,
          marginTop: SPACING.md,
        },
        productPrice: {
          color: COLORS.success,
          fontSize: TYPOGRAPHY.sizes.xxl,
          fontWeight: TYPOGRAPHY.weights.black,
        },
        addButton: {
          width: 48,
          height: 48,
          borderRadius: RADIUS.full,
          alignItems: 'center',
          justifyContent: 'center',
        },
        emptyState: {
          flex: 1,
          minHeight: 180,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: SPACING.xxxl,
        },
        emptyTitle: {
          color: COLORS.text.secondary,
          fontSize: TYPOGRAPHY.sizes.lg,
          fontWeight: TYPOGRAPHY.weights.bold,
          textAlign: 'center',
          marginTop: SPACING.md,
        },
        emptySubtitle: {
          color: COLORS.text.muted,
          fontSize: TYPOGRAPHY.sizes.md,
          textAlign: 'center',
          marginTop: SPACING.xs,
        },
      }),
    [COLORS, SHADOWS]
  );

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 28,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>NUEVO PEDIDO</Text>
              <Text style={styles.title}>Añadir al pedido</Text>
              <Text style={styles.subtitle}>Elige rápido y continúa con la mesa.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar selector de productos"
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeButton,
                { opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] },
              ]}
            >
              <Ionicons name="close" size={22} color={COLORS.text.secondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>Categorías</Text>
            <Text style={styles.sectionMeta}>{categories.length} disponibles</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroller}
          >
            <View style={styles.categoryRow}>
              {categories.map((category) => {
                const isSelected = selectedCategory === category.id;
                return (
                  <Pressable
                    key={category.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => onSelectCategory(category.id)}
                    style={({ pressed }) => [
                      styles.categoryPill,
                      {
                        backgroundColor: isSelected ? COLORS.primary : COLORS.bg.tertiary,
                        borderColor: isSelected ? COLORS.primaryLight : COLORS.bg.elevated,
                        opacity: pressed ? 0.78 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                        ...(isSelected ? SHADOWS.primary : {}),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        { color: isSelected ? COLORS.text.primary : COLORS.text.secondary },
                      ]}
                    >
                      {category.nombre || 'Categoría'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View style={styles.productSection}>
          <View style={styles.sectionLabelRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <Ionicons name="grid-outline" size={18} color={COLORS.primary} />
              <Text style={styles.sectionLabel}>Productos</Text>
            </View>
            <Text style={styles.sectionMeta}>{productsInCategory.length} opciones</Text>
          </View>

          <FlatList
            data={productsInCategory}
            keyExtractor={(item) => item.id}
            key={`product-grid-${columnCount}`}
            numColumns={columnCount}
            columnWrapperStyle={columnCount > 1 ? styles.productRow : undefined}
            contentContainerStyle={styles.productList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="file-tray-outline" size={42} color={COLORS.text.muted} />
                <Text style={styles.emptyTitle}>No hay productos en esta categoría</Text>
                <Text style={styles.emptySubtitle}>Elige otra categoría para continuar.</Text>
              </View>
            }
            renderItem={({ item: product }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Agregar ${String(product?.nombre || 'producto')}`}
                onPress={() => onOpenVariant(product.id)}
                style={({ pressed }) => [
                  styles.productCard,
                  {
                    width: isWideLayout ? '48.2%' : '100%',
                    backgroundColor: pressed ? COLORS.bg.elevated : COLORS.bg.tertiary,
                    borderColor: pressed ? COLORS.primaryLight : COLORS.bg.elevated,
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                    ...(pressed ? SHADOWS.sm : {}),
                  },
                ]}
              >
                <View style={styles.productTopline}>
                  <Text style={styles.productName} numberOfLines={3}>
                    {String(product?.nombre || 'Producto')}
                  </Text>
                  <View style={[styles.productDot, { backgroundColor: COLORS.success }]} />
                </View>
                <View style={styles.productFooter}>
                  <Text style={styles.productPrice}>
                    {formatMoney(Number(product?.precio ?? 0))}
                  </Text>
                  <View
                    style={[styles.addButton, { backgroundColor: COLORS.primary }, SHADOWS.primary]}
                  >
                    <Ionicons name="add" size={20} color={COLORS.text.primary} />
                  </View>
                </View>
              </Pressable>
            )}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export const ProductPickerOverlay = React.memo(ProductPickerOverlayComponent);
