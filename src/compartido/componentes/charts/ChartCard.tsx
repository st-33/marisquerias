import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 12,
  },
  content: {
    minHeight: 160,
    justifyContent: 'center',
  },
});
