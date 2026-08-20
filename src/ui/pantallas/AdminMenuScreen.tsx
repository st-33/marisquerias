/**
 * 📋 ADMIN MENU SCREEN (Gestión de Menú Premium)
 * Componente visual para alimentos y bebidas
 */

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { CategorySidebar } from '../bloques/menu/CategorySidebar';
import { ProductCard } from '../bloques/menu/ProductCard';
import RecipeEditor from '../bloques/RecipeEditor';
import VariantEditor from '../bloques/VariantEditor';
import { useToast } from '../../compartido/componentes/ui/Toast';
import { theme } from '../../compartido/theme';
import type { Producto } from '../../sistema/persistencia';
import { getRtdb } from '../../sistema/firebase';
import { useInventoryAreas, useInventoryCatalog, useStore } from '../../sistema/store';
import type { FabItem } from '../../sistema/tipos/contratos';
import { useAdminFeatures, useMenuManagement, usePuenteAccionesFlotantes } from '../../capacidades';

// --- UTILS ---
async function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      await onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

type ModalType = 'addCat' | 'addProd' | 'editProd' | null;

type FormState = {
  id: string;
  activo: boolean;
  nombre: string;
  precio: string;
  categoriaId: string;
  variantes: Producto['variantes'];
  visible: Producto['visible'];
  prepMin: number;
  receta: Producto['receta'];
  usarConfigPersonalizada: boolean;
  enviarACocina: boolean;
  saltarPreparando: boolean;
  unidad: 'pza' | 'kg';
};

const createEmptyForm = (): FormState => ({
  id: '',
  activo: true,
  nombre: '',
  precio: '',
  categoriaId: '',
  variantes: {} as Producto['variantes'],
  visible: { digital: true, mesero: true, ventaCrudo: true } as Producto['visible'],
  prepMin: 0,
  receta: {} as Producto['receta'],
  usarConfigPersonalizada: false,
  enviarACocina: true,
  saltarPreparando: false,
  unidad: 'pza',
});

type ProductFormPayload = Omit<FormState, 'id' | 'activo' | 'categoriaId'>;

const productoToFormState = (producto: Producto): FormState => ({
  id: producto.id,
  activo: producto.activo ?? true,
  nombre: producto.nombre,
  precio: producto.precio != null ? String(producto.precio) : '',
  categoriaId: producto.categoriaId,
  variantes: producto.variantes || {},
  visible: {
    digital: true,
    mesero: true,
    ventaCrudo: true,
    ...(producto.visible || {}),
  } as Producto['visible'],
  prepMin: producto.prepMin || 0,
  receta: producto.receta || {},
  usarConfigPersonalizada: producto.usarConfigPersonalizada || false,
  enviarACocina: producto.enviarACocina ?? true,
  saltarPreparando: producto.saltarPreparando ?? false,
  unidad: (producto.unidad as FormState['unidad']) || 'pza',
});

const formStateToPayload = (form: FormState): ProductFormPayload => ({
  nombre: form.nombre,
  precio: form.precio,
  variantes: form.variantes,
  visible: { ...form.visible },
  prepMin: form.prepMin,
  receta: form.receta,
  usarConfigPersonalizada: form.usarConfigPersonalizada,
  enviarACocina: form.enviarACocina,
  saltarPreparando: form.saltarPreparando,
  unidad: form.unidad,
});

export interface MenuLabels {
  catalogTitle: string;
  catalogSubtitle: string;
  itemLabel: string;
  itemsPluralLabel: string;
  categoryLabel: string;
  recipeTab: string;
  preparationFlow: string;
  sendToPreparation: string;
  sellerVisibility: string;
  sellerSubtext: string;
  showVentaCrudo?: boolean;
}

