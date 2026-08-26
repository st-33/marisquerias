/**
 * 📦 COLLAPSIBLE SECTION COMPONENT
 * Sección colapsable reutilizable con animación suave
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@compartido/theme';

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
    <View style={styles.container}>
      <Pressable
        onPress={toggleExpanded}
        style={({ pressed }) => [
          styles.header,
          headerColor && { backgroundColor: headerColor },
          pressed && { opacity: 0.8 },
        ]}
        android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
      >
        <View style={styles.headerLeft}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={styles.title}>{title}</Text>
          {badge !== undefined && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </Animated.View>
      </Pressable>

      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1f2937',
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#374151',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: '#1f2937',
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
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    flex: 1,
  },
  badge: {
    backgroundColor: 'rgba(97, 130, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(97, 130, 255, 0.3)',
  },
  badgeText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: theme.typography.weights.semibold,
  },
  content: {
    padding: theme.spacing.md,
    paddingTop: 0,
    gap: theme.spacing.sm,
  },
});
