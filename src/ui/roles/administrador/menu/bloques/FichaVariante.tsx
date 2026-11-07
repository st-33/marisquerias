/**
 * 🏷️ VARIANT CHIP COMPONENT
 * Chip visual para mostrar opciones de variantes con estilo elevado
 */

import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme, useAppTheme } from '@/compartido/temas';

type FichaVarianteProps = {
  titulo: string;
  delta: number;
  onDelete: () => void;
  disabled?: boolean;
  color?: string;
};

export function FichaVariante({
  titulo,
  delta,
  onDelete,
  disabled = false,
  color,
}: FichaVarianteProps) {
  const { colors } = useAppTheme();
  const chipColor = color || colors.primary;

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: colors.card, borderColor: `${chipColor}45` },
        disabled && styles.chipDisabled,
      ]}
    >
      <View style={styles.chipContent}>
        <View style={[styles.dot, { backgroundColor: chipColor }]} />
        <Text style={[styles.chipTitle, { color: colors.text }]} numberOfLines={1}>
          {titulo}
        </Text>
        {delta !== 0 && (
          <View
            style={[
              styles.deltaContainer,
              {
                backgroundColor: delta > 0 ? colors.successSoft : `${colors.danger}1A`,
                borderColor: delta > 0 ? `${colors.success}50` : `${colors.danger}50`,
              },
            ]}
          >
            <Text style={[styles.deltaText, { color: delta > 0 ? colors.success : colors.danger }]}>
              {delta > 0 ? '+' : ''}${Math.abs(delta).toFixed(0)}
            </Text>
          </View>
        )}
      </View>
      {!disabled && (
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            { backgroundColor: `${colors.textMuted}18` },
            pressed && { opacity: 0.6 },
          ]}
          hitSlop={8}
        >
          <Ionicons name="close" size={15} color={colors.textSecondary} />
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
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    flex: 1,
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
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chipTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semibold,
    flexShrink: 1,
  },
  deltaContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
  },
  deleteButton: {
    padding: 4,
    borderRadius: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
});
