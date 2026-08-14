import { Ionicons } from '@expo/vector-icons';
import { Database } from 'firebase/database';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { theme } from '@compartido/theme';
import {
  useInventarioAvanzado,
  usePuenteAccionesFlotantes,
  type AreaInventario,
  type IdSeccionInventario,
  type InsumoInventario,
} from '../../../../../plataforma/dominios/alimentos_y_bebidas';

type PanelInventarioProps = {
  db: Database;
  tenantPath: string;
  niche?: string;
};

type ViewMode = 'areas' | 'containers' | 'items_section' | 'items_area' | 'items_container';

export function PanelInventario({ db, tenantPath, niche = 'restaurante' }: PanelInventarioProps) {
  const { width } = useWindowDimensions();
  const isLarge = width > 800;

  type InsumoConId = InsumoInventario & { id: string; sectionId?: IdSeccionInventario };
  type AreaConId = AreaInventario & {
    id: string;
    sectionId?: IdSeccionInventario;
    parentId?: string | null;
  };

  const {
    catalog: catalogSinTipar,
    sections,
    areas: areasSinTipar,
    loading,
    actions,
  } = useInventarioAvanzado({
    db,
    tenantPath,
  });

  const catalog = catalogSinTipar as InsumoConId[];
  const areas = areasSinTipar as AreaConId[];

  // --- STATE ---
  const [activeSectionId, setActiveSectionId] = useState<
    'alimentos' | 'losa_cristaleria' | 'otros'
  >('alimentos');
  const [viewMode, setViewMode] = useState<ViewMode>('areas');
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

  // Modales
  const [showItemModal, setShowItemModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showContainerModal, setShowContainerModal] = useState(false);

  // Forms
  const [itemForm, setItemForm] = useState({
    nombre: '',
    unidad: 'kg' as any,
    minStock: '0',
    costo: '',
    proveedor: '',
  });
  const [areaForm, setAreaForm] = useState({ nombre: '', icon: '📦', tipo: 'almacen' as any });
  const [containerForm, setContainerForm] = useState({
    nombre: '',
    icon: '🧊',
    tipo: 'refri' as any,
  });

  // --- COMPUTED (SECTION SCOPED) ---

  const activeAreas = useMemo(() => {
    return areas
      .filter((a) => (a.sectionId || 'otros') === activeSectionId)
      .filter((a) => !a.parentId);
  }, [areas, activeSectionId]);

  const containersForSelectedArea = useMemo(() => {
    if (!selectedAreaId) return [];
    return areas.filter((a) => a.parentId === selectedAreaId);
  }, [areas, selectedAreaId]);

  const selectedArea = useMemo(
    () => activeAreas.find((a) => a.id === selectedAreaId) || null,
    [activeAreas, selectedAreaId]
  );
  const selectedContainer = useMemo(() => {
    if (!selectedContainerId) return null;
    return areas.find((a) => a.id === selectedContainerId) || null;
  }, [areas, selectedContainerId]);

  const effectiveItemStock = useMemo(() => {
    if (viewMode === 'items_container') {
      return (selectedContainer?.stock || {}) as Record<string, number>;
    }
    if (viewMode === 'items_area') {
      return (selectedArea?.stock || {}) as Record<string, number>;
    }
    if (viewMode === 'items_section') {
      const sectionStock = (sections as any)?.[activeSectionId]?.stock || {};
      return sectionStock as Record<string, number>;
    }
    return {} as Record<string, number>;
  }, [activeSectionId, sections, selectedArea?.stock, selectedContainer?.stock, viewMode]);

  const effectiveItems = useMemo(() => {
    if (!viewMode.startsWith('items_')) return [];
    return Object.entries(effectiveItemStock)
      .map(([itemId, qty]) => {
        const it = catalog.find((c) => c.id === itemId);
        return {
          itemId,
          nombre: it?.nombre || 'Item',
          unidad: it?.unidad || 'pza',
          minStock: it?.minStock || 0,
          qty: Number(qty || 0),
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [catalog, effectiveItemStock, viewMode]);

  const itemsViewMeta = useMemo(() => {
    if (viewMode === 'items_container') {
      return {
        title: selectedContainer?.nombre || 'Contenedor',
        subtitle: selectedArea?.nombre || '',
        icon: selectedContainer?.icon || '🧊',
        onBack: () => {
          setSelectedContainerId(null);
          setViewMode('containers');
        },
      };
    }
    if (viewMode === 'items_area') {
      return {
        title: selectedArea?.nombre || 'Área',
        subtitle: 'Items del área',
        icon: selectedArea?.icon || '📦',
        onBack: () => setViewMode('containers'),
      };
    }
    return {
      title: (sections as any)?.[activeSectionId]?.nombre || 'Sección',
      subtitle: 'Items de la sección',
      icon: (sections as any)?.[activeSectionId]?.icon || '📦',
      onBack: () => setViewMode('areas'),
    };
  }, [
    activeSectionId,
    sections,
    selectedArea?.icon,
    selectedArea?.nombre,
    selectedContainer?.icon,
    selectedContainer?.nombre,
    viewMode,
  ]);

  const sectionNodes = useMemo(() => {
    return areas.filter((a) => (a.sectionId || 'otros') === activeSectionId);
  }, [areas, activeSectionId]);

  const sectionStockByItem = useMemo(() => {
    const acc: Record<string, number> = {};
    const sectionStock = (sections as any)?.[activeSectionId]?.stock || {};
    for (const [itemId, qty] of Object.entries(sectionStock)) {
      acc[itemId] = (acc[itemId] || 0) + Number(qty || 0);
    }
    for (const node of sectionNodes) {
      const stock = node.stock || {};
      for (const [itemId, qty] of Object.entries(stock)) {
        acc[itemId] = (acc[itemId] || 0) + Number(qty || 0);
      }
    }
    return acc;
  }, [activeSectionId, sectionNodes, sections]);

  const itemsBajoStock = useMemo(() => {
    return catalog
      .filter((it) => (it.sectionId || 'otros') === activeSectionId)
      .filter((it) => (sectionStockByItem[it.id] || 0) <= it.minStock).length;
  }, [activeSectionId, catalog, sectionStockByItem]);

  const getContainerHealthPct = (containerId: string) => {
    const container = areas.find((a) => a.id === containerId);
    if (!container) return 0;
    const stock = container.stock || {};
    const entries = Object.entries(stock);
    if (entries.length === 0) return 100;
    let ok = 0;
    for (const [itemId, qty] of entries) {
      const item = catalog.find((i) => i.id === itemId);
      const min = item?.minStock ?? 0;
      if (Number(qty || 0) >= Number(min || 0)) ok++;
    }
    return Math.round((ok / entries.length) * 100);
  };

  usePuenteAccionesFlotantes({
    enabled: viewMode === 'items_container' && !!selectedContainerId,
    initialKey: 'main',
    items:
      viewMode === 'items_container' && selectedContainerId
        ? [
            {
              key: 'main',
              label: 'Acciones',
              icon: <Ionicons name="add" size={30} color="white" />,
              onPress: () => {},
            },
            {
              key: 'add_item',
              label: 'Nuevo Item',
              icon: <Ionicons name="cube-outline" size={22} color="white" />,
              onPress: () => setShowItemModal(true),
            },
          ]
        : [],
    position: 'bottom-right',
  });

  // --- RENDER ---

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER TABS (SECCIÓN SELECTOR) */}
      <View style={styles.tabHeader}>
        {(
          [
            {
              id: 'alimentos' as const,
              label: 'Alimentos / Consumibles',
              icon: 'restaurant' as const,
            },
            { id: 'losa_cristaleria' as const, label: 'Losa y Cristal', icon: 'wine' as const },
            { id: 'otros' as const, label: 'Otros', icon: 'cube' as const },
          ] as const
        ).map((sec) => (
          <Pressable
            key={sec.id}
            onPress={() => {
              setActiveSectionId(sec.id);
              setSelectedAreaId(null);
              setSelectedContainerId(null);
              setViewMode('areas');
            }}
            style={[styles.tabBtn, activeSectionId === sec.id && styles.tabBtnActive]}
          >
            <Ionicons
              name={sec.icon as any}
              size={18}
              color={activeSectionId === sec.id ? 'white' : '#94a3b8'}
            />
            <Text style={[styles.tabText, activeSectionId === sec.id && styles.tabTextActive]}>
              {sec.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.contentRow, !isLarge && styles.column]}>
        {viewMode === 'areas' && (
          <View style={styles.rightCol}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Inventario</Text>
                <Text style={styles.subtitle}>Selecciona una sección y luego un área</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable style={styles.addBtn} onPress={() => setViewMode('items_section')}>
                  <Ionicons name="list" size={18} color="white" />
                </Pressable>
                <Pressable style={styles.addBtn} onPress={() => setShowAreaModal(true)}>
                  <Ionicons name="add" size={20} color="white" />
                </Pressable>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.cardsScroll}
            >
              <View style={styles.metricCard}>
                <Ionicons name="grid-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.metricVal}>{activeAreas.length}</Text>
                <Text style={styles.metricLabel}>Áreas</Text>
              </View>
              <View style={[styles.metricCard, { borderColor: '#ef4444' }]}>
                <Ionicons name="alert-circle-outline" size={24} color="#ef4444" />
                <Text style={[styles.metricVal, { color: '#ef4444' }]}>{itemsBajoStock}</Text>
                <Text style={styles.metricLabel}>Bajo Stock</Text>
              </View>
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ÁREAS</Text>
              <Pressable onPress={() => actions.seedPresets()}>
                <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                  Inicializar presets
                </Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {activeAreas.map((area) => (
                <Pressable
                  key={area.id}
                  style={styles.areaChip}
                  onPress={() => {
                    setSelectedAreaId(area.id);
                    setSelectedContainerId(null);
                    setViewMode('containers');
                  }}
                >
                  <Text style={{ fontSize: 34, marginBottom: 8 }}>{area.icon || '📦'}</Text>
                  <Text style={styles.areaChipName}>{area.nombre}</Text>
                </Pressable>
              ))}
              {activeAreas.length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#64748b', fontStyle: 'italic', marginBottom: 15 }}>
                    No hay áreas configuradas en esta sección.
                  </Text>
                  <Pressable
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.colors.primary,
                      padding: 12,
                      borderRadius: 8,
                    }}
                    onPress={() => actions.seedPresets()}
                  >
                    <Ionicons name="sparkles" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Cargar presets</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {viewMode === 'containers' && selectedAreaId && (
          <View style={styles.rightCol}>
            <View style={styles.header}>
              <Pressable
                style={[styles.actionIcon, { marginLeft: 0 }]}
                onPress={() => {
                  setSelectedAreaId(null);
                  setViewMode('areas');
                }}
              >
                <Ionicons name="arrow-back" size={18} color={theme.colors.primary} />
              </Pressable>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.title}>{selectedArea?.nombre || 'Área'}</Text>
                <Text style={styles.subtitle}>Selecciona un Contenedor</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable style={styles.addBtn} onPress={() => setViewMode('items_area')}>
                  <Ionicons name="list" size={18} color="white" />
                </Pressable>
                <Pressable style={styles.addBtn} onPress={() => setShowContainerModal(true)}>
                  <Ionicons name="add" size={20} color="white" />
                </Pressable>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>CONTENEDORES</Text>
            </View>

            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {containersForSelectedArea.map((c) => {
                const pct = getContainerHealthPct(c.id);
                const badgeColor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
                return (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.areaChip,
                      { width: 160, height: 120, alignItems: 'flex-start', padding: 14 },
                    ]}
                    onPress={() => {
                      setSelectedContainerId(c.id);
                      setViewMode('items_container');
                    }}
                  >
                    <View
                      style={{
                        width: '100%',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ fontSize: 26 }}>{c.icon || '🧊'}</Text>
                      <View
                        style={{
                          backgroundColor: badgeColor,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 999,
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 12 }}>
                          {pct}%
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.areaChipName, { textAlign: 'left', marginTop: 10 }]}>
                      {c.nombre}
                    </Text>
                  </Pressable>
                );
              })}
              {containersForSelectedArea.length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#64748b', fontStyle: 'italic', marginBottom: 15 }}>
                    No hay contenedores en esta área.
                  </Text>
                  <Pressable
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.colors.primary,
                      padding: 12,
                      borderRadius: 8,
                    }}
                    onPress={() => setShowContainerModal(true)}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color="white"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Crear contenedor</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {(viewMode === 'items_container' ||
          viewMode === 'items_area' ||
          viewMode === 'items_section') && (
          <View style={styles.rightCol}>
            <View style={styles.header}>
              <Pressable
                style={[styles.actionIcon, { marginLeft: 0 }]}
                onPress={itemsViewMeta.onBack}
              >
                <Ionicons name="arrow-back" size={18} color={theme.colors.primary} />
              </Pressable>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.title}>{itemsViewMeta.title}</Text>
                <Text style={styles.subtitle}>{itemsViewMeta.subtitle}</Text>
              </View>
              {viewMode !== 'items_container' && (
                <Pressable style={styles.addBtn} onPress={() => setShowItemModal(true)}>
                  <Ionicons name="add" size={20} color="white" />
                </Pressable>
              )}
            </View>

            <View style={styles.detailCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 52, marginRight: 16 }}>{itemsViewMeta.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTitle}>{itemsViewMeta.title}</Text>
                  <View
                    style={{
                      height: 10,
                      backgroundColor: '#0f172a',
                      borderRadius: 999,
                      overflow: 'hidden',
                      marginTop: 10,
                    }}
                  >
                    <View
                      style={{
                        height: 10,
                        width: `${
                          viewMode === 'items_container' && selectedContainerId
                            ? getContainerHealthPct(selectedContainerId)
                            : 100
                        }%`,
                        backgroundColor: theme.colors.primary,
                      }}
                    />
                  </View>
                </View>
              </View>

              <FlatList
                data={effectiveItems}
                keyExtractor={(it) => it.itemId}
                renderItem={({ item }) => {
                  const step = item.unidad === 'kg' ? 0.5 : 1;
                  const isLow = item.qty <= item.minStock;
                  return (
                    <View style={styles.distRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.distArea, { fontWeight: '800' }]}>{item.nombre}</Text>
                        <Text style={styles.itemSub}>{item.unidad.toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.distQty, isLow && { color: '#ef4444' }]}>
                        {item.qty.toFixed(item.unidad === 'kg' ? 2 : 0)}
                      </Text>
                      <View style={{ flexDirection: 'row' }}>
                        <Pressable
                          style={styles.actionIcon}
                          onPress={() => {
                            if (viewMode === 'items_section') {
                              actions.ajustarStockDeltaSeccion({
                                sectionId: activeSectionId,
                                itemId: item.itemId,
                                delta: -step,
                                razon: 'Ajuste manual',
                              });
                              return;
                            }
                            const targetId =
                              viewMode === 'items_area' ? selectedAreaId : selectedContainerId;
                            if (!targetId) return;
                            actions.ajustarStockDelta({
                              containerId: targetId,
                              itemId: item.itemId,
                              delta: -step,
                              razon: 'Ajuste manual',
                            });
                          }}
                        >
                          <Ionicons name="remove" size={16} color={theme.colors.primary} />
                        </Pressable>
                        <Pressable
                          style={styles.actionIcon}
                          onPress={() => {
                            if (viewMode === 'items_section') {
                              actions.ajustarStockDeltaSeccion({
                                sectionId: activeSectionId,
                                itemId: item.itemId,
                                delta: step,
                                razon: 'Ajuste manual',
                              });
                              return;
                            }
                            const targetId =
                              viewMode === 'items_area' ? selectedAreaId : selectedContainerId;
                            if (!targetId) return;
                            actions.ajustarStockDelta({
                              containerId: targetId,
                              itemId: item.itemId,
                              delta: step,
                              razon: 'Ajuste manual',
                            });
                          }}
                        >
                          <Ionicons name="add" size={16} color={theme.colors.primary} />
                        </Pressable>
                      </View>
                    </View>
                  );
                }}
              />
            </View>
          </View>
        )}
      </View>

      {/* --- MODALES --- */}

      {/* Crear Item Global */}
      <Modal visible={showItemModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuevo Item</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del insumo"
              placeholderTextColor="#64748b"
              value={itemForm.nombre}
              onChangeText={(t) => setItemForm({ ...itemForm, nombre: t })}
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Unidad</Text>
                <View style={styles.unitSelector}>
                  {(['kg', 'pza'] as const).map((u) => (
                    <Pressable
                      key={u}
                      onPress={() => setItemForm((prev) => ({ ...prev, unidad: u }))}
                      style={[styles.unitBtn, itemForm.unidad === u && styles.unitBtnActive]}
                    >
                      <Text style={[styles.unitText, itemForm.unidad === u && { color: 'white' }]}>
                        {u.toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Stock Mínimo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={itemForm.minStock}
                  onChangeText={(t) => setItemForm({ ...itemForm, minStock: t })}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowItemModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (viewMode === 'items_section') {
                    await actions.crearItemEnSeccion({
                      sectionId: activeSectionId,
                      item: {
                        nombre: itemForm.nombre,
                        unidad: itemForm.unidad,
                        minStock: parseFloat(itemForm.minStock) || 0,
                        sectionId: activeSectionId,
                      } as any,
                      initialQty: 0,
                    });
                  } else {
                    const targetId =
                      viewMode === 'items_area' ? selectedAreaId : selectedContainerId;
                    if (!targetId) {
                      Alert.alert('Error', 'Selecciona un área o un contenedor');
                      return;
                    }
                    await actions.crearItemEnContenedor({
                      containerId: targetId,
                      item: {
                        nombre: itemForm.nombre,
                        unidad: itemForm.unidad,
                        minStock: parseFloat(itemForm.minStock) || 0,
                        sectionId: activeSectionId,
                      } as any,
                      initialQty: 0,
                    });
                  }
                  setShowItemModal(false);
                }}
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmText}>Crear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Crear Área */}
      <Modal visible={showAreaModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nueva Área</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del área (ej. Refrigerador)"
              placeholderTextColor="#64748b"
              value={areaForm.nombre}
              onChangeText={(t) => setAreaForm({ ...areaForm, nombre: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Icono (Emoji)"
              placeholderTextColor="#64748b"
              value={areaForm.icon}
              onChangeText={(t) => setAreaForm({ ...areaForm, icon: t })}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowAreaModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  await actions.crearArea({
                    nombre: areaForm.nombre,
                    icon: areaForm.icon,
                    tipo: 'almacen', // Default simple
                    hubId: niche === 'venta_crudo' ? 'venta_crudo' : 'restaurante',
                    sectionId: activeSectionId,
                    stock: {},
                  } as any); // Type assertion until repo is fully strictly typed
                  setShowAreaModal(false);
                  setAreaForm({ nombre: '', icon: '📦', tipo: 'almacen' });
                }}
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmText}>Crear Área</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showContainerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuevo Contenedor</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del contenedor (ej. Refri Principal)"
              placeholderTextColor="#64748b"
              value={containerForm.nombre}
              onChangeText={(t) => setContainerForm({ ...containerForm, nombre: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Icono (Emoji)"
              placeholderTextColor="#64748b"
              value={containerForm.icon}
              onChangeText={(t) => setContainerForm({ ...containerForm, icon: t })}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowContainerModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!selectedAreaId) {
                    Alert.alert('Error', 'Primero selecciona un área');
                    return;
                  }
                  await actions.crearContenedor({
                    nombre: containerForm.nombre,
                    icon: containerForm.icon,
                    tipo: containerForm.tipo,
                    hubId: niche === 'venta_crudo' ? 'venta_crudo' : 'restaurante',
                    sectionId: activeSectionId,
                    parentId: selectedAreaId,
                  } as any);
                  setShowContainerModal(false);
                  setContainerForm({ nombre: '', icon: '🧊', tipo: 'refri' });
                }}
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmText}>Crear Contenedor</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column', // Changed to column to accommodate header tabs
    backgroundColor: '#0f172a',
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // --- TABS ---
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: theme.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  tabText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  // --- COLS ---
  leftCol: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    padding: 20,
  },
  rightCol: {
    flex: 1,
    padding: 20,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#1e3a8a', // Dark blue bg
  },
  itemName: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 15,
  },
  itemSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  stockBadge: {
    alignItems: 'flex-end',
  },
  stockValue: {
    color: theme.colors.primary,
    fontWeight: '900',
    fontSize: 16,
  },
  stockLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  cardsScroll: {
    maxHeight: 100,
    marginBottom: 20,
  },
  metricCard: {
    width: 140,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 15,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  metricVal: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  areasGrid: {
    maxHeight: 120,
    marginBottom: 30,
  },
  areaChip: {
    width: 100,
    height: 90,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  areaChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#334155',
  },
  areaChipName: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  areaChipSmall: {
    padding: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailTitle: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  distArea: {
    flex: 1,
    color: 'white',
    fontWeight: '600',
  },
  distQty: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
    marginRight: 15,
  },
  actionIcon: {
    padding: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    marginLeft: 8,
  },
  // --- MODALS ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 30,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 15,
    color: 'white',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  row: {
    flexDirection: 'row',
    gap: 15,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  unitBtn: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  unitBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  unitText: {
    color: '#64748b',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#334155',
  },
  cancelText: {
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  confirmBtn: {
    flex: 2,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  confirmText: {
    color: 'white',
    fontWeight: '900',
  },
});
