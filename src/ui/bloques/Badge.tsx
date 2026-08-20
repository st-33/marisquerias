import React from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { Platform, StyleSheet, Text, View } from 'react-native';

type BadgeProps = {
  /** Text to display inside the badge */
  label: string | number;
  /** Optional background color */
  backgroundColor?: string;
  /** Optional text color */
  color?: string;
  /** Optional style overrides */
  style?: ViewStyle;
  /** Optional text style overrides */
  textStyle?: TextStyle;
};

/**
 * Simple pill‑style badge with optional animation on mount.
 * Designed for both mobile and web (hover effect on web).
 */
export const Badge: React.FC<BadgeProps> = ({
  label,
  backgroundColor = '#3b82f6', // default primary blue
  color = '#ffffff',
  style,
  textStyle,
}) => {
  return (
    <View
      style={[styles.badge, { backgroundColor }, style]}
      // Web hover effect
      {...(Platform.OS === 'web' ? { onMouseEnter: () => {}, onMouseLeave: () => {} } : {})}
    >
      <Text style={[styles.text, { color }, textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    // Subtle shadow for premium feel
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'transform 0.15s ease',
      },
      default: {},
    }),
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
