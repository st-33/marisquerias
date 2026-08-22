import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useAppTheme } from '../../compartido/temas';

export type EliteButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type EliteButtonSize = 'sm' | 'md' | 'lg';

interface FeedbackProps {
  onBlocked?: () => void;
}

function useBlockedFeedback({ onBlocked }: FeedbackProps) {
  const [shake] = useState(() => new Animated.Value(0));
  const [ring] = useState(() => new Animated.Value(0));
  const [pulse, setPulse] = useState(false);

  const triggerBlocked = useCallback(() => {
    setPulse(true);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }

    Animated.parallel([
      Animated.sequence([
        Animated.timing(shake, {
          toValue: -3,
          duration: 35,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: 3,
          duration: 35,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: 0,
          duration: 50,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(ring, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]),
    ]).start(() => setPulse(false));

    onBlocked?.();
  }, [onBlocked, ring, shake]);

  return { pulse, shake, ring, triggerBlocked };
}

export interface EliteButtonProps extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  label: string;
  onPress?: () => void;
  variant?: EliteButtonVariant;
  size?: EliteButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  onBlocked?: () => void;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function EliteButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  trailingIcon,
  onBlocked,
  style,
  labelStyle,
  ...props
}: EliteButtonProps) {
  const { colors } = useAppTheme();
  const { pulse, shake, ring, triggerBlocked } = useBlockedFeedback({ onBlocked });
  const unavailable = disabled || loading;
  const palette = buttonPalette(colors, variant, unavailable);
  const metrics = buttonMetrics(size);

  const handlePress = () => {
    if (unavailable) {
      triggerBlocked();
      return;
    }
    onPress?.();
  };

  return (
    <Animated.View style={[{ transform: [{ translateX: shake }] }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            borderColor: palette.border,
            opacity: ring,
            transform: [
              { scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
            ],
          },
        ]}
      />
      <Pressable
        {...props}
        accessibilityRole="button"
        accessibilityState={{ disabled: unavailable, busy: loading }}
        disabled={false}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          metrics,
          { backgroundColor: palette.background, borderColor: palette.border },
          style,
          pressed && !unavailable && styles.pressed,
          unavailable && styles.disabled,
        ]}
      >
        {loading ? <LoadingDot color={palette.foreground} /> : icon}
        <Text style={[styles.label, { color: palette.foreground }, labelStyle]} numberOfLines={1}>
          {loading ? 'Cargando…' : label}
        </Text>
        {!loading && trailingIcon}
      </Pressable>
      {pulse && <View pointerEvents="none" style={styles.pulseMarker} />}
    </Animated.View>
  );
}

export interface EliteIconButtonProps extends Omit<
  PressableProps,
  'style' | 'children' | 'onPress'
> {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  onBlocked?: () => void;
  disabled?: boolean;
  tone?: 'default' | 'primary' | 'danger';
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function EliteIconButton({
  icon,
  label,
  onPress,
  onBlocked,
  disabled = false,
  tone = 'default',
  size = 44,
  style,
  ...props
}: EliteIconButtonProps) {
  const { colors } = useAppTheme();
  const { shake, ring, triggerBlocked } = useBlockedFeedback({ onBlocked });
  const color =
    tone === 'primary' ? colors.primary : tone === 'danger' ? colors.error : colors.textSecondary;
  const handlePress = () => {
    if (disabled) {
      triggerBlocked();
      return;
    }
    onPress?.();
  };

  return (
    <Animated.View style={[{ transform: [{ translateX: shake }] }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.iconRing, { borderColor: color, opacity: ring }]}
      />
      <Pressable
        {...props}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={false}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.iconButton,
          {
            width: size,
            height: size,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        {icon}
      </Pressable>
    </Animated.View>
  );
}

export interface EliteSurfaceProps {
  children: React.ReactNode;
  tone?: 'surface' | 'card' | 'glass';
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export function EliteSurface({
  children,
  tone = 'surface',
  style,
  padded = true,
}: EliteSurfaceProps) {
  const { colors } = useAppTheme();
  const backgroundColor =
    tone === 'card' ? colors.card : tone === 'glass' ? colors.glass : colors.surface;
  return (
    <View
      style={[
        styles.surface,
        { backgroundColor, borderColor: colors.border },
        padded && styles.surfacePadded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export interface BlockedHintProps {
  message: string;
  visible?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BlockedHint({ message, visible = true, style }: BlockedHintProps) {
  const { colors } = useAppTheme();
  if (!visible) return null;
  return (
    <View
      style={[
        styles.hint,
        { backgroundColor: colors.card, borderColor: colors.borderLight },
        style,
      ]}
    >
      <View style={[styles.hintDot, { backgroundColor: colors.warning }]} />
      <Text style={[styles.hintText, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

export interface EliteTabsProps {
  items: { key: string; label: string; disabled?: boolean }[];
  value: string;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function EliteTabs({ items, value, onChange, style }: EliteTabsProps) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.tabs,
        { backgroundColor: colors.surfaceDark, borderColor: colors.border },
        style,
      ]}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled: item.disabled }}
            disabled={item.disabled}
            onPress={() => onChange(item.key)}
            style={({ pressed }) => [
              styles.tab,
              active && { backgroundColor: colors.card, borderColor: colors.borderLight },
              pressed && styles.tabPressed,
              item.disabled && styles.disabled,
            ]}
          >
            <Text
              style={[styles.tabText, { color: active ? colors.primaryLight : colors.textMuted }]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LoadingDot({ color }: { color: string }) {
  return <ActivityIndicatorLike color={color} />;
}

function ActivityIndicatorLike({ color }: { color: string }) {
  return <View style={[styles.loadingDot, { borderColor: `${color}55`, borderTopColor: color }]} />;
}

function buttonPalette(
  colors: ReturnType<typeof useAppTheme>['colors'],
  variant: EliteButtonVariant,
  disabled: boolean
) {
  const palette = {
    primary: { background: colors.primary, foreground: '#0A0D14', border: colors.primaryLight },
    secondary: { background: colors.card, foreground: colors.text, border: colors.borderLight },
    ghost: { background: 'transparent', foreground: colors.textSecondary, border: colors.border },
    danger: { background: colors.error, foreground: '#FFFFFF', border: '#F87171' },
  }[variant];

  if (disabled) {
    return {
      ...palette,
      background: colors.surfaceDark,
      foreground: colors.textMuted,
      border: colors.border,
    };
  }
  return palette;
}

function buttonMetrics(size: EliteButtonSize): ViewStyle {
  if (size === 'sm') return { minHeight: 36, paddingHorizontal: 12, borderRadius: 10 };
  if (size === 'lg') return { minHeight: 52, paddingHorizontal: 20, borderRadius: 14 };
  return { minHeight: 44, paddingHorizontal: 16, borderRadius: 12 };
}

const styles = StyleSheet.create({
  button: {
    minWidth: 100,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.72,
  },
  ring: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderRadius: 14,
  },
  pulseMarker: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 4,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
  },
  iconRing: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderRadius: 12,
  },
  surface: {
    borderWidth: 1,
    borderRadius: 16,
  },
  surfacePadded: {
    padding: 16,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 10,
  },
  hintDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderRadius: 14,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
  },
  tabPressed: {
    opacity: 0.78,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingDot: {
    width: 15,
    height: 15,
    borderWidth: 2,
    borderRadius: 15,
  },
});
