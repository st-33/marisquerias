/**
 * 🛠️ EDITOR DE VARIANTES PARA PRODUCTOS
 * Componente reutilizable para editar grupos de variantes, opciones y reglas comerciales.
 * La unidad de venta ya viene predeterminada por el origen (Inventario o Libro de Platillos).
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
import type { Producto, VariantGroup, VariantOption } from '../../../../../sistema/persistencia';
import { theme, useAppTheme } from '@/compartido/temas';
import { SeccionDesplegable } from '../bloques/SeccionDesplegable';
import { FichaVariante } from '../bloques/FichaVariante';

type EditorVariantesProps = {
  variantes: Producto['variantes'];
  onChange: (variantes: Producto['variantes']) => void;
  visible?: Producto['visible'];
  onVisibleChange?: (visible: Producto['visible']) => void;
  prepMin?: number;
  onPrepMinChange?: (prepMin: number) => void;
  receta?: Producto['receta'];
  onRecetaChange?: (receta: Producto['receta']) => void;
  unidad?: 'pza' | 'kg';
  onUnidadChange?: (unidad: 'pza' | 'kg') => void;
  esPlatillo?: boolean;
  showVentaCrudo?: boolean;
  showMenuDigital?: boolean;
};

export default function EditorVariantes({
  variantes = {},
  onChange,
  visible = { digital: true, mesero: true },
  onVisibleChange,
  prepMin = 0,
  onPrepMinChange,
  unidad = 'pza',
  esPlatillo = false,
  showVentaCrudo = true,
  showMenuDigital = true,
}: EditorVariantesProps) {
  const { colors } = useAppTheme();
  const [groupForm, setGroupForm] = useState<Partial<VariantGroup>>({});
  const [optionForm, setOptionForm] = useState<Partial<VariantOption>>({});
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [editingOption, setEditingOption] = useState<{ gKey: string; oKey: string } | null>(null);
  const safeVisible = useMemo(
    () => ({ digital: true, mesero: true, ventaCrudo: true, ...(visible || {}) }),
    [visible]
  );
  const groupEntries = useMemo(() => Object.entries(variantes.grupos || {}), [variantes.grupos]);

  const updateVariantes = (updates: Partial<Producto['variantes']>) => {
    onChange({ ...variantes, ...updates });
  };

  const addGroup = () => {
    if (!groupForm.titulo) {
      Alert.alert('Atención', 'Escribe el nombre del grupo de opciones (ej. Tamaño o Preparación)');
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
      Alert.alert('Atención', 'Escribe el nombre de la opción');
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
      {/* ¿DÓNDE SE MUESTRA ESTE PRODUCTO? */}
      {(showMenuDigital || showVentaCrudo) && (
        <SeccionDesplegable
          title="¿Dónde se muestra esta opción?"
          icon={<Ionicons name="eye-outline" size={18} color={colors.accent} />}
          defaultExpanded={true}
        >
          <View style={styles.visibilityRow}>
            {showMenuDigital && (
              <Pressable
                onPress={() => toggleVisible('digital')}
                style={[
                  styles.visibilityBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  safeVisible.digital && {
                    backgroundColor: colors.successSoft,
                    borderColor: colors.success,
                  },
                ]}
              >
                <Ionicons name="phone-portrait-outline" size={16} color={colors.text} />
                <Text style={[styles.visibilityText, { color: colors.text }]}>Menú Digital</Text>
                {safeVisible.digital && (
                  <View style={[styles.checkmark, { backgroundColor: colors.success }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </Pressable>
            )}
            <Pressable
              onPress={() => toggleVisible('mesero')}
              style={[
                styles.visibilityBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                safeVisible.mesero && {
                  backgroundColor: colors.successSoft,
                  borderColor: colors.success,
                },
              ]}
            >
              <Ionicons name="restaurant-outline" size={16} color={colors.text} />
              <Text style={[styles.visibilityText, { color: colors.text }]}>Restaurante</Text>
              {safeVisible.mesero && (
                <View style={[styles.checkmark, { backgroundColor: colors.success }]}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
            </Pressable>
            {showVentaCrudo && (
              <Pressable
                onPress={() => toggleVisible('ventaCrudo')}
                style={[
                  styles.visibilityBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  safeVisible.ventaCrudo && {
                    backgroundColor: `${colors.accent}20`,
                    borderColor: colors.accent,
                  },
                ]}
              >
                <Ionicons name="storefront-outline" size={16} color={colors.text} />
                <Text style={[styles.visibilityText, { color: colors.text }]}>Mostrador</Text>
                {safeVisible.ventaCrudo && (
                  <View style={[styles.checkmark, { backgroundColor: colors.accent }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </Pressable>
            )}
          </View>
        </SeccionDesplegable>
      )}

      {/* Resumen de despacho predeterminado desde el origen */}
      <View
        style={[
          styles.predeterminedInfoBar,
          { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight },
        ]}
      >
        <Ionicons
          name={esPlatillo ? 'restaurant-outline' : 'cube-outline'}
          size={18}
          color={esPlatillo ? colors.accent : colors.primary}
        />
        <Text style={[styles.predeterminedInfoText, { color: colors.textSecondary }]}>
          {esPlatillo
            ? `Porción y receta predeterminadas desde Cocina${prepMin > 0 ? ` (~${prepMin} min de entrega)` : ''}.`
            : `Unidad de venta predeterminada desde Inventario: ${unidad === 'kg' ? 'Por Peso (Kg)' : 'Por Pieza (Pza)'}.`}
        </Text>
      </View>

      {/* Tiempo de entrega ajustable para platillos */}
      {esPlatillo && onPrepMinChange && (
        <SeccionDesplegable
          title="Tiempo estimado de entrega"
          icon={<Ionicons name="time-outline" size={18} color={colors.accent} />}
          badge={prepMin > 0 ? `~${prepMin} min` : undefined}
        >
          <View style={styles.prepTimeRow}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                  color: colors.text,
                  width: 110,
                },
              ]}
              value={prepMin.toString()}
              onChangeText={(text) => onPrepMinChange(parseInt(text) || 0)}
              keyboardType="number-pad"
              placeholder="15"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={{ color: colors.textSecondary, fontSize: 13, flex: 1 }}>
              minutos aproximados desde que el mesero envía la orden.
            </Text>
          </View>
        </SeccionDesplegable>
      )}

      {/* GRUPOS DE VARIANTES */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="options-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Variantes y Tamaños (Opcional)
          </Text>
          <View style={[styles.badge, { backgroundColor: `${colors.primary}24` }]}>
            <Text style={[styles.badgeText, { color: colors.primaryLight }]}>
              {groupEntries.length}
            </Text>
          </View>
        </View>

        {groupEntries.map(([key, group], index) => (
          <SeccionDesplegable
            key={key}
            title={group.titulo}
            badge={Object.keys(group.opciones || {}).length}
            icon={
              <Ionicons
                name={group.tipo === 'single' ? 'radio-button-on-outline' : 'checkbox-outline'}
                size={18}
                color={group.obligatorio ? colors.accent : colors.textSecondary}
              />
            }
            defaultExpanded={key === activeGroup || (!activeGroup && index === 0)}
          >
            <View style={styles.groupMeta}>
              <View style={styles.metaChips}>
                <Pressable
                  onPress={() => toggleGroupTipo(key)}
                  style={[
                    styles.metaChip,
                    { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}50` },
                  ]}
                >
                  <Ionicons
                    name={group.tipo === 'single' ? 'radio-button-on-outline' : 'checkbox-outline'}
                    size={13}
                    color={colors.primaryLight}
                  />
                  <Text style={[styles.metaChipText, { color: colors.primaryLight }]}>
                    {group.tipo === 'single' ? 'Elegir 1 opción' : 'Elegir varias'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleGroupObligatorio(key)}
                  style={[
                    styles.metaChip,
                    {
                      backgroundColor: group.obligatorio
                        ? `${colors.accent}22`
                        : `${colors.textMuted}18`,
                      borderColor: group.obligatorio ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={group.obligatorio ? 'alert-circle' : 'alert-circle-outline'}
                    size={13}
                    color={group.obligatorio ? colors.accent : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.metaChipText,
                      { color: group.obligatorio ? colors.accent : colors.textSecondary },
                    ]}
                  >
                    {group.obligatorio ? 'Obligatorio' : 'Opcional'}
                  </Text>
                </Pressable>
              </View>
              <Pressable onPress={() => deleteGroup(key)} style={styles.deleteGroupBtn}>
                <Ionicons name="trash-outline" size={17} color={colors.danger} />
              </Pressable>
            </View>

            {/* OPCIONES DEL GRUPO */}
            <View style={styles.optionsContainer}>
              {Object.entries(group.opciones || {}).map(([oKey, opt]) => (
                <View key={oKey} style={styles.optionRow}>
                  <FichaVariante
                    titulo={opt.titulo}
                    delta={opt.delta ?? 0}
                    onDelete={() => deleteOption(key, oKey)}
                  />
                  {groupEntries.length > 1 && (
                    <Pressable
                      onPress={() => setEditingOption({ gKey: key, oKey: oKey })}
                      style={[styles.advancedBtn, { backgroundColor: colors.card }]}
                    >
                      <Ionicons
                        name="settings-sharp"
                        size={16}
                        color={opt.triggers ? colors.primary : colors.textMuted}
                      />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.addOptionForm}>
              <TextInput
                style={[
                  styles.input,
                  {
                    flex: 1,
                    backgroundColor: colors.card,
                    borderColor: colors.borderLight,
                    color: colors.text,
                  },
                ]}
                placeholder="Ej. Mediano, Al mojo de ajo, A la diabla..."
                placeholderTextColor={colors.textMuted}
                value={optionForm.titulo || ''}
                onChangeText={(t) => setOptionForm({ ...optionForm, titulo: t })}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    width: 86,
                    backgroundColor: colors.card,
                    borderColor: colors.borderLight,
                    color: colors.text,
                  },
                ]}
                placeholder="+$ Extra"
                placeholderTextColor={colors.textMuted}
                value={optionForm.delta?.toString() || ''}
                onChangeText={(d) => setOptionForm({ ...optionForm, delta: parseFloat(d) || 0 })}
                keyboardType="decimal-pad"
              />
              <Pressable
                onPress={() => addOption(key)}
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="add" size={20} color={colors.background} />
              </Pressable>
            </View>

            {/* Opciones avanzadas de flujo solo si hay más de 1 grupo */}
            {groupEntries.length > 1 && (
              <SeccionDesplegable
                title="Flujo entre grupos (Mixtos / Siguiente paso)"
                icon={<Ionicons name="git-branch-outline" size={16} color={colors.textSecondary} />}
              >
                <View style={[styles.flowSection, { backgroundColor: colors.surfaceDark }]}>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                    PASO SIGUIENTE:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.flowRow}
                  >
                    <Pressable
                      onPress={() => setGroupNextStep(key, null)}
                      style={[
                        styles.flowChip,
                        { borderColor: colors.border },
                        !group.nextGroupId && {
                          backgroundColor: `${colors.primary}22`,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.flowChipText,
                          { color: !group.nextGroupId ? colors.primaryLight : colors.textMuted },
                        ]}
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
                              { borderColor: colors.border },
                              group.nextGroupId === gId && {
                                backgroundColor: `${colors.primary}22`,
                                borderColor: colors.primary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.flowChipText,
                                {
                                  color:
                                    group.nextGroupId === gId
                                      ? colors.primaryLight
                                      : colors.textMuted,
                                },
                              ]}
                            >
                              {g.titulo}
                            </Text>
                          </Pressable>
                        )
                    )}
                  </ScrollView>

                  <Text style={[styles.metaLabel, { color: colors.textMuted, marginTop: 8 }]}>
                    EXCLUIR REPETIDOS DE (PARA ÓRDENES MIXTAS):
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.flowRow}
                  >
                    <Pressable
                      onPress={() => setGroupExcludeSibling(key, null)}
                      style={[
                        styles.flowChip,
                        { borderColor: colors.border },
                        !group.excludeFromSibling && {
                          backgroundColor: `${colors.primary}22`,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.flowChipText,
                          {
                            color: !group.excludeFromSibling
                              ? colors.primaryLight
                              : colors.textMuted,
                          },
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
                              { borderColor: colors.border },
                              group.excludeFromSibling === gId && {
                                backgroundColor: `${colors.primary}22`,
                                borderColor: colors.primary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.flowChipText,
                                {
                                  color:
                                    group.excludeFromSibling === gId
                                      ? colors.primaryLight
                                      : colors.textMuted,
                                },
                              ]}
                            >
                              {g.titulo}
                            </Text>
                          </Pressable>
                        )
                    )}
                  </ScrollView>
                </View>
              </SeccionDesplegable>
            )}
          </SeccionDesplegable>
        ))}

        <View
          style={[
            styles.addGroupForm,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight },
          ]}
        >
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
            Agregar grupo de opciones (ej. Tamaño, Estilo de preparación, Proteína)
          </Text>
          <View style={styles.formRow}>
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                  color: colors.text,
                },
              ]}
              placeholder="Nombre del grupo..."
              placeholderTextColor={colors.textMuted}
              value={groupForm.titulo || ''}
              onChangeText={(t) => setGroupForm({ ...groupForm, titulo: t })}
            />
            <Pressable
              onPress={addGroup}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={20} color={colors.background} />
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
  const { colors } = useAppTheme();
  return (
    <Modal transparent visible animationType="slide">
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight },
          ]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Flujo condicional de opciones
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Mostrar u ocultar otros grupos al elegir esta opción
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            <View style={styles.optionFocusHeader}>
              <Ionicons name="sparkles-sharp" size={20} color={colors.primary} />
              <Text style={[styles.optionFocusTitle, { color: colors.text }]}>{option.titulo}</Text>
            </View>

            <Text style={[styles.configLabel, { color: colors.textSecondary }]}>
              AL SELECCIONAR, MOSTRAR GRUPO:
            </Text>
            <View style={styles.checkGrid}>
              {Object.entries(grupos || {}).map(
                ([id, g]: any) =>
                  id !== gKey && (
                    <Pressable
                      key={id}
                      onPress={() => onToggleTrigger(gKey, oKey, 'show', id)}
                      style={[
                        styles.checkBtn,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        option.triggers?.showGroups?.includes(id) && {
                          backgroundColor: `${colors.primary}22`,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Ionicons
                        name={option.triggers?.showGroups?.includes(id) ? 'eye' : 'eye-outline'}
                        size={18}
                        color={
                          option.triggers?.showGroups?.includes(id)
                            ? colors.primaryLight
                            : colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.checkBtnText,
                          {
                            color: option.triggers?.showGroups?.includes(id)
                              ? colors.text
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {g.titulo}
                      </Text>
                    </Pressable>
                  )
              )}
            </View>

            <View
              style={{ height: 1, backgroundColor: colors.border, marginVertical: 18 }}
            />

            <Text style={[styles.configLabel, { color: colors.textSecondary }]}>
              AL SELECCIONAR, OCULTAR GRUPO:
            </Text>
            <View style={styles.checkGrid}>
              {Object.entries(grupos || {}).map(
                ([id, g]: any) =>
                  id !== gKey && (
                    <Pressable
                      key={id}
                      onPress={() => onToggleTrigger(gKey, oKey, 'hide', id)}
                      style={[
                        styles.checkBtn,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        option.triggers?.hideGroups?.includes(id) && {
                          backgroundColor: `${colors.danger}22`,
                          borderColor: colors.danger,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          option.triggers?.hideGroups?.includes(id) ? 'eye-off' : 'eye-off-outline'
                        }
                        size={18}
                        color={
                          option.triggers?.hideGroups?.includes(id)
                            ? colors.danger
                            : colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.checkBtnText,
                          {
                            color: option.triggers?.hideGroups?.includes(id)
                              ? colors.text
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {g.titulo}
                      </Text>
                    </Pressable>
                  )
              )}
            </View>

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerContent: { paddingBottom: 20, gap: 10 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: '800' },
  visibilityRow: { flexDirection: 'row', gap: 10 },
  visibilityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  visibilityText: { fontSize: 14, fontWeight: '700' },
  checkmark: {
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  predeterminedInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  predeterminedInfoText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  prepTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
  },
  groupMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  metaChipText: { fontSize: 12, fontWeight: '700' },
  deleteGroupBtn: { padding: 6 },
  optionsContainer: { gap: 8, marginBottom: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  advancedBtn: { padding: 8, borderRadius: 8 },
  addOptionForm: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGroupForm: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
  },
  formLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  formRow: { flexDirection: 'row', gap: 8 },
  flowSection: {
    padding: 10,
    borderRadius: 10,
  },
  metaLabel: { fontSize: 11, fontWeight: '800', marginBottom: 6 },
  flowRow: { gap: 6 },
  flowChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  flowChipText: { fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontWeight: '800', fontSize: 18 },
  configLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.6,
  },
  checkGrid: { gap: 8 },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
  },
  checkBtnText: { fontSize: 14, fontWeight: '700' },
  optionFocusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  optionFocusTitle: { fontSize: 20, fontWeight: '800' },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
