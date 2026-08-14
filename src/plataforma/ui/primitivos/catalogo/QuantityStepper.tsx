import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export interface QuantityStepperProps {
  value: number;
  onIncrease: () => void;
  onDecrease: () => void;
  canIncrease?: boolean;
  canDecrease?: boolean;
  disabled?: boolean;
  increaseAccessibilityLabel: string;
  decreaseAccessibilityLabel: string;
  valueAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function QuantityStepper({
  value,
  onIncrease,
  onDecrease,
  canIncrease = true,
  canDecrease = true,
  disabled = false,
  increaseAccessibilityLabel,
  decreaseAccessibilityLabel,
  valueAccessibilityLabel,
  style,
  buttonStyle,
  valueStyle,
  testID,
}: QuantityStepperProps) {
  const aumentoBloqueado = disabled || !canIncrease;
  const decrementoBloqueado = disabled || !canDecrease;

  return (
    <View style={[styles.contenedor, style]} testID={testID}>
      <Pressable
        accessibilityLabel={decreaseAccessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: decrementoBloqueado }}
        disabled={decrementoBloqueado}
        onPress={decrementoBloqueado ? undefined : onDecrease}
        style={[styles.boton, buttonStyle]}
        testID={testID ? `${testID}-decrease` : undefined}
      >
        <Text style={styles.simbolo}>−</Text>
      </Pressable>

      <Text
        accessibilityLabel={valueAccessibilityLabel}
        accessibilityValue={{ now: value, text: String(value) }}
        style={[styles.valor, valueStyle]}
        testID={testID ? `${testID}-value` : undefined}
      >
        {value}
      </Text>

      <Pressable
        accessibilityLabel={increaseAccessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: aumentoBloqueado }}
        disabled={aumentoBloqueado}
        onPress={aumentoBloqueado ? undefined : onIncrease}
        style={[styles.boton, buttonStyle]}
        testID={testID ? `${testID}-increase` : undefined}
      >
        <Text style={styles.simbolo}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  boton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  simbolo: {
    fontSize: 20,
    fontWeight: '700',
  },
  valor: {
    minWidth: 36,
    textAlign: 'center',
  },
});
