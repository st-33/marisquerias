import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

export interface PriceFormatter {
  format(amount: number): string;
}

export interface PriceTagProps extends Omit<TextProps, 'children'> {
  amount: number;
  locale?: string | readonly string[];
  currency?: string;
  formatter?: PriceFormatter;
}

export function PriceTag({
  amount,
  locale = 'es-MX',
  currency = 'MXN',
  formatter,
  style,
  ...textProps
}: PriceTagProps) {
  const texto =
    formatter?.format(amount) ??
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);

  return (
    <Text {...textProps} style={[styles.precio, style]}>
      {texto}
    </Text>
  );
}

const styles = StyleSheet.create({
  precio: {
    fontVariant: ['tabular-nums'],
  },
});
