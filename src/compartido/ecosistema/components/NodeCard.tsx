import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EcosystemNode, NodeStatus, NodeType } from '../data/ecosystemMock';

interface Props {
  node: EcosystemNode;
  isMainNode?: boolean;
}

const getStatusColor = (status: NodeStatus) => {
  switch (status) {
    case 'activo':
      return '#4ade80'; // Green
    case 'pendiente':
      return '#fbbf24'; // Yellow
    case 'riesgo':
      return '#f87171'; // Red
    case 'oportunidad':
      return '#60a5fa'; // Blue
    default:
      return '#9ca3af';
  }
};

const getIconForType = (type: NodeType) => {
  switch (type) {
    case 'negocio':
      return 'domain';
    case 'modulo':
      return 'cube-outline';
    case 'estrategia':
      return 'chess-knight';
    case 'flujo':
      return 'arrow-decision-outline';
    case 'proceso':
      return 'cogs';
    default:
      return 'circle';
  }
};

export function NodeCard({ node, isMainNode = false }: Props) {
  const statusColor = getStatusColor(node.estado);
  const iconName = getIconForType(node.tipo);

  return (
    <Link href={`/node/${node.id}`} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.container,
          pressed && styles.pressed,
          isMainNode && styles.mainNode,
        ]}
      >
        <LinearGradient
          colors={isMainNode ? ['#1f2937', '#111827'] : ['#2a2d36', '#1a1c23']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, isMainNode && styles.mainGradient]}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name={iconName} size={24} color="#e5e7eb" />
            </View>
            <View style={[styles.statusBadge, { borderColor: statusColor }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {node.estado.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={2}>
              {node.nombre}
            </Text>
            <Text style={styles.type}>{node.tipo.toUpperCase()}</Text>
            {node.detalles.proposito ? (
              <Text style={styles.purpose} numberOfLines={2}>
                {node.detalles.proposito}
              </Text>
            ) : null}
          </View>

          {node.conexiones.length > 0 && (
            <View style={styles.connections}>
              <MaterialCommunityIcons name="link-variant" size={16} color="#9ca3af" />
              <Text style={styles.connectionsText}>{node.conexiones.length} conexiones</Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  mainNode: {
    width: 300,
    borderWidth: 1,
    borderColor: '#d4af37', // Gold border for main
  },
  gradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  mainGradient: {
    borderColor: 'transparent', // Handled by container
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  content: {
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  type: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  purpose: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
  },
  connections: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  connectionsText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
});
