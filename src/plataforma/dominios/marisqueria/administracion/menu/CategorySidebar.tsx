import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { Categoria } from '../../../../base/_persistencia';
import { useThemedColors } from '../../../../../compartido/hooks/useThemedColors';
import { theme } from '@compartido/theme';

export type CategorySidebarProps = {
  categorias: Categoria[];
  activeId: string | null;
  totals?: Record<string, number>;
  onSelect: (id: string) => void;
  onDelete: (id: string, nombre: string) => void;
  onToggleEnviarACocina?: (id: string, enabled: boolean) => void;
  onToggleSaltarPreparando?: (id: string, enabled: boolean) => void;
  onUpdateHerencia?: (id: string, herencia: Categoria['herencia']) => void;
  showVentaCrudo?: boolean;
};

export function CategorySidebar({
  categorias,
  activeId,
  totals,
  onSelect,
  onDelete,
  onToggleEnviarACocina,
  onToggleSaltarPreparando,
  onUpdateHerencia,
  showVentaCrudo = true,
}: CategorySidebarProps) {
  const COLORS = useThemedColors();
  const [expandedConfig, setExpandedConfig] = useState<Record<string, boolean>>({});

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg.secondary }]}>
      <Text style={[styles.title, { color: COLORS.text.secondary }]}>Categorías</Text>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {categorias.map((cat) => {
          const active = activeId === cat.id;
          const enviarACocina = cat.enviarACocina !== false;
          const saltarPreparando = cat.saltarPreparando === true;
          const herenciaActiva = !!cat.herencia;
          const configExpanded = expandedConfig[cat.id] === true;
          const count = totals?.[cat.id] ?? 0;

          return (
            <View
              key={cat.id}
              style={[
                styles.categoryCard,
                { backgroundColor: COLORS.bg.surface, borderColor: COLORS.bg.elevated },
              ]}
            >
              <View style={styles.itemWrapper}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Seleccionar categoría ${cat.nombre}`}
                  onPress={() => onSelect(cat.id)}
                  style={[
                    styles.item,
                    active && styles.itemActive,
                    active && { backgroundColor: COLORS.alpha.primary10, borderLeftColor: COLORS.primary },
                  ]}
                  android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
                >
                  <View style={styles.itemTexts}>
                    <Text style={[styles.name, { color: active ? COLORS.primary : COLORS.text.primary }]}>
                      {cat.nombre}
                    </Text>
                    <Text style={[styles.count, { color: COLORS.text.muted }]}>
                      {count} {count === 1 ? 'producto' : 'productos'}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Eliminar categoría ${cat.nombre}`}
                  onPress={() => onDelete(cat.id, cat.nombre)}
                  style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
                  android_ripple={{ color: 'rgba(239,68,68,0.16)' }}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${configExpanded ? 'Ocultar' : 'Mostrar'} ajustes de ${cat.nombre}`}
                onPress={() =>
                  setExpandedConfig((current) => ({ ...current, [cat.id]: !configExpanded }))
                }
                style={({ pressed }) => [
                  styles.configToggle,
                  {
                    backgroundColor: COLORS.bg.secondary,
                    borderTopColor: COLORS.bg.elevated,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <View style={styles.configToggleLabel}>
                  <Ionicons name="options-outline" size={14} color={COLORS.primary} />
                  <Text style={[styles.configToggleText, { color: COLORS.text.secondary }]}>Ajustes de categoría</Text>
                </View>
                <Ionicons
                  name={configExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={COLORS.text.muted}
                />
              </Pressable>

              {configExpanded && (
                <View style={[styles.configSection, { backgroundColor: COLORS.bg.secondary }]}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchLabel}>
                      <Ionicons
                        name="restaurant"
                        size={14}
                        color={enviarACocina ? COLORS.primary : COLORS.text.muted}
                      />
                      <Text style={[styles.switchText, { color: COLORS.text.secondary }]}>Enviar a Cocina</Text>
                    </View>
                    <Switch
                      value={enviarACocina}
                      onValueChange={(value) => onToggleEnviarACocina?.(cat.id, value)}
                      trackColor={{ false: COLORS.bg.elevated, true: COLORS.primary }}
                      thumbColor={COLORS.text.primary}
                      style={styles.switch}
                    />
                  </View>

                  {enviarACocina && (
                    <View style={styles.switchRow}>
                      <View style={styles.switchLabel}>
                        <Ionicons
                          name="flash"
                          size={14}
                          color={saltarPreparando ? COLORS.warning : COLORS.text.muted}
                        />
                        <Text style={[styles.switchText, { color: COLORS.text.secondary }]}>Atajo a preparación</Text>
                      </View>
                      <Switch
                        value={saltarPreparando}
                        onValueChange={(value) => onToggleSaltarPreparando?.(cat.id, value)}
                        trackColor={{ false: COLORS.bg.elevated, true: COLORS.warning }}
                        thumbColor={COLORS.text.primary}
                        style={styles.switch}
                      />
                    </View>
                  )}

                  <View style={[styles.switchRow, styles.channelDivider, { borderTopColor: COLORS.bg.elevated }]}>
                    <View style={styles.switchLabel}>
                      <Ionicons
                        name="git-network"
                        size={14}
                        color={herenciaActiva ? COLORS.warning : COLORS.text.muted}
                      />
                      <Text style={[styles.switchText, { color: COLORS.text.secondary }]}>Heredar canales</Text>
                    </View>
                    <Switch
                      value={herenciaActiva}
                      onValueChange={(value) =>
                        onUpdateHerencia?.(cat.id, value ? { mesero: true, digital: true } : undefined)
                      }
                      trackColor={{ false: COLORS.bg.elevated, true: COLORS.warning }}
                      thumbColor={COLORS.text.primary}
                      style={styles.switch}
                    />
                  </View>

                  {herenciaActiva && cat.herencia && (
                    <View style={styles.channelList}>
                      <ChannelSwitch
                        label="Visible en Mesero"
                        value={cat.herencia.mesero !== false}
                        color={COLORS.primary}
                        onChange={(value) => onUpdateHerencia?.(cat.id, { ...cat.herencia, mesero: value })}
                        colors={COLORS}
                      />
                      <ChannelSwitch
                        label="Visible en Menú Digital"
                        value={cat.herencia.digital !== false}
                        color={COLORS.success}
                        onChange={(value) => onUpdateHerencia?.(cat.id, { ...cat.herencia, digital: value })}
                        colors={COLORS}
                      />
                      {showVentaCrudo && (
                        <ChannelSwitch
                          label="Visible en Venta y Crudo"
                          value={cat.herencia.ventaCrudo === true}
                          color={COLORS.warning}
                          onChange={(value) =>
                            onUpdateHerencia?.(cat.id, { ...cat.herencia, ventaCrudo: value })
                          }
                          colors={COLORS}
                        />
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ChannelSwitch({
  label,
  value,
  color,
  onChange,
  colors,
}: {
  label: string;
  value: boolean;
  color: string;
  onChange: (value: boolean) => void;
  colors: ReturnType<typeof useThemedColors>;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={[styles.channelText, { color: colors.text.muted }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.bg.elevated, true: color }}
        thumbColor={colors.text.primary}
        style={styles.smallSwitch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, gap: theme.spacing.xs },
  title: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingBottom: theme.spacing.xs,
  },
  list: { paddingBottom: theme.spacing.md, gap: theme.spacing.sm },
  categoryCard: { borderRadius: theme.borderRadius.md, overflow: 'hidden', borderWidth: 1 },
  itemWrapper: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  item: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    ...(Platform.select({ web: { transition: 'all 0.15s ease', cursor: 'pointer' } }) as any),
  },
  itemActive: { borderLeftColor: theme.colors.primary },
  itemTexts: { gap: 3 },
  name: { fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.semibold },
  count: { fontSize: theme.typography.sizes.xs },
  deleteBtn: { padding: 10, alignItems: 'center', justifyContent: 'center' },
  configToggle: {
    minHeight: 36,
    paddingHorizontal: theme.spacing.sm,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  configToggleLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  configToggleText: { fontSize: theme.typography.sizes.xs, fontWeight: theme.typography.weights.semibold },
  configSection: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, gap: theme.spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  switchLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  switchText: { fontSize: theme.typography.sizes.xs, fontWeight: theme.typography.weights.medium },
  switch: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  smallSwitch: { transform: [{ scaleX: 0.65 }, { scaleY: 0.65 }] },
  channelDivider: { marginTop: 4, paddingTop: 6, borderTopWidth: 1 },
  channelList: { paddingLeft: 8, gap: 2 },
  channelText: { fontSize: 11 },
});
