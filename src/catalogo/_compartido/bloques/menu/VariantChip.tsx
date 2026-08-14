/**
 * 🏷️ VARIANT CHIP COMPONENT
 * Chip visual para mostrar opciones de variantes con estilo premium
 */

import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@compartido/theme';

type VariantChipProps = {
  titulo: string;
  delta: number;
  onDelete: () => void;
  disabled?: boolean;
  color?: string;
};

export function VariantChip({
  titulo,
  delta,
  onDelete,
  disabled = false,
  color,
}: VariantChipProps) {
  const chipColor = color || theme.colors.primary;

  return (
    <View style={[styles.chip, disabled && styles.chipDisabled, { borderColor: `${chipColor}30` }]}>
      <View style={styles.chipContent}>
        <View style={[styles.dot, { backgroundColor: chipColor }]} />
        <Text style={styles.chipTitle} numberOfLines={1}>
          {titulo}
        </Text>
        {delta !== 0 && (
          <View
            style={[
              styles.deltaContainer,
              {
                backgroundColor: delta > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderColor: delta > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              },
            ]}
          >
            <Text style={[styles.deltaText, { color: delta > 0 ? '#10b981' : '#ef4444' }]}>
              {delta > 0 ? '+' : ''}${Math.abs(delta).toFixed(0)}
            </Text>
          </View>
        )}
      </View>
      {!disabled && (
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons name="close" size={14} color={theme.colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingVertical: 4,
    paddingLeft: 10,
    paddingRight: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    maxWidth: '100%',
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
      },
    }),
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipTitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    flexShrink: 1,
  },
  deltaContainer: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  deltaText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
  },
  deleteButton: {
    padding: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
});
