import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import type { TicketTemplateElemento } from '../../../sistema/persistencia';

type Props = {
  elemento: TicketTemplateElemento;
  editableContenido?: boolean;
  onChange: (cambios: Partial<TicketTemplateElemento>) => void;
};

export function TicketFieldEditor({ elemento, editableContenido = true, onChange }: Props) {
  const handleNumberChange = (key: 'x' | 'y' | 'width' | 'height') => (value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    if (key === 'x' || key === 'y') {
      onChange({ posicion: { ...elemento.posicion, [key]: Math.max(0, Math.min(1, parsed)) } });
    } else {
      onChange({ tamano: { ...elemento.tamano, [key]: Math.max(0.1, Math.min(1.5, parsed)) } });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{elemento.label || elemento.id}</Text>
        {elemento.bloqueado && <Text style={styles.badge}>Bloqueado</Text>}
      </View>

      {editableContenido && !elemento.bloqueado && (
        <View style={styles.field}>
          <Text style={styles.label}>Contenido</Text>
          <TextInput
            style={styles.input}
            value={elemento.contenido || ''}
            onChangeText={(text) => onChange({ contenido: text })}
            placeholder="Texto a mostrar"
            placeholderTextColor="#64748b"
          />
        </View>
      )}

      <View style={styles.fieldGroup}>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>Posición X (0-1)</Text>
          <TextInput
            editable={!elemento.bloqueado}
            keyboardType="decimal-pad"
            style={[styles.input, elemento.bloqueado && styles.inputDisabled]}
            value={String(elemento.posicion.x)}
            onChangeText={handleNumberChange('x')}
          />
        </View>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>Posición Y (0-1)</Text>
          <TextInput
            editable={!elemento.bloqueado}
            keyboardType="decimal-pad"
            style={[styles.input, elemento.bloqueado && styles.inputDisabled]}
            value={String(elemento.posicion.y)}
            onChangeText={handleNumberChange('y')}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>Ancho (0-1.5)</Text>
          <TextInput
            editable={!elemento.bloqueado}
            keyboardType="decimal-pad"
            style={[styles.input, elemento.bloqueado && styles.inputDisabled]}
            value={String(elemento.tamano.width)}
            onChangeText={handleNumberChange('width')}
          />
        </View>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>Alto (0-1.5)</Text>
          <TextInput
            editable={!elemento.bloqueado}
            keyboardType="decimal-pad"
            style={[styles.input, elemento.bloqueado && styles.inputDisabled]}
            value={String(elemento.tamano.height)}
            onChangeText={handleNumberChange('height')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 12,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#e2e8f0',
    fontWeight: '700',
  },
  badge: {
    color: '#fbbf24',
    fontWeight: '700',
    fontSize: 12,
  },
  field: {
    gap: 6,
  },
  fieldGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
    gap: 6,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#27324a',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#e2e8f0',
  },
  inputDisabled: {
    opacity: 0.4,
  },
});
