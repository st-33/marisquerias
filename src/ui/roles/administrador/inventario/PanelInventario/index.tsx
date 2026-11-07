import { Ionicons } from '@expo/vector-icons';
import { Database } from 'firebase/database';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { obtenerImagenProducto } from '@/compartido/catalogoImagenes';
import { theme as legacyTheme, useAppTheme } from '@/compartido/temas';
import { styles } from './estilos';
import {
  ModalArticuloInventario,
  formatearEtiquetaUnidadInventario,
} from './ModalArticuloInventario';
import { ModalPorcionadoYMerma } from './ModalPorcionadoYMerma';
import { useInventario } from '../../../../../capacidades/inventario';
import type {
  AreaInventario,
  IdSeccionInventario,
  InsumoInventario,
} from '../../../../../sistema/persistencia/contratos-inventario';

type PanelInventarioProps = {
  db?: Database;
  rutaNegocio?: string;
  niche?: string;
};

type ViewMode = 'areas' | 'containers' | 'items_section' | 'items_area' | 'items_container';

const ETIQUETA_USO: Record<string, { texto: string; color: string }> = {
  insumo: { texto: 'Insumo cocina', color: '#0ea5e9' },
  venta_directa: { texto: 'Listo / Bebida', color: '#10b981' },
  ambos: { texto: 'Cocina y Mostrador', color: '#8b5cf6' },
  producto_terminado: { texto: 'Lote en casa', color: '#f59e0b' },
};

