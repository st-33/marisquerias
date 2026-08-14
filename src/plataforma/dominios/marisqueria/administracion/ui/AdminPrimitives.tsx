import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useAppTheme } from '../../../../../compartido/temas';

type AdminTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

type AdminSurfaceProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: string;
  muted?: boolean;
};

export function AdminSurface({ children, style, accent, muted = false }: AdminSurfaceProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: muted ? colors.surfaceDark : colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadowDark,
        },
        accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

type AdminSectionHeadingProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: React.ReactNode;
};

export function AdminSectionHeading({
  eyebrow,
  title,
  subtitle,
  icon,
  action,
}: AdminSectionHeadingProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingMain}>
        {icon ? (
          <View style={[styles.sectionIcon, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name={icon} size={17} color={colors.primary} />
          </View>
        ) : null}
        <View style={styles.sectionHeadingCopy}>
          {eyebrow ? (
            <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text>
          ) : null}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {action}
    </View>
  );
}

type AdminStatusPillProps = {
  label: string;
  tone?: AdminTone;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function AdminStatusPill({ label, tone = 'neutral', icon }: AdminStatusPillProps) {
  const { colors } = useAppTheme();
  const toneColor = {
    neutral: colors.textMuted,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    accent: colors.primary,
  }[tone];

  return (
    <View style={[styles.statusPill, { backgroundColor: `${toneColor}18` }]}>
      {icon ? <Ionicons name={icon} size={12} color={toneColor} /> : null}
      <Text style={[styles.statusPillText, { color: toneColor }]}>{label}</Text>
    </View>
  );
}

type AdminMetricTileProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
  style?: StyleProp<ViewStyle>;
};

export function AdminMetricTile({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  style,
}: AdminMetricTileProps) {
  const { colors } = useAppTheme();
  const tone = color || colors.primary;
  const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';

  return (
    <AdminSurface style={[styles.metricTile, style]}>
      <View style={styles.metricTileHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${tone}18` }]}>
          <Ionicons name={icon} size={18} color={tone} />
        </View>
        {trend ? <Ionicons name={trendIcon} size={16} color={tone} /> : null}
      </View>
      <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.metricSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </AdminSurface>
  );
}

type AdminActionButtonProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  emphasis?: boolean;
};

export function AdminActionButton({
  label,
  icon,
  onPress,
  emphasis = false,
}: AdminActionButtonProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: emphasis ? colors.primary : colors.surfaceDark,
          borderColor: emphasis ? colors.primary : colors.border,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={15} color={emphasis ? colors.background : colors.primary} />
      <Text
        style={[
          styles.actionButtonText,
          { color: emphasis ? colors.background : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  sectionHeadingMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadingCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  metricTile: {
    minHeight: 138,
    flexGrow: 1,
    flexBasis: 220,
  },
  metricTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricSubtitle: {
    fontSize: 11,
    marginTop: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
