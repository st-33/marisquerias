/**
 * 📦 COLLAPSIBLE SECTION COMPONENT
 * Sección colapsable reutilizable con animación suave y soporte de tema dinámico
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme, useAppTheme } from '@/compartido/temas';

type SeccionDesplegableProps = {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: string | number;
  icon?: React.ReactNode;
  headerColor?: string;
};

export function SeccionDesplegable({
  title,
  children,
  defaultExpanded = false,
  badge,
  icon,
  headerColor,
}: SeccionDesplegableProps) {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [animation] = useState(new Animated.Value(defaultExpanded ? 1 : 0));

  const toggleExpanded = () => {
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);

    Animated.spring(animation, {
      toValue,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  };

  const rotateInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight },
      ]}
    >
      <Pressable
        onPress={toggleExpanded}
        style={({ pressed }) => [
          styles.header,
          { backgroundColor: headerColor || colors.surfaceElevated },
          pressed && { opacity: 0.85 },
        ]}
        android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
      >
        <View style={styles.headerLeft}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {badge !== undefined && (
            <View
              style={[
                styles.badge,
                { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}55` },
              ]}
            >
              <Text style={[styles.badgeText, { color: colors.primaryLight }]}>{badge}</Text>
            </View>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>

      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      },
    }),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
  },
  content: {
    padding: theme.spacing.md,
    paddingTop: 4,
    gap: theme.spacing.sm,
  },
});