export function PanelInventario({
  db,
  rutaNegocio,
  niche = 'restaurante',
}: PanelInventarioProps = {}) {
  const { width } = useWindowDimensions();
  const isLarge = width > 800;
  const { theme } = useAppTheme();
  const c = theme.colors;

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
  } = useInventario({
    db,
    rutaNegocio,
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
  const [articuloEditar, setArticuloEditar] = useState<InsumoConId | null>(null);
  const [modalOperacion, setModalOperacion] = useState<{
    visible: boolean;
    modo: 'porcionar' | 'merma';
    articulo: (InsumoConId & { stockActual?: number }) | null;
  }>({ visible: false, modo: 'porcionar', articulo: null });

  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showContainerModal, setShowContainerModal] = useState(false);

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

  const effectiveItemStock = useMemo(() => {
    if (viewMode === 'items_container') {
      return (selectedContainer?.stock || {}) as Record<string, number>;
    }
    if (viewMode === 'items_area') {
      const direct = { ...(selectedArea?.stock || {}) } as Record<string, number>;
      for (const child of containersForSelectedArea) {
        for (const [id, q] of Object.entries(child.stock || {})) {
          direct[id] = (direct[id] || 0) + Number(q || 0);
        }
      }
      return direct;
    }
    if (viewMode === 'items_section') {
      return sectionStockByItem;
    }
    return {} as Record<string, number>;
  }, [
    containersForSelectedArea,
    sectionStockByItem,
    selectedArea?.stock,
    selectedContainer?.stock,
    viewMode,
  ]);

  const effectiveItems = useMemo(() => {
    if (!viewMode.startsWith('items_')) return [];
    const itemsMap = new Map<string, number>();
    for (const [itemId, qty] of Object.entries(effectiveItemStock)) {
      itemsMap.set(itemId, Number(qty || 0));
    }

    if (viewMode === 'items_section') {
      for (const it of catalog) {
        if ((it.sectionId || 'alimentos') === activeSectionId && !itemsMap.has(it.id)) {
          itemsMap.set(it.id, 0);
        }
      }
    }

    return Array.from(itemsMap.entries())
      .map(([itemId, qty]) => {
        const it = catalog.find((cat) => cat.id === itemId);
        return {
          itemId,
          catalogoItem: it || null,
          nombre: it?.nombre || 'Artículo',
          unidad: it?.unidad || 'pza',
          uso: it?.uso || 'ambos',
          imagenId: it?.imagenId,
          costo: it?.costo,
          controlarExistencias: it?.controlarExistencias !== false,
          equivalencias: it?.equivalencias,
          minStock: it?.minStock || 0,
          qty: Number(qty || 0),
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [activeSectionId, catalog, effectiveItemStock, viewMode]);

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
        subtitle: 'Artículos almacenados en esta área',
        icon: selectedArea?.icon || '📦',
        onBack: () => setViewMode('containers'),
      };
    }
    return {
      title: (sections as any)?.[activeSectionId]?.nombre || 'Todos los Artículos',
      subtitle: 'Vista general de artículos e insumos de la sección',
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

  const itemsEnSeccion = useMemo(
    () => catalog.filter((i) => (i.sectionId || 'alimentos') === activeSectionId),
    [catalog, activeSectionId]
  );

  const itemsBajoStock = useMemo(() => {
    return itemsEnSeccion
      .filter((it) => it.controlarExistencias !== false)
      .filter((it) => (sectionStockByItem[it.id] || 0) <= it.minStock).length;
  }, [itemsEnSeccion, sectionStockByItem]);

  const valorTotalExistencias = useMemo(() => {
    return itemsEnSeccion.reduce((acc, it) => {
      const cant = Number(sectionStockByItem[it.id] || 0);
      const costoUnit = Number(it.costo || 0);
      return acc + cant * costoUnit;
    }, 0);
  }, [itemsEnSeccion, sectionStockByItem]);

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

  const targetContainerIdForOperation = useMemo(() => {
    if (selectedContainerId) return selectedContainerId;
    if (selectedAreaId) {
      const defaultChild = areas.find((a) => a.parentId === selectedAreaId);
      return defaultChild?.id || selectedAreaId;
    }
    const firstArea = activeAreas[0];
    if (firstArea) {
      const child = areas.find((a) => a.parentId === firstArea.id);
      return child?.id || firstArea.id;
    }
    return null;
  }, [selectedContainerId, selectedAreaId, areas, activeAreas]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* HEADER TABS (SECCIÓN SELECTOR) */}
      <View style={[styles.tabHeader, { backgroundColor: c.surface, borderColor: c.border }]}>
        {(
          [
            {
              id: 'alimentos' as const,
              label: 'Alimentos, Mariscos y Bebidas',
              icon: 'restaurant-outline' as const,
            },
            { id: 'losa_cristaleria' as const, label: 'Loza y Cristalería', icon: 'wine-outline' as const },
            { id: 'otros' as const, label: 'Insumos Generales', icon: 'cube-outline' as const },
          ] as const
        ).map((sec) => {
          const active = activeSectionId === sec.id;
          return (
            <Pressable
              key={sec.id}
              onPress={() => {
                setActiveSectionId(sec.id);
                setSelectedAreaId(null);
                setSelectedContainerId(null);
                setViewMode('areas');
              }}
              style={[
                styles.tabBtn,
                active && {
                  backgroundColor: c.primary,
                  borderColor: c.primary,
                },
              ]}
            >
              <Ionicons
                name={sec.icon as any}
                size={17}
                color={active ? '#FFFFFF' : c.textSecondary}
              />
              <Text style={[styles.tabText, { color: active ? '#FFFFFF' : c.textSecondary }]}>
                {sec.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.contentRow, !isLarge && styles.column]}>
        {viewMode === 'areas' && (
          <View style={styles.rightCol}>
            <View style={styles.header}>
              <View>
                <Text
                  style={[
                    styles.title,
                    { color: c.text, fontFamily: legacyTheme.typography.displayFamily },
                  ]}
                >
                  Almacén e Inventario
                </Text>
                <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                  Existencias por área, costos de compra y porcionado de mariscos e insumos
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pressable
                  style={[
                    styles.addBtn,
                    {
                      backgroundColor: c.surface,
                      borderWidth: 1,
                      borderColor: c.primary,
                    },
                  ]}
                  onPress={() => setViewMode('items_section')}
                >
                  <Ionicons name="list-outline" size={17} color={c.primary} />
                  <Text style={{ color: c.primary, fontWeight: '800', fontSize: 12 }}>
                    Ver Artículos ({itemsEnSeccion.length})
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.addBtn, { backgroundColor: c.primary }]}
                  onPress={() => {
                    setArticuloEditar(null);
                    setShowItemModal(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                    Nuevo Artículo
                  </Text>
                </Pressable>

                {activeAreas.length > 0 && (
                  <Pressable
                    style={[
                      styles.addBtn,
                      {
                        backgroundColor: c.surface,
                        borderWidth: 1,
                        borderColor: c.border,
                      },
                    ]}
                    onPress={() => setShowAreaModal(true)}
                  >
                    <Ionicons name="folder-open-outline" size={17} color={c.text} />
                    <Text style={{ color: c.text, fontWeight: '700', fontSize: 12 }}>
                      + Área
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* RESUMEN COMPACTO */}
            <View style={styles.cardsRow}>
              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: c.cardElevated || c.surface, borderColor: c.border },
                ]}
              >
                <Ionicons name="grid-outline" size={22} color={c.primary} />
                <View>
                  <Text style={[styles.metricVal, { color: c.text }]}>{activeAreas.length}</Text>
                  <Text style={[styles.metricLabel, { color: c.textSecondary }]}>Áreas</Text>
                </View>
              </View>

              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: c.cardElevated || c.surface, borderColor: c.border },
                ]}
              >
                <Ionicons name="cube-outline" size={22} color={c.primary} />
                <View>
                  <Text style={[styles.metricVal, { color: c.text }]}>{itemsEnSeccion.length}</Text>
                  <Text style={[styles.metricLabel, { color: c.textSecondary }]}>Artículos</Text>
                </View>
              </View>

              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: c.cardElevated || c.surface, borderColor: c.border },
                ]}
              >
                <Ionicons name="wallet-outline" size={22} color={c.success} />
                <View>
                  <Text style={[styles.metricVal, { color: c.success }]}>
                    ${valorTotalExistencias.toFixed(0)}
                  </Text>
                  <Text style={[styles.metricLabel, { color: c.textSecondary }]}>Valor en Stock</Text>
                </View>
              </View>

              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: c.cardElevated || c.surface,
                    borderColor: itemsBajoStock > 0 ? c.error : c.border,
                  },
                ]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={22}
                  color={itemsBajoStock > 0 ? c.error : c.textMuted}
                />
                <View>
                  <Text
                    style={[
                      styles.metricVal,
                      { color: itemsBajoStock > 0 ? c.error : c.text },
                    ]}
                  >
                    {itemsBajoStock}
                  </Text>
                  <Text style={[styles.metricLabel, { color: c.textSecondary }]}>Por Agotarse</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
                ÁREAS DE ALMACENAMIENTO Y ESTACIONES
              </Text>
            </View>

            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {activeAreas.map((area) => {
                const subContainers = areas.filter((a) => a.parentId === area.id);
                return (
                  <Pressable
                    key={area.id}
                    style={[
                      styles.areaChip,
                      { backgroundColor: c.cardElevated || c.surface, borderColor: c.border },
                    ]}
                    onPress={() => {
                      setSelectedAreaId(area.id);
                      setSelectedContainerId(null);
                      setViewMode('containers');
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 30 }}>{area.icon || '📦'}</Text>
                      <View
                        style={{
                          backgroundColor: `${c.primary}20`,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 999,
                        }}
                      >
                        <Text style={{ color: c.primary, fontSize: 10, fontWeight: '800' }}>
                          {subContainers.length} cont.
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.areaChipName, { color: c.text }]}>{area.nombre}</Text>
                  </Pressable>
                );
              })}

              {activeAreas.length === 0 && (
                <View
                  style={{
                    width: '100%',
                    padding: 28,
                    alignItems: 'center',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: c.cardElevated || c.surface,
                    gap: 10,
                  }}
                >
                  <Ionicons name="folder-open-outline" size={34} color={c.primary} />
                  <Text style={{ color: c.text, fontWeight: '800', fontSize: 15 }}>
                    Aún no hay áreas registradas en esta sección
                  </Text>
                  <Text
                    style={{
                      color: c.textSecondary,
                      fontSize: 12,
                      textAlign: 'center',
                      maxWidth: 420,
                    }}
                  >
                    Inicializa las áreas base del negocio (Cocina, Barra, Almacén y Mostrador) o crea una personalizada.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                    <Pressable
                      style={[styles.addBtn, { backgroundColor: c.primary }]}
                      onPress={() => actions.seedPresets()}
                    >
                      <Ionicons name="sparkles-outline" size={16} color="white" />
                      <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>
                        Cargar Áreas Base
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.addBtn,
                        { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
                      ]}
                      onPress={() => setShowAreaModal(true)}
                    >
                      <Ionicons name="add" size={18} color={c.text} />
                      <Text style={{ color: c.text, fontWeight: '700', fontSize: 12 }}>
                        Crear Área Manual
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {viewMode === 'containers' && selectedAreaId && (
          <View style={styles.rightCol}>
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <Pressable
                  style={[
                    styles.actionIcon,
                    { backgroundColor: c.surface, borderColor: c.border },
                  ]}
                  onPress={() => {
                    setSelectedAreaId(null);
                    setViewMode('areas');
                  }}
                >
                  <Ionicons name="arrow-back" size={18} color={c.primary} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.title,
                      { color: c.text, fontFamily: legacyTheme.typography.displayFamily },
                    ]}
                  >
                    {selectedArea?.nombre || 'Área'}
                  </Text>
                  <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                    Selecciona un contenedor físico o revisa todas las existencias del área
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  style={[
                    styles.addBtn,
                    { backgroundColor: c.surface, borderWidth: 1, borderColor: c.primary },
                  ]}
                  onPress={() => setViewMode('items_area')}
                >
                  <Ionicons name="list-outline" size={17} color={c.primary} />
                  <Text style={{ color: c.primary, fontWeight: '800', fontSize: 12 }}>
                    Ver Stock del Área
                  </Text>
                </Pressable>
                {containersForSelectedArea.length > 0 && (
                  <Pressable
                    style={[styles.addBtn, { backgroundColor: c.primary }]}
                    onPress={() => setShowContainerModal(true)}
                  >
                    <Ionicons name="add" size={18} color="white" />
                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>
                      + Contenedor
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
                CONTENEDORES Y REFRIGERADORES EN {selectedArea?.nombre?.toUpperCase()}
              </Text>
            </View>

            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {containersForSelectedArea.map((cont) => {
                const pct = getContainerHealthPct(cont.id);
                const badgeColor = pct >= 80 ? c.success : pct >= 50 ? c.warning : c.error;
                return (
                  <Pressable
                    key={cont.id}
                    style={[
                      styles.areaChip,
                      {
                        width: 175,
                        backgroundColor: c.cardElevated || c.surface,
                        borderColor: c.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedContainerId(cont.id);
                      setViewMode('items_container');
                    }}
                  >
                    <View
                      style={{
                        width: '100%',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 28 }}>{cont.icon || '🧊'}</Text>
                      <View
                        style={{
                          backgroundColor: `${badgeColor}22`,
                          borderColor: badgeColor,
                          borderWidth: 1,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 999,
                        }}
                      >
                        <Text style={{ color: badgeColor, fontWeight: '900', fontSize: 11 }}>
                          {pct}% abasto
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.areaChipName, { color: c.text }]}>{cont.nombre}</Text>
                  </Pressable>
                );
              })}

              {containersForSelectedArea.length === 0 && (
                <View
                  style={{
                    width: '100%',
                    padding: 24,
                    alignItems: 'center',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: c.cardElevated || c.surface,
                    gap: 10,
                  }}
                >
                  <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                    No hay contenedores registrados en esta área.
                  </Text>
                  <Pressable
                    style={[styles.addBtn, { backgroundColor: c.primary }]}
                    onPress={() => setShowContainerModal(true)}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="white" />
                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>
                      Crear primer contenedor
                    </Text>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <Pressable
                  style={[
                    styles.actionIcon,
                    { backgroundColor: c.surface, borderColor: c.border },
                  ]}
                  onPress={itemsViewMeta.onBack}
                >
                  <Ionicons name="arrow-back" size={18} color={c.primary} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.title,
                      { color: c.text, fontFamily: legacyTheme.typography.displayFamily },
                    ]}
                  >
                    {itemsViewMeta.title}
                  </Text>
                  <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                    {itemsViewMeta.subtitle}
                  </Text>
                </View>
              </View>

              {effectiveItems.length > 0 && (
                <Pressable
                  style={[styles.addBtn, { backgroundColor: c.primary }]}
                  onPress={() => {
                    setArticuloEditar(null);
                    setShowItemModal(true);
                  }}
                >
                  <Ionicons name="add" size={18} color="white" />
                  <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>
                    Nuevo Artículo
                  </Text>
                </Pressable>
              )}
            </View>

            <View
              style={[
                styles.detailCard,
                { backgroundColor: c.cardElevated || c.surface, borderColor: c.border },
              ]}
            >
              <FlatList
                data={effectiveItems}
                keyExtractor={(it) => it.itemId}
                style={{ maxHeight: 540 }}
                nestedScrollEnabled
                ListEmptyComponent={
                  <View style={{ padding: 28, alignItems: 'center', gap: 10 }}>
                    <Ionicons name="cube-outline" size={36} color={c.primary} />
                    <Text style={{ color: c.text, fontWeight: '800', fontSize: 15 }}>
                      No hay artículos registrados en esta ubicación
                    </Text>
                    <Text style={{ color: c.textSecondary, fontSize: 12, textAlign: 'center' }}>
                      Registra tu primer insumo, marisco o bebida con su unidad y costo de compra.
                    </Text>
                    <Pressable
                      style={[styles.addBtn, { backgroundColor: c.primary, marginTop: 6 }]}
                      onPress={() => {
                        setArticuloEditar(null);
                        setShowItemModal(true);
                      }}
                    >
                      <Ionicons name="add-circle" size={18} color="white" />
                      <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>
                        Registrar Primer Artículo
                      </Text>
                    </Pressable>
                  </View>
                }
                renderItem={({ item }) => {
                  const step = item.unidad === 'kg' || item.unidad === 'l' ? 0.5 : 1;
                  const isLow = item.controlarExistencias && item.qty <= item.minStock;
                  const metaUso = ETIQUETA_USO[item.uso] || ETIQUETA_USO.ambos;
                  const imgSource = obtenerImagenProducto(item.imagenId, item.nombre, 'inventario');
                  const etiquetaUnidad = formatearEtiquetaUnidadInventario(item.unidad);

                  return (
                    <View style={[styles.distRow, { borderColor: c.border }]}>
                      {imgSource ? (
                        <Image
                          source={imgSource}
                          style={{
                            width: 44,
                            height: 44,
                            resizeMode: 'contain',
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            backgroundColor: c.surface,
                            borderWidth: 1,
                            borderColor: c.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="cube-outline" size={18} color={c.textSecondary} />
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Text style={[styles.distArea, { color: c.text }]}>{item.nombre}</Text>
                          <View
                            style={{
                              backgroundColor: `${metaUso.color}20`,
                              borderColor: metaUso.color,
                              borderWidth: 1,
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ color: metaUso.color, fontSize: 10, fontWeight: '800' }}>
                              {metaUso.texto}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={{
                            flexDirection: 'row',
                            gap: 12,
                            marginTop: 4,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Text style={[styles.itemSub, { color: c.textSecondary }]}>
                            Medida: {etiquetaUnidad.toUpperCase()}
                          </Text>
                          {typeof item.costo === 'number' && item.costo > 0 ? (
                            <Text style={[styles.itemSub, { color: c.success, fontWeight: '800' }]}>
                              Costo: ${item.costo.toFixed(2)} / {etiquetaUnidad}
                            </Text>
                          ) : (
                            <Text style={[styles.itemSub, { color: c.warning }]}>
                              Sin costo registrado
                            </Text>
                          )}
                          {item.equivalencias?.piezasPorKg && (
                            <Text style={[styles.itemSub, { color: c.textMuted }]}>
                              ≈ {item.equivalencias.piezasPorKg} pza/kg
                            </Text>
                          )}
                          {item.equivalencias?.pesoPromedioPiezaKg && (
                            <Text style={[styles.itemSub, { color: c.textMuted }]}>
                              ≈ {(item.equivalencias.pesoPromedioPiezaKg * 1000).toFixed(0)}g c/u
                            </Text>
                          )}
                        </View>
                      </View>

                      {item.controlarExistencias ? (
                        <View style={{ alignItems: 'flex-end', marginRight: 6 }}>
                          <Text
                            style={[
                              styles.distQty,
                              { color: isLow ? c.error : c.text },
                            ]}
                          >
                            {item.qty.toFixed(item.unidad === 'kg' || item.unidad === 'l' ? 2 : 0)}{' '}
                            {etiquetaUnidad}
                          </Text>
                          {isLow && (
                            <Text style={{ color: c.error, fontSize: 10, fontWeight: '800' }}>
                              Bajo stock (mín {item.minStock})
                            </Text>
                          )}
                        </View>
                      ) : (
                        <Text
                          style={{
                            color: c.textMuted,
                            fontSize: 11,
                            fontWeight: '700',
                            marginRight: 8,
                          }}
                        >
                          Stock libre
                        </Text>
                      )}

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        {item.controlarExistencias && (
                          <>
                            <Pressable
                              style={[
                                styles.actionIcon,
                                { backgroundColor: c.surface, borderColor: c.border },
                              ]}
                              onPress={() => {
                                if (viewMode === 'items_section' && !targetContainerIdForOperation) {
                                  actions.ajustarStockDeltaSeccion({
                                    sectionId: activeSectionId,
                                    itemId: item.itemId,
                                    delta: -step,
                                    razon: 'Ajuste manual (-)',
                                  });
                                  return;
                                }
                                const targetId =
                                  viewMode === 'items_container'
                                    ? selectedContainerId
                                    : targetContainerIdForOperation;
                                if (!targetId) return;
                                actions.ajustarStockDelta({
                                  containerId: targetId,
                                  itemId: item.itemId,
                                  delta: -step,
                                  razon: 'Ajuste manual (-)',
                                });
                              }}
                            >
                              <Ionicons name="remove" size={16} color={c.primary} />
                            </Pressable>
                            <Pressable
                              style={[
                                styles.actionIcon,
                                { backgroundColor: c.surface, borderColor: c.border },
                              ]}
                              onPress={() => {
                                if (viewMode === 'items_section' && !targetContainerIdForOperation) {
                                  actions.ajustarStockDeltaSeccion({
                                    sectionId: activeSectionId,
                                    itemId: item.itemId,
                                    delta: step,
                                    razon: 'Entrada manual (+)',
                                  });
                                  return;
                                }
                                const targetId =
                                  viewMode === 'items_container'
                                    ? selectedContainerId
                                    : targetContainerIdForOperation;
                                if (!targetId) return;
                                actions.ajustarStockDelta({
                                  containerId: targetId,
                                  itemId: item.itemId,
                                  delta: step,
                                  razon: 'Entrada manual (+)',
                                });
                              }}
                            >
                              <Ionicons name="add" size={16} color={c.primary} />
                            </Pressable>
                          </>
                        )}

                        {item.catalogoItem && (
                          <Pressable
                            style={[
                              styles.actionIcon,
                              { backgroundColor: c.surface, borderColor: c.border },
                            ]}
                            onPress={() =>
                              setModalOperacion({
                                visible: true,
                                modo: 'porcionar',
                                articulo: { ...item.catalogoItem!, stockActual: item.qty },
                              })
                            }
                          >
                            <Ionicons name="git-branch-outline" size={15} color={c.accent} />
                          </Pressable>
                        )}

                        {item.catalogoItem && item.controlarExistencias && (
                          <Pressable
                            style={[
                              styles.actionIcon,
                              { backgroundColor: c.surface, borderColor: c.border },
                            ]}
                            onPress={() =>
                              setModalOperacion({
                                visible: true,
                                modo: 'merma',
                                articulo: { ...item.catalogoItem!, stockActual: item.qty },
                              })
                            }
                          >
                            <Ionicons name="trash-outline" size={15} color={c.error} />
                          </Pressable>
                        )}

                        {item.catalogoItem && (
                          <Pressable
                            style={[
                              styles.actionIcon,
                              { backgroundColor: c.surface, borderColor: c.border },
                            ]}
                            onPress={() => {
                              setArticuloEditar(item.catalogoItem);
                              setShowItemModal(true);
                            }}
                          >
                            <Ionicons name="create-outline" size={15} color={c.textSecondary} />
                          </Pressable>
                        )}
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

      <ModalArticuloInventario
        visible={showItemModal}
        articuloEditar={articuloEditar}
        onClose={() => {
          setShowItemModal(false);
          setArticuloEditar(null);
        }}
        onGuardar={async (datos, cantidadInicial) => {
          if (articuloEditar) {
            await actions.actualizarItem(articuloEditar.id, {
              ...(datos as any),
              sectionId: articuloEditar.sectionId || activeSectionId,
            });
            return;
          }

          const targetId =
            viewMode === 'items_container' ? selectedContainerId : targetContainerIdForOperation;

          if (targetId) {
            await actions.crearItemEnContenedor({
              containerId: targetId,
              item: {
                ...(datos as any),
                sectionId: activeSectionId,
              },
              initialQty: cantidadInicial,
            });
          } else {
            await actions.crearItemEnSeccion({
              sectionId: activeSectionId,
              item: {
                ...(datos as any),
                sectionId: activeSectionId,
              },
              initialQty: cantidadInicial,
            });
          }
        }}
      />

      <ModalPorcionadoYMerma
        visible={modalOperacion.visible}
        modo={modalOperacion.modo}
        articuloOrigen={modalOperacion.articulo}
        catalogoCompleto={catalog}
        onClose={() => setModalOperacion({ visible: false, modo: 'porcionar', articulo: null })}
        onConfirmarMerma={async ({ cantidad, razon }) => {
          const art = modalOperacion.articulo;
          const areaId =
            viewMode === 'items_container' ? selectedContainerId : targetContainerIdForOperation;
          if (!art || !areaId) return;
          await actions.registrarMerma({
            areaId,
            itemId: art.id,
            cantidad,
            razon,
          });
        }}
        onConfirmarPorcionado={async ({
          cantidadOrigen,
          itemDestinoId,
          nuevoItemNombre,
          nuevoItemUnidad,
          nuevoItemUso,
          cantidadPorcionesObtenidas,
          mermaCantidad,
        }) => {
          const art = modalOperacion.articulo;
          const areaId =
            viewMode === 'items_container' ? selectedContainerId : targetContainerIdForOperation;
          if (!art || !areaId) return;
          await actions.porcionarInsumo({
            insumoOrigenId: art.id,
            cantidadOrigen,
            areaOrigenId: areaId,
            itemDestinoId,
            nuevoItemDestino: !itemDestinoId
              ? {
                  nombre: nuevoItemNombre || `${art.nombre} (Porcionado)`,
                  unidad: nuevoItemUnidad || 'pza',
                  uso: nuevoItemUso || 'ambos',
                  imagenId: art.imagenId,
                }
              : undefined,
            cantidadPorcionesObtenidas,
            areaDestinoId: areaId,
            mermaCantidad,
          });
        }}
      />

      {/* Crear Área */}
      <Modal visible={showAreaModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Nueva Área del Negocio</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: c.background, borderColor: c.border, color: c.text },
              ]}
              placeholder="Nombre del área (ej. Parrilla, Cocina Fría, Almacén)"
              placeholderTextColor={c.textMuted}
              value={areaForm.nombre}
              onChangeText={(t) => setAreaForm({ ...areaForm, nombre: t })}
            />
            <TextInput
              style={[
                styles.input,
                { backgroundColor: c.background, borderColor: c.border, color: c.text },
              ]}
              placeholder="Icono (Emoji)"
              placeholderTextColor={c.textMuted}
              value={areaForm.icon}
              onChangeText={(t) => setAreaForm({ ...areaForm, icon: t })}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowAreaModal(false)}
                style={[styles.cancelBtn, { borderColor: c.border, backgroundColor: c.background }]}
              >
                <Text style={[styles.cancelText, { color: c.textSecondary }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  await actions.crearArea({
                    nombre: areaForm.nombre,
                    icon: areaForm.icon,
                    tipo: 'almacen',
                    hubId: niche === 'venta_crudo' ? 'venta_crudo' : 'restaurante',
                    sectionId: activeSectionId,
                    stock: {},
                  } as any);
                  setShowAreaModal(false);
                  setAreaForm({ nombre: '', icon: '📦', tipo: 'almacen' });
                }}
                style={[styles.confirmBtn, { backgroundColor: c.primary }]}
              >
                <Text style={styles.confirmText}>Crear Área</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showContainerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Nuevo Contenedor</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: c.background, borderColor: c.border, color: c.text },
              ]}
              placeholder="Nombre del contenedor (ej. Congelador 1, Anaquel Secos)"
              placeholderTextColor={c.textMuted}
              value={containerForm.nombre}
              onChangeText={(t) => setContainerForm({ ...containerForm, nombre: t })}
            />
            <TextInput
              style={[
                styles.input,
                { backgroundColor: c.background, borderColor: c.border, color: c.text },
              ]}
              placeholder="Icono (Emoji)"
              placeholderTextColor={c.textMuted}
              value={containerForm.icon}
              onChangeText={(t) => setContainerForm({ ...containerForm, icon: t })}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowContainerModal(false)}
                style={[styles.cancelBtn, { borderColor: c.border, backgroundColor: c.background }]}
              >
                <Text style={[styles.cancelText, { color: c.textSecondary }]}>Cancelar</Text>
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
                style={[styles.confirmBtn, { backgroundColor: c.primary }]}
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
