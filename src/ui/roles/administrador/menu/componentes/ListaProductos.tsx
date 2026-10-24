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
        style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="folder-open-outline" size={38} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Tu catálogo está vacío</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          Crea una categoría para comenzar a agregar productos y sus variantes.
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
      <View style={styles.categoryHeader}>
        <View>
          <Text style={styles.categoryTitle}>{categoriaNombre}</Text>
          <Text style={styles.productCount}>
            {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
          </Text>
        </View>
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
            Agregar Producto
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.productsGrid}>
        {productos.length === 0 ? (
          <View style={styles.emptyProducts}>
            <Ionicons name="cube-outline" size={48} color="#64748b" />
            <Text style={styles.emptyTitle}>Sin productos en esta categoría</Text>
            <Text style={styles.emptySubtitle}>
              Presiona &quot;Agregar Producto&quot; para comenzar
            </Text>
          </View>
        ) : (
          productos.map((prod) => (
            <TarjetaProducto
              key={prod.id}
              producto={prod}
              onEdit={() => onEditar(prod)}
              onToggle={async () => onToggle(prod)}
              onRecipe={() => onReceta(prod)}
              onDelete={() => onEliminar(prod)}
            />
          ))
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
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryTitle: {
    color: '#64748B',
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
  },
  productCount: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
    marginTop: 2,
  },
  productsGrid: {
    gap: theme.spacing.md,
  },
  emptyProducts: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyCard: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 520,
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
    borderWidth: 1,
    borderRadius: theme.borderRadius.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.round,
  },
  emptyTitle: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    maxWidth: 360,
    textAlign: 'center',
    lineHeight: 20,
  },
  btnPrimary: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  btnPrimaryText: {
    fontWeight: theme.typography.weights.semibold,
    fontSize: theme.typography.sizes.sm,
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
