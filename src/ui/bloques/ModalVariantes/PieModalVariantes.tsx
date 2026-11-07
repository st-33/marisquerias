import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedColors, useThemedShadows } from '../../../compartido/hooks/useColoresTema';
import { formatMoney } from '../../../compartido/utils/formateadores';

export type PieModalVariantesProps = {
  totalPrice: number;
  canConfirm: boolean;
  missingCount: number;
  onConfirm: () => void;
};

export const PieModalVariantes = React.memo(function PieModalVariantes({
  totalPrice,
  canConfirm,
  missingCount,
  onConfirm,
}: PieModalVariantesProps) {
  const COLORS = useThemedColors();
  const SHADOWS = useThemedShadows();

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: COLORS.bg.surface,
          borderTopColor: COLORS.bg.elevated,
          ...SHADOWS.lg,
        },
      ]}
    >
      <View style={styles.totalBlock}>
        <Text style={[styles.totalLabel, { color: COLORS.text.muted }]}>TOTAL</Text>
        <Text style={[styles.totalPrice, { color: COLORS.success }]}>
          {formatMoney(totalPrice)}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          canConfirm ? 'Agregar a comanda' : `Faltan ${missingCount} opciones requeridas`
        }
        disabled={!canConfirm}
        onPress={onConfirm}
        style={({ pressed }) => [
          styles.confirmButton,
          {
            backgroundColor: canConfirm ? COLORS.primary : COLORS.bg.elevated,
            ...(canConfirm ? SHADOWS.primary : {}),
            transform: [{ scale: pressed && canConfirm ? 0.98 : 1 }],
            opacity: canConfirm ? 1 : 0.6,
          },
        ]}
      >
        <Ionicons
          name="checkmark-circle"
          size={22}
          color={canConfirm ? COLORS.text.primary : COLORS.text.muted}
        />
        <Text
          style={[
            styles.confirmText,
            { color: canConfirm ? COLORS.text.primary : COLORS.text.muted },
          ]}
        >
          {canConfirm ? 'Agregar' : `Faltan ${missingCount}`}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalBlock: {
    justifyContent: 'center',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  totalPrice: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  confirmButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
