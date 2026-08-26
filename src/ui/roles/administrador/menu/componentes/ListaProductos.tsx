/**
 * 📦 Lista de productos de una categoría dentro del módulo Menú.
 * Extraído de `PantallaMenuAdmin.tsx`.
 */

import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@compartido/theme';
import type { Producto } from '../../../../../sistema/persistencia';
import { TarjetaProducto } from '../bloques/TarjetaProducto';

type ListaProductosProps = {
  categoriaNombre?: string;
  productos: Producto[];
  onAgregarProducto: () => void;
  onEditar: (producto: Producto) => void;
  onToggle: (producto: Producto) => void;
  onReceta: (producto: Producto) => void;
  onEliminar: (producto: Producto) => void;
};

export function ListaProductos({
  categoriaNombre,
  productos,
  onAgregarProducto,
  onEditar,
  onToggle,
  onReceta,
  onEliminar,
}: ListaProductosProps) {
  if (!categoriaNombre) {
    return (
      <View style={styles.emptyProducts}>
        <Ionicons name="folder-open-outline" size={48} color="#64748b" />
        <Text style={styles.emptyTitle}>Selecciona o crea una categoría</Text>
      </View>
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
        <Pressable style={styles.btnPrimary} onPress={onAgregarProducto}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.btnPrimaryText}>Agregar Producto</Text>
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
  emptyTitle: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    color: '#0F172A',
    fontSize: theme.typography.sizes.sm,
    marginTop: theme.spacing.xs,
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
    color: '#FFFFFF',
    fontWeight: theme.typography.weights.semibold,
    fontSize: theme.typography.sizes.sm,
  },
});
