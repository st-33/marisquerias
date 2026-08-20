import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { TicketTemplate } from '../../../sistema/persistencia';

type Props = {
  roles: string[];
  seleccionado: string | null;
  templates: Record<string, TicketTemplate & { dirty?: boolean }>;
  onSelect: (rol: string) => void;
};

export function TicketRoleSelector({ roles, seleccionado, templates, onSelect }: Props) {
  if (roles.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay roles configurados.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {roles.map((rol) => {
        const activo = rol === seleccionado;
        const info = templates[rol];
        const dirty = info?.dirty;
        return (
          <Pressable
            key={rol}
            onPress={() => onSelect(rol)}
            style={({ pressed }) => [
              styles.chip,
              activo && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={[styles.chipLabel, activo && styles.chipLabelActive]}>
              {info?.nombrePlantilla || rol}
            </Text>
            {dirty && <Text style={styles.dirtyBadge}>•</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#27324a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipLabel: {
    color: '#e2e8f0',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  chipLabelActive: {
    color: '#ffffff',
  },
  dirtyBadge: {
    color: '#fbbf24',
    fontSize: 16,
    marginTop: -2,
  },
  emptyContainer: {
    paddingVertical: 16,
  },
  emptyText: {
    color: '#94a3b8',
  },
});
