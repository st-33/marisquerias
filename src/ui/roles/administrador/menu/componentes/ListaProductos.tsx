/**
 * 📦 Lista de productos de una categoría dentro del módulo Menú.
 * Extraído de `PantallaMenuAdmin.tsx`.
 */

import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme, useAppTheme } from '@/compartido/temas';
import type { Producto } from '../../../../../sistema/persistencia';
import { TarjetaProducto } from '../bloques/TarjetaProducto';

type ListaProductosProps = {
  categoriaNombre?: string;
  productos: Producto[];
  onAgregarCategoria?: () => void;
  onAgregarProducto: () => void;
  onEditar: (producto: Producto) => void;
  onToggle: (producto: Producto) => void;
  onReceta: (producto: Producto) => void;
  onEliminar: (producto: Producto) => void;
};

export function ListaProductos({
  categoriaNombre,
  productos,
  onAgregarCategoria,
  onAgregarProducto,
  onEditar,
  onToggle,
  onReceta,
  onEliminar,
}: ListaProductosProps) {
  const { colors } = useAppTheme();

  if (!categoriaNombre) {
    return (
      <Animated.View
        entering={FadeInDown.duration(280)}
        style={[
          styles.emptyCard,
          { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight },
        ]}
      >
        <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons name="folder-open-outline" size={38} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Tu menú está vacío</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Crea una categoría para comenzar a agregar opciones y sus variantes.
        </Text>
        {onAgregarCategoria ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Crear primera categoría"
            testID="crear-primera-categoria"
            onPress={onAgregarCategoria}
            style={({ pressed }) => [
              styles.btnPrimary,
              { backgroundColor: colors.primary },
              pressed && styles.btnPressed,
            ]}
          >
            <Ionicons name="add" size={20} color={colors.background} />
            <Text style={[styles.btnPrimaryText, { color: colors.background }]}>
              Crear primera categoría
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    );
  }

  return (
    <>
      <View style={[styles.categoryHeader, { borderBottomColor: colors.border }]}>
        <View style={{ gap: 2 }}>
          <Text style={[styles.categoryTitle, { color: colors.text }]}>{categoriaNombre}</Text>
          <Text style={[styles.productCount, { color: colors.textSecondary }]}>
            {productos.length} {productos.length === 1 ? 'opción activa en carta' : 'opciones en carta'}
          </Text>
        </View>
        {productos.length > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.btnPrimary,
              { backgroundColor: colors.primary },
              pressed && styles.btnPressed,
            ]}
            onPress={onAgregarProducto}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.background} />
            <Text style={[styles.btnPrimaryText, { color: colors.background }]}>
              Agregar al Menú
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.productsGrid} showsVerticalScrollIndicator={false}>
        {productos.length === 0 ? (
          <View
            style={[
              styles.emptyProducts,
              { backgroundColor: colors.surfaceDark, borderColor: colors.border },
            ]}
          >
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="restaurant-outline" size={34} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Sin opciones en {categoriaNombre}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Selecciona un platillo de Cocina o un artículo de Inventario para publicarlo en esta categoría.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                { backgroundColor: colors.primary },
                pressed && styles.btnPressed,
              ]}
              onPress={onAgregarProducto}
            >
              <Ionicons name="add" size={20} color={colors.background} />
              <Text style={[styles.btnPrimaryText, { color: colors.background }]}>
                Agregar primera opción
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cardsWrap}>
            {productos.map((prod) => (
              <TarjetaProducto
                key={prod.id}
                producto={prod}
                onEdit={() => onEditar(prod)}
                onToggle={async () => onToggle(prod)}
                onRecipe={() => onReceta(prod)}
                onDelete={() => onEliminar(prod)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
  },
  categoryTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.heavy,
    fontFamily: (theme.typography as any).displayFamily || theme.typography.fontFamily,
    letterSpacing: 0.3,
  },
  productCount: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
  productsGrid: {
    paddingBottom: theme.spacing.lg,
  },
  cardsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  emptyProducts: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    marginTop: theme.spacing.sm,
  },
  emptyCard: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 520,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xl,
    borderWidth: 1,
    borderRadius: theme.borderRadius.xl,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.round,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    marginTop: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.sm,
    marginTop: 4,
    marginBottom: theme.spacing.md,
    maxWidth: 380,
    textAlign: 'center',
    lineHeight: 20,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  btnPrimaryText: {
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
