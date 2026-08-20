import React, { useMemo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import type { TicketTemplateAcciones } from '../../../sistema/persistencia';

type Props = {
  acciones: TicketTemplateAcciones;
  onChange: (acciones: TicketTemplateAcciones) => void;
};

const AVAILABLE_TRIGGERS = [
  { id: 'imprimir_cocina', label: 'Duplicar en cocina' },
  { id: 'alerta_stock_bajo', label: 'Imprimir alerta de stock bajo' },
  { id: 'copiar_admin', label: 'Enviar copia a admin' },
];

export function TicketActionsConfigurator({ acciones, onChange }: Props) {
  const printerList = useMemo(() => (acciones.imprimirEn ?? []).join(', '), [acciones.imprimirEn]);
  const triggerSet = useMemo(() => new Set(acciones.disparadores ?? []), [acciones.disparadores]);

  const toggleTrigger = (id: string) => {
    const next = new Set(triggerSet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange({ ...acciones, disparadores: Array.from(next) });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rutas de impresión</Text>
      <Text style={styles.label}>IDs de impresora (separados por coma)</Text>
      <TextInput
        style={styles.input}
        placeholder="impresora_caja, impresora_cocina"
        placeholderTextColor="#4b5563"
        value={printerList}
        onChangeText={(text) => {
          const sanitized = text
            .split(',')
            .map((token) => token.trim())
            .filter((token) => token.length > 0);
          onChange({ ...acciones, imprimirEn: sanitized });
        }}
      />

      <Text style={[styles.title, { marginTop: 16 }]}>Disparadores automáticos</Text>
      <View style={styles.triggerList}>
        {AVAILABLE_TRIGGERS.map((trigger) => {
          const active = triggerSet.has(trigger.id);
          return (
            <Pressable
              key={trigger.id}
              onPress={() => toggleTrigger(trigger.id)}
              style={({ pressed }) => [
                styles.triggerChip,
                active && styles.triggerChipActive,
                pressed && styles.triggerChipPressed,
              ]}
            >
              <Text style={[styles.triggerText, active && styles.triggerTextActive]}>
                {trigger.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
    gap: 10,
  },
  title: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 14,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#27324a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e2e8f0',
  },
  triggerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  triggerChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#27324a',
  },
  triggerChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  triggerChipPressed: {
    opacity: 0.85,
  },
  triggerText: {
    color: '#cbd5f5',
    fontWeight: '600',
  },
  triggerTextActive: {
    color: '#ffffff',
  },
});
