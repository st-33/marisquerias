import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { Categoria } from '../../../../../sistema/persistencia';
import { theme, useAppTheme } from '@/compartido/temas';

export type BarraCategoriasProps = {
  categorias: Categoria[];
  activeId: string | null;
  totals?: Record<string, number>;
  onSelect: (id: string) => void;
  onAgregar?: () => void;
  onDelete: (id: string, nombre: string) => void;
  onToggleEnviarACocina?: (id: string, enabled: boolean) => void;
  onToggleSaltarPreparando?: (id: string, enabled: boolean) => void;
  onUpdateHerencia?: (id: string, herencia: Categoria['herencia']) => void;
  showVentaCrudo?: boolean;
};

export function BarraCategorias({
  categorias,
  activeId,
  totals,
  onSelect,
  onAgregar,
  onDelete,
  onToggleEnviarACocina,
  onToggleSaltarPreparando,
  onUpdateHerencia,
  showVentaCrudo = true,
}: BarraCategoriasProps) {
  const { colors } = useAppTheme();
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);

  const toggleConfig = (id: string) => {
    setExpandedConfigId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>Categorías</Text>
        {onAgregar && categorias.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nueva categoría"
            testID="agregar-categoria"
            onPress={onAgregar}
            style={({ pressed }) => [
              styles.addCategory,
              {
                backgroundColor: `${colors.primary}22`,
                borderColor: `${colors.primary}66`,
              },
              pressed && styles.addCategoryPressed,
            ]}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={[styles.addCategoryText, { color: colors.primary }]}>Nueva</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {categorias.map((cat) => {
          const active = activeId === cat.id;
          const configOpen = expandedConfigId === cat.id;
          const enviarACocina = cat.enviarACocina !== false;
          const saltarPreparando = cat.saltarPreparando === true;
          const herenciaActiva = !!cat.herencia;

          return (
            <View
              key={cat.id}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: active ? colors.cardElevated : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  shadowColor: active ? colors.primary : '#000',
                },
                active && styles.categoryCardActive,
              ]}
            >
              <View style={styles.itemWrapper}>
                <Pressable
                  onPress={() => onSelect(cat.id)}
                  style={[
                    styles.item,
                    active && {
                      backgroundColor: `${colors.primary}16`,
                      borderLeftColor: colors.primary,
                    },
                  ]}
                  android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
                >
                  <View style={styles.itemTexts}>
                    <Text
                      style={[
                        styles.name,
                        { color: active ? colors.primaryLight : colors.text },
                        active && styles.nameActive,
                      ]}
                      numberOfLines={1}
                    >
                      {cat.nombre}
                    </Text>
                    <View style={styles.metaSubRow}>
                      <Text style={[styles.count, { color: colors.textMuted }]}>
                        {totals?.[cat.id] ?? 0} {totals?.[cat.id] === 1 ? 'opción' : 'opciones'}
                      </Text>
                      <View
                        style={[
                          styles.miniBadge,
                          {
                            backgroundColor: enviarACocina
                              ? `${colors.primary}20`
                              : `${colors.textMuted}20`,
                          },
                        ]}
                      >
                        <Ionicons
                          name={enviarACocina ? 'flame-outline' : 'flash-outline'}
                          size={11}
                          color={enviarACocina ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.miniBadgeText,
                            { color: enviarACocina ? colors.primary : colors.textSecondary },
                          ]}
                        >
                          {enviarACocina ? (saltarPreparando ? 'Rápido' : 'Cocina') : 'Directo'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>

                <View style={styles.cardActionsRight}>
                  <Pressable
                    onPress={() => toggleConfig(cat.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ajustes de ${cat.nombre}`}
                    style={({ pressed }) => [
                      styles.iconActionBtn,
                      configOpen && { backgroundColor: `${colors.primary}24` },
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <Ionicons
                      name={configOpen ? 'chevron-up' : 'options-outline'}
                      size={17}
                      color={configOpen ? colors.primary : colors.textSecondary}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => onDelete(cat.id, cat.nombre)}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar ${cat.nombre}`}
                    style={({ pressed }) => [styles.iconActionBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>

              {/* Ajustes desplegables de la categoría */}
              {configOpen && (
                <View
                  style={[
                    styles.configSection,
                    {
                      backgroundColor: colors.surfaceDark,
                      borderTopColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.switchRow}>
                    <View style={styles.switchLabel}>
                      <Ionicons
                        name="restaurant-outline"
                        size={15}
                        color={enviarACocina ? colors.primary : colors.textMuted}
                      />
                      <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                        Enviar pedidos a Cocina
                      </Text>
                    </View>
                    <Switch
                      value={enviarACocina}
                      onValueChange={(v) => onToggleEnviarACocina?.(cat.id, v)}
                      trackColor={{ false: colors.borderLight, true: colors.primary }}
                      thumbColor="#fff"
                      style={styles.switch}
                    />
                  </View>

                  {enviarACocina && (
                    <View style={styles.switchRow}>
                      <View style={styles.switchLabel}>
                        <Ionicons
                          name="flash-outline"
                          size={15}
                          color={saltarPreparando ? colors.accent : colors.textMuted}
                        />
                        <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                          Entrega rápida (sin espera)
                        </Text>
                      </View>
                      <Switch
                        value={saltarPreparando}
                        onValueChange={(v) => onToggleSaltarPreparando?.(cat.id, v)}
                        trackColor={{ false: colors.borderLight, true: colors.accent }}
                        thumbColor="#fff"
                        style={styles.switch}
                      />
                    </View>
                  )}

                  <View
                    style={[
                      styles.switchRow,
                      {
                        marginTop: 4,
                        paddingTop: 6,
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.switchLabel}>
                      <Ionicons
                        name="eye-outline"
                        size={15}
                        color={herenciaActiva ? colors.primary : colors.textMuted}
                      />
                      <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                        Canales por defecto
                      </Text>
                    </View>
                    <Switch
                      value={herenciaActiva}
                      onValueChange={(v) => {
                        if (v) {
                          onUpdateHerencia?.(cat.id, { mesero: true, digital: true });
                        } else {
                          onUpdateHerencia?.(cat.id, undefined);
                        }
                      }}
                      trackColor={{ false: colors.borderLight, true: colors.primary }}
                      thumbColor="#fff"
                      style={styles.switch}
                    />
                  </View>

                  {herenciaActiva && cat.herencia && (
                    <View style={styles.herenciaSubBox}>
                      <View style={styles.switchRow}>
                        <Text style={[styles.switchSubText, { color: colors.textMuted }]}>
                          · Mesero (Salón)
                        </Text>
                        <Switch
                          value={cat.herencia.mesero !== false}
                          onValueChange={(v) =>
                            onUpdateHerencia?.(cat.id, { ...cat.herencia, mesero: v })
                          }
                          trackColor={{ false: colors.borderLight, true: colors.primary }}
                          thumbColor="#fff"
                          style={styles.subSwitch}
                        />
                      </View>
                      <View style={styles.switchRow}>
                        <Text style={[styles.switchSubText, { color: colors.textMuted }]}>
                          · Menú Digital
                        </Text>
                        <Switch
                          value={cat.herencia.digital !== false}
                          onValueChange={(v) =>
                            onUpdateHerencia?.(cat.id, { ...cat.herencia, digital: v })
                          }
                          trackColor={{ false: colors.borderLight, true: colors.success }}
                          thumbColor="#fff"
                          style={styles.subSwitch}
                        />
                      </View>
                      {showVentaCrudo && (
                        <View style={styles.switchRow}>
                          <Text style={[styles.switchSubText, { color: colors.textMuted }]}>
                            · Mostrador
                          </Text>
                          <Switch
                            value={cat.herencia.ventaCrudo === true}
                            onValueChange={(v) =>
                              onUpdateHerencia?.(cat.id, { ...cat.herencia, ventaCrudo: v })
                            }
                            trackColor={{ false: colors.borderLight, true: colors.accent }}
                            thumbColor="#fff"
                            style={styles.subSwitch}
                          />
                        </View>
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

const styles = StyleSheet.create({
  container: {
    width: 280,
    minWidth: 250,
    maxWidth: 310,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  titleRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingHorizontal: 4,
  },
  addCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: theme.borderRadius.round,
  },
  addCategoryPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  addCategoryText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },
  list: {
    paddingBottom: theme.spacing.md,
    gap: 8,
  },
  categoryCard: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryCardActive: {
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  itemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    ...(Platform.select({
      web: {
        transition: 'all 0.15s ease',
        cursor: 'pointer',
      },
    }) as any),
  },
  itemTexts: {
    gap: 4,
  },
  name: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    fontFamily: theme.typography.fontFamily,
  },
  nameActive: {
    fontWeight: theme.typography.weights.bold,
  },
  metaSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  count: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
  miniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 6,
    gap: 2,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configSection: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  switchText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
  switchSubText: {
    fontSize: 12,
    fontWeight: '600',
  },
  switch: {
    transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }],
  },
  subSwitch: {
    transform: [{ scaleX: 0.72 }, { scaleY: 0.72 }],
  },
  herenciaSubBox: {
    paddingLeft: 8,
    gap: 2,
    marginTop: 2,
  },
});
