import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { Categoria } from '../../../sistema/persistencia';
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
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Categorías</Text>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {categorias.map((cat) => {
          const active = activeId === cat.id;
          const enviarACocina = cat.enviarACocina !== false; // Default true
          const saltarPreparando = cat.saltarPreparando === true; // Default false
          const herenciaActiva = !!cat.herencia;

          return (
            <View key={cat.id} style={styles.categoryCard}>
              <View style={styles.itemWrapper}>
                <Pressable
                  onPress={() => onSelect(cat.id)}
                  style={[styles.item, active && styles.itemActive]}
                  android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
                >
                  <View style={styles.itemTexts}>
                    <Text style={[styles.name, active && styles.nameActive]}>{cat.nombre}</Text>
                    <Text style={styles.count}>{totals?.[cat.id] ?? 0} productos</Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => onDelete(cat.id, cat.nombre)}
                  style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
                  android_ripple={{ color: 'rgba(239,68,68,0.16)' }}
                >
                  {({ pressed, hovered }: any) => (
                    <Text
                      style={[
                        styles.deleteText,
                        (pressed || hovered) && { color: theme.colors.danger },
                      ]}
                    >
                      ✕
                    </Text>
                  )}
                </Pressable>
              </View>

              {/* Configuration Switches */}
              <View style={styles.configSection}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Ionicons
                      name="restaurant"
                      size={14}
                      color={enviarACocina ? theme.colors.primary : theme.colors.textMuted}
                    />
                    <Text style={styles.switchText}>Enviar a Cocina</Text>
                  </View>
                  <Switch
                    value={enviarACocina}
                    onValueChange={(v) => onToggleEnviarACocina?.(cat.id, v)}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor="#fff"
                    style={styles.switch}
                  />
                </View>

                {enviarACocina && (
                  <View style={styles.switchRow}>
                    <View style={styles.switchLabel}>
                      <Ionicons
                        name="flash"
                        size={14}
                        color={saltarPreparando ? theme.colors.accent : theme.colors.textMuted}
                      />
                      <Text style={styles.switchText}>Fast-Track</Text>
                    </View>
                    <Switch
                      value={saltarPreparando}
                      onValueChange={(v) => onToggleSaltarPreparando?.(cat.id, v)}
                      trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                      thumbColor="#fff"
                      style={styles.switch}
                    />
                  </View>
                )}

                {/* 👪 PEGATINA: Herencia de Canales */}
                <View
                  style={[
                    styles.switchRow,
                    {
                      marginTop: 4,
                      paddingTop: 4,
                      borderTopWidth: 1,
                      borderTopColor: 'rgba(255,255,255,0.05)',
                    },
                  ]}
                >
                  <View style={styles.switchLabel}>
                    <Ionicons
                      name="git-network"
                      size={14}
                      color={herenciaActiva ? '#ec4899' : theme.colors.textMuted}
                    />
                    <Text style={styles.switchText}>Heredar Visibilidad</Text>
                  </View>
                  <Switch
                    value={herenciaActiva}
                    onValueChange={(v) => {
                      if (v) {
                        // Default inheritance
                        onUpdateHerencia?.(cat.id, { mesero: true, digital: true });
                      } else {
                        // Disable inheritance (remove object)
                        onUpdateHerencia?.(cat.id, undefined);
                      }
                    }}
                    trackColor={{ false: theme.colors.border, true: '#ec4899' }}
                    thumbColor="#fff"
                    style={styles.switch}
                  />
                </View>

                {herenciaActiva && cat.herencia && (
                  <View style={{ paddingLeft: 8, gap: 4, marginTop: 4 }}>
                    {/* Canal Mesero */}
                    <View style={styles.switchRow}>
                      <Text style={[styles.switchText, { fontSize: 11, color: '#94a3b8' }]}>
                        · Visible en Mesero
                      </Text>
                      <Switch
                        value={cat.herencia.mesero !== false}
                        onValueChange={(v) =>
                          onUpdateHerencia?.(cat.id, { ...cat.herencia, mesero: v })
                        }
                        trackColor={{ false: theme.colors.border, true: '#3b82f6' }}
                        thumbColor="#fff"
                        style={{ transform: [{ scale: 0.6 }] }}
                      />
                    </View>
                    {/* Canal Digital */}
                    <View style={styles.switchRow}>
                      <Text style={[styles.switchText, { fontSize: 11, color: '#94a3b8' }]}>
                        · Visible en Menú Digital
                      </Text>
                      <Switch
                        value={cat.herencia.digital !== false}
                        onValueChange={(v) =>
                          onUpdateHerencia?.(cat.id, { ...cat.herencia, digital: v })
                        }
                        trackColor={{ false: theme.colors.border, true: '#10b981' }}
                        thumbColor="#fff"
                        style={{ transform: [{ scale: 0.6 }] }}
                      />
                    </View>
                    {/* Canal Venta y Crudo - GATED */}
                    {showVentaCrudo && (
                      <View style={styles.switchRow}>
                        <Text style={[styles.switchText, { fontSize: 11, color: '#94a3b8' }]}>
                          · Visible en Venta y Crudo
                        </Text>
                        <Switch
                          value={cat.herencia.ventaCrudo === true}
                          onValueChange={(v) =>
                            onUpdateHerencia?.(cat.id, { ...cat.herencia, ventaCrudo: v })
                          }
                          trackColor={{ false: theme.colors.border, true: '#f59e0b' }}
                          thumbColor="#fff"
                          style={{ transform: [{ scale: 0.6 }] }}
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingBottom: theme.spacing.xs,
  },
  list: {
    paddingBottom: theme.spacing.md,
    gap: 4, // Reduced from theme.spacing.xs (8px) to 4px
  },
  categoryCard: {
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    ...(Platform.select({
      web: {
        transition: 'all 0.2s ease',
      },
    }) as any),
  },
  configSection: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switchText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  item: {
    flex: 1,
    paddingVertical: 8, // Reduced from 12px to 8px
    paddingHorizontal: theme.spacing.sm,
    paddingLeft: theme.spacing.sm,
    backgroundColor: 'transparent', // Transparent background for cleaner look
    borderWidth: 0, // Remove border
    borderLeftWidth: 3, // Only left border for active state
    borderLeftColor: 'transparent',
    ...(Platform.select({
      web: {
        transition: 'all 0.15s ease',
        cursor: 'pointer',
      },
    }) as any),
  },
  itemActive: {
    backgroundColor: 'rgba(97, 130, 255, 0.12)', // Subtle primary background
    borderLeftColor: theme.colors.primary, // Primary left border
    ...(Platform.select({
      web: {
        boxShadow: 'inset 0 0 0 1px rgba(97, 130, 255, 0.2)',
      },
    }) as any),
  },
  itemTexts: {
    gap: 2, // Tighter spacing
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
  },
  nameActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  count: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.select({
      web: {
        transition: 'all 0.15s ease',
        cursor: 'pointer',
      },
    }) as any),
  },
  deleteText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
    ...(Platform.select({
      web: {
        transition: 'color 0.15s ease',
      },
    }) as any),
  },
});
