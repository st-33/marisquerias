import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export type VarianteInsigniaEstado = 'success' | 'warning' | 'info' | 'neutral';

export interface InsigniaEstadoProps extends AccessibilityProps {
  variant: VarianteInsigniaEstado;
  text: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

const estilosPorVariante: Record<VarianteInsigniaEstado, { contenedor: ViewStyle; texto: TextStyle }> =
  {
    success: {
      contenedor: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
      texto: { color: '#166534' },
    },
    warning: {
      contenedor: { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' },
      texto: { color: '#92400E' },
    },
    info: {
      contenedor: { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
      texto: { color: '#1E40AF' },
    },
    neutral: {
      contenedor: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
      texto: { color: '#374151' },
    },
  };

export function InsigniaEstado({
  variant,
  text,
  style,
  textStyle,
  testID,
  accessibilityRole,
  ...accessibilityProps
}: InsigniaEstadoProps) {
  const estilos = estilosPorVariante[variant];

  return (
    <View
      {...accessibilityProps}
      accessibilityRole={accessibilityRole ?? 'text'}
      style={[styles.contenedor, estilos.contenedor, style]}
      testID={testID}
    >
      <Text style={[styles.texto, estilos.texto, textStyle]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  texto: {
    fontSize: 12,
    fontWeight: '700',
  },
});
