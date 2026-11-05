import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/compartido/temas';
import { useThemedColors } from '@/compartido/hooks/useColoresTema';

export type CabeceraSelectorProps = {
  onClose: () => void;
};

export const CabeceraSelector = React.memo(function CabeceraSelector({
  onClose,
}: CabeceraSelectorProps) {
  const COLORS = useThemedColors();

  return (
    <View style={[styles.header, { backgroundColor: COLORS.bg.surface, borderBottomColor: COLORS.bg.elevated }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: COLORS.primary }]}>NUEVO PEDIDO</Text>
          <Text style={[styles.title, { color: COLORS.text.primary }]}>Añadir al pedido</Text>
          <Text style={[styles.subtitle, { color: COLORS.text.tertiary }]}>
            Elige rápido y continúa con la mesa.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar selector de productos"
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            {
              backgroundColor: COLORS.bg.tertiary,
              borderColor: COLORS.bg.elevated,
              opacity: pressed ? 0.72 : 1,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
        >
          <Ionicons name="close" size={22} color={COLORS.text.secondary} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  eyebrow: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.black,
    letterSpacing: 1.4,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xxxl,
    fontWeight: TYPOGRAPHY.weights.black,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    marginTop: SPACING.xs,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
