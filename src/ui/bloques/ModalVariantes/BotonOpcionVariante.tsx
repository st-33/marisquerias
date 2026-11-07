import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedColors, useThemedShadows } from '../../../compartido/hooks/useColoresTema';
import { formatMoney } from '../../../compartido/utils/formateadores';
import { getVariantOptionLabel } from '../../../sistema/persistencia';

export type BotonOpcionVarianteProps = {
  oid: string;
  option: any;
  isSelected: boolean;
  isDisabled: boolean;
  groupType: 'single' | 'multi';
  basePrice: number;
  width: string | number;
  onPress: () => void;
};

export const BotonOpcionVariante = React.memo(function BotonOpcionVariante({
  oid,
  option,
  isSelected,
  isDisabled,
  groupType,
  basePrice,
  width,
  onPress,
}: BotonOpcionVarianteProps) {
  const COLORS = useThemedColors();
  const SHADOWS = useThemedShadows();
  const hasPrice = typeof option.delta === 'number' && option.delta !== 0;
  const label = getVariantOptionLabel(option, oid);

  const priceText = hasPrice
    ? groupType === 'single'
      ? formatMoney((Number(basePrice) || 0) + option.delta!)
      : `+${formatMoney(option.delta!)}`
    : null;

  return (
    <View style={[styles.wrapper, { width: width as any }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected, disabled: isDisabled }}
        accessibilityLabel={`${label}${priceText ? ` ${priceText}` : ''}`}
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: isSelected
              ? COLORS.primary
              : isDisabled
                ? COLORS.bg.secondary
                : COLORS.bg.tertiary,
            borderColor: isSelected
              ? COLORS.primaryLight
              : isDisabled
                ? 'transparent'
                : COLORS.bg.elevated,
            ...(isSelected ? SHADOWS.primary : {}),
            transform: [{ scale: pressed && !isDisabled ? 0.97 : 1 }],
            opacity: isDisabled ? 0.5 : 1,
          },
        ]}
      >
        <View style={styles.contentRow}>
          <View style={styles.textColumn}>
            <Text
              numberOfLines={2}
              style={[
                styles.optionLabel,
                {
                  color: isDisabled
                    ? COLORS.text.muted
                    : isSelected
                      ? COLORS.text.primary
                      : COLORS.text.secondary,
                },
              ]}
            >
              {label}
            </Text>
            {priceText && (
              <Text
                style={[
                  styles.optionPrice,
                  {
                    color: isSelected ? '#fde047' : COLORS.success,
                  },
                ]}
              >
                {priceText}
              </Text>
            )}
          </View>

          <View style={styles.iconContainer}>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={22} color={COLORS.text.primary} />
            )}
            {isDisabled && <Ionicons name="lock-closed" size={16} color={COLORS.text.muted} />}
            {!isSelected && !isDisabled && (
              <View
                style={[
                  styles.unselectedIndicator,
                  {
                    borderColor: COLORS.bg.elevated,
                    borderRadius: groupType === 'single' ? 12 : 6,
                  },
                ]}
              />
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    padding: 4,
  },
  button: {
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedIndicator: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