export const DEFAULT_MENU_LABELS: MenuLabels = {
  catalogTitle: 'Gestión de Catálogo / Menú',
  catalogSubtitle: 'Administra tus categorías, productos e insumos en tiempo real',
  itemLabel: 'Producto',
  itemsPluralLabel: 'productos',
  categoryLabel: 'Categoría',
  recipeTab: 'Receta / Insumos',
  preparationFlow: 'Flujo de Despacho / Preparación',
  sendToPreparation: 'Enviar a Despacho / Cocina',
  sellerVisibility: 'Visible para Operadores',
  sellerSubtext: 'Aparece en la app de atención y ventas',
  showVentaCrudo: true,
};

export interface AdminMenuScreenProps {
  labels?: Partial<MenuLabels>;
}

export function AdminMenuScreen({ labels }: AdminMenuScreenProps = {}) {
  const l = useMemo(() => ({ ...DEFAULT_MENU_LABELS, ...labels }), [labels]);
  const tenantPath = useStore((s) => s.sesion.tenantPath) || '';
  const ds = useStore((s) => s.dataSources);
  const db = useMemo(() => getRtdb(ds?.operacionUrl || undefined), [ds]);
  const { width } = useWindowDimensions();
  const IS_MOBILE = width < 768;

  const { categorias, loading, actions, getProductosPorCategoria } = useMenuManagement({
    db,
    tenantPath,
  });
  const catalog = useInventoryCatalog();
  const areas = useInventoryAreas();

  const itemsInventario = useMemo(() => {
    const safeCatalog = catalog || {};
    const safeAreas = areas || {};
    return Object.entries(safeCatalog).map(([id, item]) => {
      let stockConsolidado = 0;
      Object.values(safeAreas).forEach((area: any) => {
        if (area?.stock && typeof area.stock[id] === 'number') {
          stockConsolidado += area.stock[id];
        }
      });
      return {
        id,
        nombre: (item as any)?.nombre || id,
        unidad: (item as any)?.unidad || 'unidades',
        stock: stockConsolidado,
      };
    });
  }, [catalog, areas]);

  const { showToast } = useToast();

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<ModalType>(null);
  const [catNombre, setCatNombre] = useState('');
  const [formData, setFormData] = useState<FormState>(createEmptyForm());
  const [editingTab, setEditingTab] = useState<'basico' | 'variantes' | 'receta'>('basico');
  const { isEnabled: featureEnabled } = useAdminFeatures();

  const activeCat = useMemo(() => {
    if (selectedCat && categorias.some((c) => c.id === selectedCat)) {
      return selectedCat;
    }
    return categorias.length > 0 ? categorias[0].id : null;
  }, [selectedCat, categorias]);

  const fabItems = useMemo<FabItem[]>(() => {
    const items: FabItem[] = [
      {
        key: 'add-product',
        label: 'Nuevo Producto',
        icon: <Ionicons name="add" size={24} color={'#FFFFFF'} />,
        onPress: () => {
          if (!activeCat) {
            showToast('Selecciona una categoría primero', 'error');
            return;
          }
          setFormData({ ...createEmptyForm(), categoriaId: activeCat });
          setEditingTab('basico');
          setShowModal('addProd');
        },
      },
    ];

    if (featureEnabled('admin_menu_add_category')) {
      items.push({
        key: 'add-category',
        label: 'Nueva Categoría',
        icon: <Ionicons name="folder-outline" size={20} color={'#FFFFFF'} />,
        onPress: () => {
          setCatNombre('');
          setShowModal('addCat');
        },
      });
    }

    return items;
  }, [activeCat, featureEnabled, showToast]);

  usePuenteAccionesFlotantes({
    items: fabItems,
    position: 'bottom-right',
    initialKey: null,
  });

  const handleAddCategory = async () => {
    if (!catNombre.trim()) {
      showToast('El nombre de la categoría es obligatorio', 'error');
      return;
    }
    try {
      await actions.crearCategoriaConValidacion({ nombre: catNombre.trim() });
      showToast('Categoría creada', 'success');
      setCatNombre('');
      setShowModal(null);
    } catch (err: any) {
      showToast(err?.message || 'Error al crear categoría', 'error');
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProduct = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = formStateToPayload(formData);
      if (showModal === 'addProd') {
        await actions.crearProductoConValidacion({
          ...payload,
          categoriaId: formData.categoriaId,
        });
        showToast('Producto creado', 'success');
      } else {
        await actions.actualizarProductoConValidacion(formData.id, payload);
        showToast('Producto actualizado', 'success');
      }
      setFormData(createEmptyForm());
      setShowModal(null);
    } catch (err: any) {
      showToast(err?.message || 'Error al guardar producto', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string, nombre: string) => {
    const hasProducts = getProductosPorCategoria(id).length > 0;
    if (hasProducts) {
      showToast('No puedes eliminar una categoría con productos', 'error');
      return;
    }
    confirmAction(
      '¿Eliminar categoría?',
      `¿Seguro que quieres eliminar la categoría "${nombre}"?`,
      async () => {
        try {
          await actions.eliminarCategoria?.(id);
          showToast('Categoría eliminada', 'success');
          if (activeCat === id) setSelectedCat(categorias.find((c) => c.id !== id)?.id || null);
        } catch (err: any) {
          showToast(err?.message || 'Error al eliminar', 'error');
        }
      }
    );
  };

  const handleDeleteProduct = async (id: string, nombre: string) => {
    confirmAction(
      '¿Eliminar producto?',
      `¿Seguro que quieres eliminar el producto "${nombre}"?`,
      async () => {
        try {
          await actions.eliminarProductoConValidacion(id);
          showToast('Producto eliminado', 'success');
        } catch (err: any) {
          showToast(err?.message || 'Error al eliminar producto', 'error');
        }
      }
    );
  };

  const totals = useMemo(() => {
    const map: Record<string, number> = {};
    categorias.forEach((c) => {
      map[c.id] = getProductosPorCategoria(c.id).length;
    });
    return map;
  }, [categorias, getProductosPorCategoria]);

  const activeCategoryObj = useMemo(
    () => categorias.find((c) => c.id === activeCat),
    [categorias, activeCat]
  );
  const currentProducts = useMemo(
    () => (activeCat ? getProductosPorCategoria(activeCat) : []),
    [activeCat, getProductosPorCategoria]
  );

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando menú...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="cube-outline" size={28} color={theme.colors.primary} />
          <Text style={styles.headerTitle}>{l.catalogTitle}</Text>
        </View>
        <Text style={styles.headerSubtitle}>{l.catalogSubtitle}</Text>
      </View>

      <View style={[styles.mainGrid, IS_MOBILE && styles.mainGridMobile]}>
        <CategorySidebar
          categorias={categorias}
          activeId={activeCat}
          totals={totals}
          onSelect={setSelectedCat}
          onDelete={handleDeleteCategory}
          onToggleEnviarACocina={(id, enabled) =>
            actions.actualizarCategoria(id, { enviarACocina: enabled })
          }
          onToggleSaltarPreparando={(id, enabled) =>
            actions.actualizarCategoria(id, { saltarPreparando: enabled })
          }
          onUpdateHerencia={(id, herencia) => actions.actualizarCategoria(id, { herencia })}
          showVentaCrudo={l.showVentaCrudo}
        />

        <View style={styles.productsSection}>
          {activeCategoryObj ? (
            <>
              <View style={styles.categoryHeader}>
                <View>
                  <Text style={styles.categoryTitle}>{activeCategoryObj.nombre}</Text>
                  <Text style={styles.productCount}>
                    {currentProducts.length}{' '}
                    {currentProducts.length === 1 ? 'producto' : 'productos'}
                  </Text>
                </View>
                <Pressable
                  style={styles.btnPrimary}
                  onPress={() => {
                    setFormData({ ...createEmptyForm(), categoriaId: activeCategoryObj.id });
                    setEditingTab('basico');
                    setShowModal('addProd');
                  }}
                >
                  <Ionicons name="add" size={20} color="white" />
                  <Text style={styles.btnPrimaryText}>Agregar Producto</Text>
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.productsGrid}>
                {currentProducts.length === 0 ? (
                  <View style={styles.emptyProducts}>
                    <Ionicons name="cube-outline" size={48} color="#64748b" />
                    <Text style={styles.emptyTitle}>Sin productos en esta categoría</Text>
                    <Text style={styles.emptySubtitle}>
                      Presiona &quot;Agregar Producto&quot; para comenzar
                    </Text>
                  </View>
                ) : (
                  currentProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      producto={prod}
                      onEdit={() => {
                        setFormData(productoToFormState(prod));
                        setEditingTab('basico');
                        setShowModal('editProd');
                      }}
                      onToggle={async (p) => {
                        try {
                          await actions.actualizarProducto(p.id, { activo: !(p.activo ?? true) });
                          showToast('Estado del producto actualizado', 'success');
                        } catch (err: any) {
                          showToast(err?.message || 'Error al actualizar', 'error');
                        }
                      }}
                      onRecipe={() => {
                        setFormData(productoToFormState(prod));
                        setEditingTab('receta');
                        setShowModal('editProd');
                      }}
                      onDelete={() => handleDeleteProduct(prod.id, prod.nombre)}
                    />
                  ))
                )}
              </ScrollView>
            </>
          ) : (
            <View style={styles.emptyProducts}>
              <Ionicons name="folder-open-outline" size={48} color="#64748b" />
              <Text style={styles.emptyTitle}>Selecciona o crea una categoría</Text>
            </View>
          )}
        </View>
      </View>

      {showModal && (
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <View style={[styles.modalCard, showModal !== 'addCat' && styles.modalCardLarge]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showModal === 'addCat'
                  ? 'Nueva Categoría'
                  : showModal === 'addProd'
                    ? 'Nuevo Producto'
                    : 'Editar Producto'}
              </Text>
              <Pressable onPress={() => setShowModal(null)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </Pressable>
            </View>

            {showModal === 'addCat' ? (
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Nombre de la Categoría</Text>
                <TextInput
                  style={styles.textInput}
                  value={catNombre}
                  onChangeText={setCatNombre}
                  placeholder="Ej: Entradas, Bebidas, Postres"
                  placeholderTextColor="#64748b"
                  autoFocus
                />
                <View style={styles.modalFooter}>
                  <Pressable style={styles.btnSecondary} onPress={() => setShowModal(null)}>
                    <Text style={styles.btnSecondaryText}>Cancelar</Text>
                  </Pressable>
                  <Pressable style={styles.btnPrimary} onPress={handleAddCategory}>
                    <Text style={styles.btnPrimaryText}>Crear Categoría</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <View style={styles.tabsRow}>
                  <Pressable
                    style={[styles.tabBtn, editingTab === 'basico' && styles.tabBtnActive]}
                    onPress={() => setEditingTab('basico')}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color={editingTab === 'basico' ? theme.colors.primary : '#94a3b8'}
                    />
                    <Text style={[styles.tabText, editingTab === 'basico' && styles.tabTextActive]}>
                      Básico
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.tabBtn, editingTab === 'variantes' && styles.tabBtnActive]}
                    onPress={() => setEditingTab('variantes')}
                  >
                    <Ionicons
                      name="options-outline"
                      size={18}
                      color={editingTab === 'variantes' ? theme.colors.primary : '#94a3b8'}
                    />
                    <Text
                      style={[styles.tabText, editingTab === 'variantes' && styles.tabTextActive]}
                    >
                      Variantes/Opciones
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.tabBtn, editingTab === 'receta' && styles.tabBtnActive]}
                    onPress={() => setEditingTab('receta')}
                  >
                    <Ionicons
                      name="restaurant-outline"
                      size={18}
                      color={editingTab === 'receta' ? theme.colors.primary : '#94a3b8'}
                    />
                    <Text style={[styles.tabText, editingTab === 'receta' && styles.tabTextActive]}>
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
                  {editingTab === 'basico' && (
                    <View style={styles.formSection}>
                      <Text style={styles.inputLabel}>Nombre del Producto *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={formData.nombre}
                        onChangeText={(v) => setFormData({ ...formData, nombre: v })}
                        placeholder="Ej: Producto Base"
                        placeholderTextColor="#64748b"
                      />

                      <View style={styles.inputRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.inputLabel}>Precio Base ($) *</Text>
                          <TextInput
                            style={styles.textInput}
                            value={formData.precio}
                            onChangeText={(v) => setFormData({ ...formData, precio: v })}
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
                              setFormData({ ...formData, prepMin: parseInt(v) || 0 })
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
                              style={[
                                styles.unitBtn,
                                formData.unidad === 'pza' && styles.unitBtnActive,
                              ]}
                              onPress={() => setFormData({ ...formData, unidad: 'pza' })}
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
                              style={[
                                styles.unitBtn,
                                formData.unidad === 'kg' && styles.unitBtnActive,
                              ]}
                              onPress={() => setFormData({ ...formData, unidad: 'kg' })}
                            >
                              <Ionicons
                                name="scale-outline"
                                size={18}
                                color={formData.unidad === 'kg' ? 'white' : '#64748b'}
                              />
                              <Text
                                style={[
                                  styles.unitText,
                                  formData.unidad === 'kg' && styles.unitTextActive,
                                ]}
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
                            setFormData({
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
                              setFormData({
                                ...formData,
                                usarConfigPersonalizada: v,
                              })
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
                                onValueChange={(v) =>
                                  setFormData({
                                    ...formData,
                                    enviarACocina: v,
                                  })
                                }
                              />
                            </View>

                            {formData.enviarACocina && (
                              <View style={[styles.switchRow, styles.switchRowNested]}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.switchLabel}>
                                    Auto-Completar (Saltar Preparando)
                                  </Text>
                                  <Text style={styles.switchSublabel}>
                                    Pasa directo a listo al enviar
                                  </Text>
                                </View>
                                <Switch
                                  value={formData.saltarPreparando}
                                  onValueChange={(v) =>
                                    setFormData({
                                      ...formData,
                                      saltarPreparando: v,
                                    })
                                  }
                                />
                              </View>
                            )}
                          </>
                        )}
                      </View>
                    </View>
                  )}

                  {editingTab === 'variantes' && (
                    <VariantEditor
                      variantes={formData.variantes}
                      onChange={(newVariantes) =>
                        setFormData((current) => ({ ...current, variantes: newVariantes }))
                      }
                      visible={formData.visible}
                      onVisibleChange={(visible) =>
                        setFormData((current) => ({ ...current, visible }))
                      }
                      prepMin={formData.prepMin}
                      onPrepMinChange={(prepMin) =>
                        setFormData((current) => ({ ...current, prepMin }))
                      }
                      showVentaCrudo={l.showVentaCrudo}
                    />
                  )}

                  {editingTab === 'receta' && (
                    <RecipeEditor
                      receta={formData.receta}
                      onRecetaChange={(newReceta) =>
                        setFormData({ ...formData, receta: newReceta })
                      }
                      itemsInventario={itemsInventario as any}
                      validacion={null}
                      validando={false}
                    />
                  )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <Pressable
                    style={styles.btnSecondary}
                    onPress={() => setShowModal(null)}
                    disabled={isSaving}
                  >
                    <Text style={styles.btnSecondaryText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btnPrimary, isSaving && { opacity: 0.5 }]}
                    onPress={handleSaveProduct}
                    disabled={isSaving}
                  >
                    <Text style={styles.btnPrimaryText}>
                      {isSaving ? 'Guardando...' : 'Guardar Producto'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  headerTitle: {
    color: '#64748B',
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
  },
  headerSubtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
  },
  mainGrid: {
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  mainGridMobile: {
    flexDirection: 'column',
  },
  productsSection: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryTitle: {
    color: '#64748B',
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
  },
  productCount: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
    marginTop: 2,
  },
  productsGrid: {
    gap: theme.spacing.md,
  },
  emptyProducts: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyTitle: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    color: '#0F172A',
    fontSize: theme.typography.sizes.sm,
    marginTop: theme.spacing.xs,
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
  modalOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: theme.spacing.md,
  },
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
  inputRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
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
});

export default AdminMenuScreen;
