import React, { useMemo } from 'react';
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/compartido/temas';
import { useThemedColors, useThemedShadows } from '@/compartido/hooks/useColoresTema';
import { CabeceraSelector } from './CabeceraSelector';
import { FiltroCategorias, Category } from './FiltroCategorias';
import { TarjetaProductoVisual } from './TarjetaProductoVisual';

export type Product = {
  id: string;
  nombre?: string;
  precio?: number;
  imagen_id?: string | null;
  imagenId?: string | null;
};

export type SelectorProductoProps = {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (id: string) => void;
  productsInCategory: Product[];
  onOpenVariant: (id: string) => void;
  onClose: () => void;
};

export const SelectorProducto = React.memo(function SelectorProducto({
  categories,
  selectedCategory,
  onSelectCategory,
  productsInCategory,
  onOpenVariant,
  onClose,
}: SelectorProductoProps) {
  const [fadeAnim] = React.useState(() => new Animated.Value(0));
  const [slideAnim] = React.useState(() => new Animated.Value(34));
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const COLORS = useThemedColors();
  const SHADOWS = useThemedShadows();

  // Rejilla adaptativa: 3 columnas en móviles (form factor mesero), 4 en tabletas
  const columnCount = width >= 640 ? 4 : 3;
  const itemWidth = columnCount === 4 ? '23.5%' : '31.4%';

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
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
          backgroundColor: COLORS.alpha.black50,
          paddingTop: SPACING.xl + insets.top,
          paddingBottom: SPACING.xl + insets.bottom,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: COLORS.bg.primary,
            borderColor: COLORS.bg.elevated,
            transform: [{ translateY: slideAnim }],
          },
          SHADOWS.lg,
        ]}
      >
        <CabeceraSelector onClose={handleClose} />

        <FiltroCategorias
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
        />

        <View style={styles.productSection}>
          <View style={styles.sectionLabelRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <Ionicons name="grid-outline" size={18} color={COLORS.primary} />
              <Text style={[styles.sectionLabel, { color: COLORS.text.secondary }]}>Productos</Text>
            </View>
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
                <Text style={[styles.emptyTitle, { color: COLORS.text.secondary }]}>
                  No hay productos en esta categoría
                </Text>
                <Text style={[styles.emptySubtitle, { color: COLORS.text.muted }]}>
                  Elige otra categoría para continuar.
                </Text>
              </View>
            }
            renderItem={({ item: product }) => (
              <TarjetaProductoVisual
                id={product.id}
                nombre={product.nombre}
                precio={product.precio}
                imagenId={product.imagen_id || product.imagenId}
                ancho={itemWidth}
                onPress={onOpenVariant}
              />
            )}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
});

export default SelectorProducto;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xl,
  },
  sheet: {
    borderRadius: RADIUS.xl + 4,
    width: '100%',
    maxWidth: 580,
    flex: 1,
    borderWidth: 1,
    overflow: 'hidden',
  },
  productSection: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.black,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  productList: {
    paddingBottom: SPACING.lg,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  emptyState: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxxl,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});
