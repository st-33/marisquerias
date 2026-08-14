import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface FallbackScreenProps {
  role?: string;
  niche?: string | null;
  category?: string | null;
  message?: string;
}

export function FallbackScreen({
  role = 'desconocido',
  niche,
  category,
  message,
}: FallbackScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>🛠️</Text>
        <Text style={styles.title}>Módulo en Construcción</Text>
        <Text style={styles.subtitle}>
          {message ||
            `La vista para el rol "${role}" aún no está disponible para tu tipo de negocio.`}
        </Text>
        {(niche || category) && (
          <View style={styles.badgeContainer}>
            {niche && <Text style={styles.badge}>Nicho: {niche}</Text>}
            {category && <Text style={styles.badge}>Categoría: {category}</Text>}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  badge: {
    backgroundColor: '#334155',
    color: '#cbd5e1',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
