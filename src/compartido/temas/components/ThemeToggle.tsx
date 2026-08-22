/**
 * 🎛️ THEME TOGGLE - BOTÓN DE CAMBIO DE TEMA
 * Esquina inferior, pequeño pero visible
 */

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../ThemeContext';

interface ThemeToggleProps {
  position?: 'bottom-left' | 'bottom-right';
}

export function ThemeToggle({ position = 'bottom-right' }: ThemeToggleProps) {
  const { themeType, toggleTheme, isElite, colors } = useAppTheme();

  return (
    <View style={[styles.container, position === 'bottom-left' ? styles.left : styles.right]}>
      <Pressable
        onPress={toggleTheme}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: isElite ? 'rgba(197, 160, 89, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons
          name={isElite ? 'sparkles' : 'color-palette-outline'}
          size={16}
          color={colors.primary}
        />
        <Text style={[styles.label, { color: colors.primary }]}>
          {isElite ? 'Elite' : 'Clásico'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 25,
    zIndex: 100,
  },
  left: {
    left: 20,
  },
  right: {
    right: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(231, 237, 247, 0.16)',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
