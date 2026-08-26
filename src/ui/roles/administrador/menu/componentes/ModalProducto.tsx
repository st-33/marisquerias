/**
 * 🗂️ Modal de producto (nuevo/editar) del módulo Menú, con pestañas
 * Básico / Variantes / Receta.
 * Extraído de `PantallaMenuAdmin.tsx`.
 */

import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { theme } from '@compartido/theme';
import EditorReceta from '../editores/EditorReceta';
import EditorVariantes from '../editores/EditorVariantes';
import type { FormState } from '../logica/formularioProducto';
import type { EtiquetasMenu } from '../logica/etiquetas';

export type PestanaProducto = 'basico' | 'variantes' | 'receta';

type ModalProductoProps = {
  modo: 'addProd' | 'editProd';
  formData: FormState;
  onFormDataChange: (form: FormState) => void;
  pestana: PestanaProducto;
  onPestanaChange: (pestana: PestanaProducto) => void;
  itemsInventario: any[];
  validacion: any;
  validando: boolean;
  onRecetaEnEdicion: (ingredientes: any) => void;
  etiquetas: EtiquetasMenu;
  isSaving: boolean;
  onGuardar: () => void;
  onCancelar: () => void;
};

export function ModalProducto({
  modo,
  formData,
  onFormDataChange,
  pestana,
  onPestanaChange,
  itemsInventario,
  validacion,
  validando,
  onRecetaEnEdicion,
  etiquetas: l,
  isSaving,
  onGuardar,
  onCancelar,
}: ModalProductoProps) {
  return (
    <View style={[styles.modalCard, styles.modalCardLarge]}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
          {modo === 'addProd' ? 'Nuevo Producto' : 'Editar Producto'}
        </Text>
        <Pressable onPress={onCancelar}>
          <Ionicons name="close" size={24} color="#94a3b8" />
        </Pressable>
      </View>

      <View style={styles.modalBody}>
        <View style={styles.tabsRow}>
          <Pressable
            style={[styles.tabBtn, pestana === 'basico' && styles.tabBtnActive]}
            onPress={() => onPestanaChange('basico')}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={pestana === 'basico' ? theme.colors.primary : '#94a3b8'}
            />
            <Text style={[styles.tabText, pestana === 'basico' && styles.tabTextActive]}>
              Básico
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, pestana === 'variantes' && styles.tabBtnActive]}
            onPress={() => onPestanaChange('variantes')}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={pestana === 'variantes' ? theme.colors.primary : '#94a3b8'}
            />
            <Text style={[styles.tabText, pestana === 'variantes' && styles.tabTextActive]}>
              Variantes/Opciones
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, pestana === 'receta' && styles.tabBtnActive]}
            onPress={() => onPestanaChange('receta')}
          >
            <Ionicons
              name="restaurant-outline"
              size={18}
              color={pestana === 'receta' ? theme.colors.primary : '#94a3b8'}
            />
            <Text style={[styles.tabText, pestana === 'receta' && styles.tabTextActive]}>
              {l.recipeTab}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.modalFormScroll}
          contentContainerStyle={styles.modalFormContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {pestana === 'basico' && (
            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Nombre del Producto *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.nombre}
                onChangeText={(v) => onFormDataChange({ ...formData, nombre: v })}
                placeholder="Ej: Producto Base"
                placeholderTextColor="#64748b"
              />

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Precio Base ($) *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.precio}
                    onChangeText={(v) => onFormDataChange({ ...formData, precio: v })}
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Tiempo Prep. (min)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={String(formData.prepMin || '')}
                    onChangeText={(v) =>
                      onFormDataChange({ ...formData, prepMin: parseInt(v) || 0 })
                    }
                    placeholder="Ej: 15"
                    placeholderTextColor="#64748b"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Unidad de Venta *</Text>
                  <View style={styles.unitContainer}>
                    <Pressable
                      style={[styles.unitBtn, formData.unidad === 'pza' && styles.unitBtnActive]}
                      onPress={() => onFormDataChange({ ...formData, unidad: 'pza' })}
                    >
                      <Ionicons
                        name="shapes-outline"
                        size={18}
                        color={formData.unidad === 'pza' ? 'white' : '#64748b'}
                      />
                      <Text
                        style={[
                          styles.unitText,
                          formData.unidad === 'pza' && styles.unitTextActive,
                        ]}
                      >
                        Por Pieza (Pza)
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.unitBtn, formData.unidad === 'kg' && styles.unitBtnActive]}
                      onPress={() => onFormDataChange({ ...formData, unidad: 'kg' })}
                    >
                      <Ionicons
                        name="scale-outline"
                        size={18}
                        color={formData.unidad === 'kg' ? 'white' : '#64748b'}
                      />
                      <Text
                        style={[styles.unitText, formData.unidad === 'kg' && styles.unitTextActive]}
                      >
                        Por Peso (Kg)
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>{l.sellerVisibility}</Text>
                  <Text style={styles.switchSublabel}>{l.sellerSubtext}</Text>
                </View>
                <Switch
                  value={formData.visible?.mesero}
                  onValueChange={(v) =>
                    onFormDataChange({
                      ...formData,
                      visible: { ...formData.visible, mesero: v },
                    })
                  }
                />
              </View>

              <View style={styles.sectionContainer}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>{l.preparationFlow}</Text>
                    <Text style={styles.switchSublabel}>
                      Sobrescribe la configuración global de la categoría
                    </Text>
                  </View>
                  <Switch
                    value={formData.usarConfigPersonalizada}
                    onValueChange={(v) =>
                      onFormDataChange({ ...formData, usarConfigPersonalizada: v })
                    }
                  />
                </View>

                {formData.usarConfigPersonalizada && (
                  <>
                    <Text style={styles.sectionHelp}>
                      Configuración exclusiva para este producto:
                    </Text>
                    <View style={[styles.switchRow, styles.switchRowNested]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.switchLabel}>{l.sendToPreparation}</Text>
                        <Text style={styles.switchSublabel}>
                          Si se desactiva, no generará comanda
                        </Text>
                      </View>
                      <Switch
                        value={formData.enviarACocina}
                        onValueChange={(v) => onFormDataChange({ ...formData, enviarACocina: v })}
                      />
                    </View>

                    {formData.enviarACocina && (
                      <View style={[styles.switchRow, styles.switchRowNested]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.switchLabel}>Auto-Completar (Saltar Preparando)</Text>
                          <Text style={styles.switchSublabel}>Pasa directo a listo al enviar</Text>
                        </View>
                        <Switch
                          value={formData.saltarPreparando}
                          onValueChange={(v) =>
                            onFormDataChange({ ...formData, saltarPreparando: v })
                          }
                        />
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          )}

          {pestana === 'variantes' && (
            <EditorVariantes
              variantes={formData.variantes}
              onChange={(newVariantes) =>
                onFormDataChange({ ...formData, variantes: newVariantes })
              }
              visible={formData.visible}
              onVisibleChange={(visible) => onFormDataChange({ ...formData, visible })}
              prepMin={formData.prepMin}
              onPrepMinChange={(prepMin) => onFormDataChange({ ...formData, prepMin })}
              showVentaCrudo={l.showVentaCrudo}
            />
          )}

          {pestana === 'receta' && (
            <EditorReceta
              receta={formData.receta}
              onRecetaChange={(newReceta) => {
                onFormDataChange({ ...formData, receta: newReceta });
                onRecetaEnEdicion(newReceta?.ingredientes || null);
              }}
              itemsInventario={itemsInventario as any}
              validacion={validacion}
              validando={validando}
            />
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <Pressable style={styles.btnSecondary} onPress={onCancelar} disabled={isSaving}>
            <Text style={styles.btnSecondaryText}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[styles.btnPrimary, isSaving && { opacity: 0.5 }]}
            onPress={onGuardar}
            disabled={isSaving}
          >
            <Text style={styles.btnPrimaryText}>
              {isSaving ? 'Guardando...' : 'Guardar Producto'}
            </Text>
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
  modalCardLarge: {
    maxWidth: 650,
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
  tabsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.xs,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.surfaceDark,
  },
  tabText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  modalFormScroll: {
    maxHeight: 400,
  },
  modalFormContent: {
    paddingBottom: theme.spacing.sm,
  },
  formSection: {
    gap: theme.spacing.xs,
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
  inputRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  unitContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  unitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceDark,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    borderRadius: 12,
  },
  unitBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  unitText: {
    color: '#64748b',
    fontWeight: theme.typography.weights.semibold,
  },
  unitTextActive: {
    color: 'white',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  switchLabel: {
    color: '#64748B',
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  switchSublabel: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
  },
  sectionContainer: {
    backgroundColor: theme.colors.surfaceDark,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionHelp: {
    color: '#f59e0b',
    fontSize: theme.typography.sizes.sm,
    fontStyle: 'italic',
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  switchRowNested: {
    marginLeft: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
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
