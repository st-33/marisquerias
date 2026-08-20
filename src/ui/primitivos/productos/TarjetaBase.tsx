import React, { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityProps,
  type GestureResponderEvent,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export interface TarjetaBaseProps extends AccessibilityProps {
  header?: ReactNode;
  media?: ReactNode;
  content: ReactNode;
  footer?: ReactNode;
  style?: PressableProps['style'];
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  testID?: string;
}

export function TarjetaBase({
  header,
  media,
  content,
  footer,
  style,
  contentStyle,
  onPress,
  disabled = false,
  testID,
  accessibilityState,
  accessibilityRole,
  ...accessibilityProps
}: TarjetaBaseProps) {
  const estiloRaiz =
    typeof style === 'function'
      ? (estado: PressableStateCallbackType) => [styles.contenedor, style(estado)]
      : [styles.contenedor, style];

  return (
    <Pressable
      {...accessibilityProps}
      accessibilityRole={accessibilityRole ?? (onPress ? 'button' : undefined)}
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={estiloRaiz}
      testID={testID}
    >
      {header !== undefined && <View style={styles.region}>{header}</View>}
      {media !== undefined && <View style={styles.region}>{media}</View>}
      <View style={[styles.contenido, contentStyle]}>{content}</View>
      {footer !== undefined && <View style={styles.region}>{footer}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: {},
  region: {
    width: '100%',
  },
  contenido: {
    width: '100%',
  },
});
