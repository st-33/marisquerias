import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/compartido/temas';
import { useThemedColors, useThemedShadows } from '@/compartido/hooks/useColoresTema';

export type Category = { id: string; nombre?: string };

export type FiltroCategoriasProps = {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (id: string) => void;
};

export const FiltroCategorias = React.memo(function FiltroCategorias({
  categories,
  selectedCategory,
  onSelectCategory,
}: FiltroCategoriasProps) {
  const COLORS = useThemedColors();
  const SHADOWS = useThemedShadows();

  return (
    <View style={styles.section}>
      <View style={styles.sectionLabelRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <Ionicons name="apps-outline" size={18} color={COLORS.primary} />
          <Text style={[styles.sectionLabel, { color: COLORS.text.secondary }]}>Categorías</Text>
        </View>
        <Text style={[styles.sectionCounter, { color: COLORS.text.muted }]}>
          {categories.length} activas
        </Text>
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
  );
});

const styles = StyleSheet.create({
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
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.black,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sectionCounter: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  categoryScroller: {
    paddingRight: SPACING.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categoryPill: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.black,
  },
});
