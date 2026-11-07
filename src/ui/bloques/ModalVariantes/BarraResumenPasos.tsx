import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedColors } from '../../../compartido/hooks/useColoresTema';
import type { VariantGroup } from '../../../sistema/persistencia/menu.repositorio';

export type BarraResumenPasosProps = {
  visibleGroupIds: string[];
  groups: Record<string, VariantGroup>;
  activeStep: number;
  selections: Record<string, string[]>;
  labels: string[];
  onSelectStep: (stepIndex: number) => void;
};

export const BarraResumenPasos = React.memo(function BarraResumenPasos({
  visibleGroupIds,
  groups,
  activeStep,
  selections,
  onSelectStep,
}: BarraResumenPasosProps) {
  const COLORS = useThemedColors();

  if (visibleGroupIds.length <= 1) return null;

  return (
    <View
      style={[
        styles.summaryBar,
        {
          backgroundColor: COLORS.bg.surface,
          borderBottomColor: COLORS.bg.elevated,
        },
      ]}
    >
      <View style={styles.stepsRow}>
        {visibleGroupIds.map((gid, idx) => {
          const g = groups[gid];
          if (!g) return null;

          const isDone = (selections[gid] || []).length > 0;
          const isActive = idx === activeStep;

          return (
            <Pressable
              key={gid}
              accessibilityRole="button"
              accessibilityLabel={`Paso ${idx + 1}: ${g.titulo}`}
              onPress={() => {
                if (isDone || idx <= activeStep) {
                  onSelectStep(idx);
                }
              }}
              style={[
                styles.stepChip,
                {
                  backgroundColor: isActive
                    ? COLORS.alpha.primary20
                    : isDone
                      ? COLORS.bg.tertiary
                      : COLORS.bg.secondary,
                  borderColor: isActive ? COLORS.primary : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  {
                    color: isActive ? COLORS.primaryLight : COLORS.text.muted,
                  },
                ]}
              >
                {idx + 1}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.stepLabel,
                  {
                    color: isActive
                      ? COLORS.primaryLight
                      : isDone
                        ? COLORS.text.primary
                        : COLORS.text.muted,
                  },
                ]}
              >
                {g.titulo}
              </Text>
              {isDone && !isActive && (
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  summaryBar: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  stepsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '800',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 120,
  },
});
