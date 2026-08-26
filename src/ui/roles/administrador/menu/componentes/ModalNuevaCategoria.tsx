/**
 * ➕ Modal de creación de categoría del módulo Menú.
 * Extraído de `PantallaMenuAdmin.tsx`.
 */

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '@compartido/theme';

type ModalNuevaCategoriaProps = {
  nombre: string;
  onCambiarNombre: (nombre: string) => void;
  onCancelar: () => void;
  onCrear: () => void;
};

export function ModalNuevaCategoria({
  nombre,
  onCambiarNombre,
  onCancelar,
  onCrear,
}: ModalNuevaCategoriaProps) {
  return (
    <View style={styles.modalCard}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Nueva Categoría</Text>
        <Pressable onPress={onCancelar}>
          <Ionicons name="close" size={24} color="#94a3b8" />
        </Pressable>
      </View>

      <View style={styles.modalBody}>
        <Text style={styles.inputLabel}>Nombre de la Categoría</Text>
        <TextInput
          style={styles.textInput}
          value={nombre}
          onChangeText={onCambiarNombre}
          placeholder="Ej: Entradas, Bebidas, Postres"
          placeholderTextColor="#64748b"
          autoFocus
        />
        <View style={styles.modalFooter}>
          <Pressable style={styles.btnSecondary} onPress={onCancelar}>
            <Text style={styles.btnSecondaryText}>Cancelar</Text>
          </Pressable>
          <Pressable style={styles.btnPrimary} onPress={onCrear}>
            <Text style={styles.btnPrimaryText}>Crear Categoría</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    width: '100%',
    maxWidth: 450,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    color: '#64748B',
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  modalBody: {
    padding: theme.spacing.lg,
  },
  inputLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    marginBottom: theme.spacing.xs,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceDark,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    color: '#64748B',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.sizes.sm,
    marginBottom: theme.spacing.md,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  btnPrimary: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: theme.typography.weights.semibold,
    fontSize: theme.typography.sizes.sm,
  },
  btnSecondary: {
    backgroundColor: theme.colors.surfaceDark,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnSecondaryText: {
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.semibold,
    fontSize: theme.typography.sizes.sm,
  },
});
