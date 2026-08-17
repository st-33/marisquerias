/**
 * 🛠️ EDITOR DE VARIANTES PARA PRODUCTOS
 * Componente reutilizable para editar grupos de variantes, opciones y reglas
 */

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Producto, VariantGroup, VariantOption } from '../../../plataforma/base/_persistencia';
import { theme } from '@compartido/theme';
import { CollapsibleSection } from './menu/CollapsibleSection';
import { VariantChip } from './menu/VariantChip';

type VariantEditorProps = {
  variantes: Producto['variantes'];
  onChange: (variantes: Producto['variantes']) => void;
  visible?: Producto['visible'];
  onVisibleChange?: (visible: Producto['visible']) => void;
  prepMin?: number;
  onPrepMinChange?: (prepMin: number) => void;
  receta?: Producto['receta'];
  onRecetaChange?: (receta: Producto['receta']) => void;
  showVentaCrudo?: boolean;
};

export default function VariantEditor({
  variantes = {},
  onChange,
  visible = { digital: true, mesero: true },
  onVisibleChange,
  prepMin = 0,
  onPrepMinChange,
  receta = {},
  onRecetaChange,
  showVentaCrudo = true,
}: VariantEditorProps) {
  const [groupForm, setGroupForm] = useState<Partial<VariantGroup>>({});
  const [optionForm, setOptionForm] = useState<Partial<VariantOption>>({});
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [editingOption, setEditingOption] = useState<{ gKey: string; oKey: string } | null>(null);
  const safeVisible = useMemo(
    () => ({ digital: true, mesero: true, ventaCrudo: true, ...(visible || {}) }),
    [visible]
  );
  const groupEntries = useMemo(
    () => Object.entries(variantes.grupos || {}),
    [variantes.grupos]
  );

  const updateVariantes = (updates: Partial<Producto['variantes']>) => {
    onChange({ ...variantes, ...updates });
  };

  const addGroup = () => {
    if (!groupForm.titulo) {
      Alert.alert('Error', 'Completa el título del grupo');
      return;
    }
    const grupos = variantes.grupos || {};
    const newKey = `g${Date.now()}`;
    const rolValue =
      groupForm.rol && groupForm.rol !== groupForm.titulo ? groupForm.rol : undefined;

    updateVariantes({
      grupos: {
        ...grupos,
        [newKey]: {
          obligatorio: false,
          opciones: {},
          ...(rolValue ? { rol: rolValue } : {}),
          tipo: 'single',
          titulo: groupForm.titulo!,
        },
      },
    });
    setGroupForm({});
    setActiveGroup(newKey);
  };

  const deleteGroup = (key: string) => {
    const grupos = variantes.grupos || {};
    const { [key]: _, ...rest } = grupos;
    updateVariantes({ grupos: rest });
    if (activeGroup === key) setActiveGroup(null);
  };

  const addOption = (groupKey: string) => {
    if (!optionForm.titulo) {
      Alert.alert('Error', 'Completa título');
      return;
    }
    const grupos = variantes.grupos || {};
    const opciones = grupos[groupKey]?.opciones || {};
    const newKey = `o${Date.now()}`;
    const deltaValue = Number(optionForm.delta || 0);

    updateVariantes({
      grupos: {
        ...grupos,
        [groupKey]: {
          ...grupos[groupKey]!,
          opciones: {
            ...opciones,
            [newKey]: {
              ...(deltaValue > 0 ? { delta: deltaValue } : {}),
              titulo: optionForm.titulo!,
            },
          },
        },
      },
    });
    setOptionForm({});
  };

  const deleteOption = (groupKey: string, optKey: string) => {
    const grupos = variantes.grupos || {};
    const opciones = grupos[groupKey]?.opciones || {};
    const { [optKey]: _, ...rest } = opciones;
    updateVariantes({
      grupos: {
        ...grupos,
        [groupKey]: { ...grupos[groupKey]!, opciones: rest },
      },
    });
  };

  const toggleOptionTrigger = (
    groupKey: string,
    optKey: string,
    type: 'show' | 'hide',
    targetId: string
  ) => {
    const grupos = variantes.grupos || {};
    const option = grupos[groupKey]?.opciones[optKey];
    if (!option) return;

    const currentList = option.triggers?.[type === 'show' ? 'showGroups' : 'hideGroups'] || [];
    const newList = currentList.includes(targetId)
      ? currentList.filter((id) => id !== targetId)
      : [...currentList, targetId];

    updateVariantes({
      grupos: {
        ...grupos,
        [groupKey]: {
          ...grupos[groupKey]!,
          opciones: {
            ...grupos[groupKey]!.opciones,
            [optKey]: {
              ...option,
              triggers: {
                ...option.triggers,
                [type === 'show' ? 'showGroups' : 'hideGroups']:
                  newList.length > 0 ? newList : undefined,
              },
            },
          },
        },
      },
    });
  };

  const toggleVisible = (key: 'digital' | 'mesero' | 'ventaCrudo') => {
    onVisibleChange?.({ ...safeVisible, [key]: !safeVisible[key] });
  };

  const toggleGroupObligatorio = (groupKey: string) => {
    const grupos = variantes.grupos || {};
    updateVariantes({
      grupos: {
        ...grupos,
        [groupKey]: { ...grupos[groupKey]!, obligatorio: !grupos[groupKey]?.obligatorio },
      },
    });
  };

  const toggleGroupTipo = (groupKey: string) => {
    const grupos = variantes.grupos || {};
    updateVariantes({
      grupos: {
        ...grupos,
        [groupKey]: {
          ...grupos[groupKey]!,
          tipo: grupos[groupKey]?.tipo === 'single' ? 'multi' : 'single',
        },
      },
    });
  };

  const setGroupNextStep = (groupKey: string, nextKey: string | null) => {
    const grupos = variantes.grupos || {};
    updateVariantes({
      grupos: {
        ...grupos,
        [groupKey]: { ...grupos[groupKey]!, nextGroupId: nextKey || undefined },
      },
    });
  };

  const setGroupExcludeSibling = (groupKey: string, siblingKey: string | null) => {
    const grupos = variantes.grupos || {};
    updateVariantes({
      grupos: {
        ...grupos,
        [groupKey]: { ...grupos[groupKey]!, excludeFromSibling: siblingKey || undefined },
      },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.containerContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      {/* VISIBILIDAD */}
      <CollapsibleSection
        title="Visibilidad"
        icon={<Ionicons name="eye-outline" size={18} color={theme.colors.accent} />}
        defaultExpanded={true}
      >
        <View style={styles.visibilityRow}>
          <Pressable
            onPress={() => toggleVisible('digital')}
            style={[styles.visibilityBtn, safeVisible.digital && styles.visibilityBtnActive]}
          >
            <Ionicons name="phone-portrait-outline" size={16} color="#fff" />
            <Text style={styles.visibilityText}>Digital</Text>
            {safeVisible.digital && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => toggleVisible('mesero')}
            style={[styles.visibilityBtn, safeVisible.mesero && styles.visibilityBtnActive]}
          >
            <Ionicons name="person-outline" size={16} color="#fff" />
            <Text style={styles.visibilityText}>Mesero</Text>
            {safeVisible.mesero && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </Pressable>
          {showVentaCrudo && (
            <Pressable
              onPress={() => toggleVisible('ventaCrudo')}
              style={[styles.visibilityBtn, safeVisible.ventaCrudo && styles.visibilityBtnActiveAlt]}
            >
              <Ionicons name="storefront-outline" size={16} color="#fff" />
              <Text style={styles.visibilityText}>V. Crudo</Text>
              {safeVisible.ventaCrudo && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
            </Pressable>
          )}
        </View>
      </CollapsibleSection>

      {/* PREP TIME */}
      <CollapsibleSection
        title="Tiempo de preparación"
        icon={<Ionicons name="time-outline" size={18} color={theme.colors.accent} />}
        badge={prepMin > 0 ? `${prepMin} min` : undefined}
      >
        <TextInput
          style={styles.input}
          value={prepMin.toString()}
          onChangeText={(text) => onPrepMinChange?.(parseInt(text) || 0)}
          keyboardType="number-pad"
          placeholder="Minutos"
          placeholderTextColor="#6b7280"
        />
      </CollapsibleSection>

      {/* GRUPOS DE VARIANTES */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="options-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Grupos de Variantes</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{groupEntries.length}</Text>
          </View>
        </View>

        {groupEntries.map(([key, group], index) => (
          <CollapsibleSection
            key={key}
            title={group.titulo}
            badge={Object.keys(group.opciones || {}).length}
            icon={
              <Ionicons
                name={group.tipo === 'single' ? 'radio-button-on-outline' : 'checkbox-outline'}
                size={18}
                color={group.obligatorio ? '#f59e0b' : theme.colors.textSecondary}
              />
            }
            defaultExpanded={key === activeGroup || (!activeGroup && index === 0)}
          >
            <View style={styles.groupMeta}>
              <View style={styles.metaChips}>
                <View style={[styles.metaChip, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Text style={[styles.metaChipText, { color: '#a78bfa' }]}>
                    {group.rol || group.titulo}
                  </Text>
                </View>
                <Pressable
                  onPress={() => toggleGroupTipo(key)}
                  style={[styles.metaChip, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}
                >
                  <Ionicons
                    name={group.tipo === 'single' ? 'radio-button-on-outline' : 'checkbox-outline'}
                    size={12}
                    color="#60a5fa"
                  />
                  <Text style={[styles.metaChipText, { color: '#60a5fa' }]}>
                    {group.tipo === 'single' ? 'Una opción' : 'Multi'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleGroupObligatorio(key)}
                  style={[
                    styles.metaChip,
                    {
                      backgroundColor: group.obligatorio
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(156, 163, 175, 0.15)',
                    },
                  ]}
                >
                  <Ionicons
                    name={group.obligatorio ? 'alert-circle' : 'alert-circle-outline'}
                    size={12}
                    color={group.obligatorio ? '#ef4444' : '#9ca3af'}
                  />
                  <Text
                    style={[
                      styles.metaChipText,
                      { color: group.obligatorio ? '#ef4444' : '#9ca3af' },
                    ]}
                  >
                    {group.obligatorio ? 'Obligatorio' : 'Opcional'}
                  </Text>
                </Pressable>
              </View>
              <Pressable onPress={() => deleteGroup(key)} style={styles.deleteGroupBtn}>
                <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
              </Pressable>
            </View>

            {/* FLUJO Y MIXTOS (PRO) */}
            <View style={styles.flowSection}>
              <Text style={styles.metaLabel}>PASO SIGUIENTE:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.flowRow}
              >
                <Pressable
                  onPress={() => setGroupNextStep(key, null)}
                  style={[styles.flowChip, !group.nextGroupId && styles.flowChipActive]}
                >
                  <Text
                    style={[styles.flowChipText, !group.nextGroupId && styles.flowChipTextActive]}
                  >
                    Fin
                  </Text>
                </Pressable>
                {groupEntries.map(
                  ([gId, g]) =>
                    gId !== key && (
                      <Pressable
                        key={gId}
                        onPress={() => setGroupNextStep(key, gId)}
                        style={[
                          styles.flowChip,
                          group.nextGroupId === gId && styles.flowChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.flowChipText,
                            group.nextGroupId === gId && styles.flowChipTextActive,
                          ]}
                        >
                          {g.titulo}
                        </Text>
                      </Pressable>
                    )
                )}
              </ScrollView>

              <View
                style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 8 }}
              />

              <Text style={styles.metaLabel}>EXCLUIR REPETIDOS DE (MIXTOS):</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.flowRow}
              >
                <Pressable
                  onPress={() => setGroupExcludeSibling(key, null)}
                  style={[styles.flowChip, !group.excludeFromSibling && styles.flowChipActive]}
                >
                  <Text
                    style={[
                      styles.flowChipText,
                      !group.excludeFromSibling && styles.flowChipTextActive,
                    ]}
                  >
                    Ninguno
                  </Text>
                </Pressable>
                {groupEntries.map(
                  ([gId, g]) =>
                    gId !== key && (
                      <Pressable
                        key={gId}
                        onPress={() => setGroupExcludeSibling(key, gId)}
                        style={[
                          styles.flowChip,
                          group.excludeFromSibling === gId && styles.flowChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.flowChipText,
                            group.excludeFromSibling === gId && styles.flowChipTextActive,
                          ]}
                        >
                          {g.titulo}
                        </Text>
                      </Pressable>
                    )
                )}
              </ScrollView>
            </View>

            {/* OPCIONES */}
            <View style={styles.optionsContainer}>
              {Object.entries(group.opciones || {}).map(([oKey, opt]) => (
                <View key={oKey} style={styles.optionRow}>
                  <VariantChip
                    titulo={opt.titulo}
                    delta={opt.delta ?? 0}
                    onDelete={() => deleteOption(key, oKey)}
                  />
                  <Pressable
                    onPress={() => setEditingOption({ gKey: key, oKey: oKey })}
                    style={styles.advancedBtn}
                  >
                    <Ionicons
                      name="settings-sharp"
                      size={16}
                      color={opt.triggers ? theme.colors.primary : theme.colors.textMuted}
                    />
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.addOptionForm}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Opción"
                placeholderTextColor="#6b7280"
                value={optionForm.titulo || ''}
                onChangeText={(t) => setOptionForm({ ...optionForm, titulo: t })}
              />
              <TextInput
                style={[styles.input, { width: 70 }]}
                placeholder="$"
                placeholderTextColor="#6b7280"
                value={optionForm.delta?.toString() || ''}
                onChangeText={(d) => setOptionForm({ ...optionForm, delta: parseFloat(d) || 0 })}
                keyboardType="decimal-pad"
              />
              <Pressable onPress={() => addOption(key)} style={styles.addBtn}>
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            </View>
          </CollapsibleSection>
        ))}

        <View style={styles.addGroupForm}>
          <Text style={styles.formLabel}>Nuevo Grupo</Text>
          <View style={styles.formRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Título"
              placeholderTextColor="#6b7280"
              value={groupForm.titulo || ''}
              onChangeText={(t) => setGroupForm({ ...groupForm, titulo: t })}
            />
            <Pressable onPress={addGroup} style={styles.addBtn}>
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>

      {editingOption && (
        <AdvancedOptionSettings
          gKey={editingOption.gKey}
          oKey={editingOption.oKey}
          option={variantes.grupos![editingOption.gKey]?.opciones[editingOption.oKey]}
          grupos={variantes.grupos}
          onClose={() => setEditingOption(null)}
          onToggleTrigger={toggleOptionTrigger}
        />
      )}
    </ScrollView>
  );
}

function AdvancedOptionSettings({ gKey, oKey, option, grupos, onClose, onToggleTrigger }: any) {
  return (
    <Modal transparent visible animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Ajustes de Flujo Inteligente</Text>
              <Text style={{ color: '#64748b', fontSize: 11 }}>
                Configura la visibilidad basada en esta opción
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </Pressable>
          </View>

          <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            <View style={styles.optionFocusHeader}>
              <Ionicons name="sparkles-sharp" size={20} color={theme.colors.primary} />
              <Text style={styles.optionFocusTitle}>{option.titulo}</Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.infoText}>
                Usa el sistema de &quot;Whitelist&quot; para activar grupos ocultos, o
                &quot;Blacklist&quot; para forzar el ocultamiento de grupos activos.
              </Text>
            </View>

            <Text style={styles.configLabel}>AL SELECCIONAR, ACTIVAR (SHOW):</Text>
            <View style={styles.checkGrid}>
              {Object.entries(grupos || {}).map(
                ([id, g]: any) =>
                  id !== gKey && (
                    <Pressable
                      key={id}
                      onPress={() => onToggleTrigger(gKey, oKey, 'show', id)}
                      style={[
                        styles.checkBtn,
                        option.triggers?.showGroups?.includes(id) && styles.checkBtnActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.checkIcon,
                          option.triggers?.showGroups?.includes(id) && styles.checkIconActive,
                        ]}
                      >
                        <Ionicons
                          name={option.triggers?.showGroups?.includes(id) ? 'eye' : 'eye-outline'}
                          size={16}
                          color={option.triggers?.showGroups?.includes(id) ? 'white' : '#475569'}
                        />
                      </View>
                      <Text
                        style={[
                          styles.checkBtnText,
                          option.triggers?.showGroups?.includes(id) && styles.checkBtnTextActive,
                        ]}
                      >
                        {g.titulo}
                      </Text>
                    </Pressable>
                  )
              )}
            </View>

            <View
              style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 24 }}
            />

            <Text style={styles.configLabel}>AL SELECCIONAR, DESACTIVAR (HIDE):</Text>
            <View style={styles.checkGrid}>
              {Object.entries(grupos || {}).map(
                ([id, g]: any) =>
                  id !== gKey && (
                    <Pressable
                      key={id}
                      onPress={() => onToggleTrigger(gKey, oKey, 'hide', id)}
                      style={[
                        styles.checkBtn,
                        option.triggers?.hideGroups?.includes(id) && styles.checkBtnActiveHide,
                      ]}
                    >
                      <View
                        style={[
                          styles.checkIcon,
                          option.triggers?.hideGroups?.includes(id) && styles.checkIconActiveHide,
                        ]}
                      >
                        <Ionicons
                          name={
                            option.triggers?.hideGroups?.includes(id)
                              ? 'eye-off'
                              : 'eye-off-outline'
                          }
                          size={16}
                          color={option.triggers?.hideGroups?.includes(id) ? 'white' : '#475569'}
                        />
                      </View>
                      <Text
                        style={[
                          styles.checkBtnText,
                          option.triggers?.hideGroups?.includes(id) &&
                            styles.checkBtnTextActiveHide,
                        ]}
                      >
                        {g.titulo}
                      </Text>
                    </Pressable>
                  )
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerContent: { paddingBottom: 24 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', flex: 1 },
  badge: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: { color: theme.colors.primary, fontSize: 12, fontWeight: 'bold' },
  visibilityRow: { flexDirection: 'row', gap: 10 },
  visibilityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 12,
  },
  visibilityBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  visibilityBtnActiveAlt: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  visibilityText: { color: 'white', fontSize: 14 },
  checkmark: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 10,
    color: 'white',
    borderWidth: 1,
    borderColor: '#374151',
  },
  groupMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  metaChipText: { fontSize: 11, fontWeight: 'bold' },
  deleteGroupBtn: { padding: 6 },
  optionsContainer: { gap: 8, marginBottom: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  advancedBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  addOptionForm: { flexDirection: 'row', gap: 8 },
  addBtn: {
    backgroundColor: theme.colors.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGroupForm: { backgroundColor: '#1f2937', padding: 16, borderRadius: 12, marginTop: 10 },
  formLabel: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  formRow: { flexDirection: 'row', gap: 8 },
  flowSection: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  metaLabel: { color: '#64748b', fontSize: 10, fontWeight: 'bold', marginBottom: 6 },
  flowRow: { gap: 6 },
  flowChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  flowChipActive: { backgroundColor: 'rgba(37, 99, 235, 0.2)', borderColor: theme.colors.primary },
  flowChipText: { color: '#64748b', fontSize: 11 },
  flowChipTextActive: { color: theme.colors.primary, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.colors.surfaceDark,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: { color: 'white', fontWeight: '900', fontSize: 18, letterSpacing: -0.5 },
  configLabel: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: 1,
  },
  checkGrid: { gap: 8 },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  checkBtnActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  checkBtnActiveHide: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  checkIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconActive: { backgroundColor: theme.colors.primary },
  checkIconActiveHide: { backgroundColor: theme.colors.danger },
  checkBtnText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  checkBtnTextActive: { color: 'white', fontWeight: 'bold' },
  checkBtnTextActiveHide: { color: 'white', fontWeight: 'bold' },
  optionFocusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    justifyContent: 'center',
  },
  optionFocusTitle: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.1)',
  },
  infoText: { color: '#94a3b8', fontSize: 12, flex: 1, lineHeight: 18 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
