/**
 * 📋 MENÚ (rol Administrador) — pantalla de gestión de catálogo.
 *
 * Composición:
 *  - Datos/acciones: useGestionMenu + useAdminFeatures + store.
 *  - Piezas visuales: bloques/ (BarraCategorias), componentes/ (ListaProductos,
 *    ModalNuevaCategoria, ModalProducto), editores/ (EditorReceta, EditorVariantes).
 *  - Lógica pura: logica/ (formularioProducto, etiquetas).
 *
 * Historial: antes `AdminMenuScreen.tsx` (1063 líneas con formularios y modales
 * inline); se extrajeron ListaProductos, ModalNuevaCategoria, ModalProducto y la
 * lógica del formulario.
 */

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { BarraCategorias } from './bloques/BarraCategorias';
import { useToast } from '../../../../compartido/componentes/ui/Toast';
import { theme } from '@compartido/theme';
import type { Producto } from '../../../../sistema/persistencia';
import { getRtdb } from '../../../../sistema/firebase';
import { useInventoryAreas, useInventoryCatalog, useStore } from '../../../../sistema/store';
import type { FabItem } from '../../../../sistema/tipos/contratos';
import {
  useAdminFeatures,
  useGestionMenu,
  usePuenteAccionesFlotantes,
} from '../../../../capacidades';
import { ListaProductos } from './componentes/ListaProductos';
import { ModalNuevaCategoria } from './componentes/ModalNuevaCategoria';
import { ModalProducto, type PestanaProducto } from './componentes/ModalProducto';
import {
  crearFormularioVacio,
  formularioACarga,
  productoAFormulario,
  type FormState,
  type ModalType,
} from './logica/formularioProducto';
import { ETIQUETAS_MENU_POR_DEFECTO, type EtiquetasMenu } from './logica/etiquetas';

export type { EtiquetasMenu };
export { ETIQUETAS_MENU_POR_DEFECTO };

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

export interface PropsPantallaMenuAdmin {
  labels?: Partial<EtiquetasMenu>;
}

export function PantallaMenuAdmin({ labels }: PropsPantallaMenuAdmin = {}) {
  const l = useMemo(() => ({ ...ETIQUETAS_MENU_POR_DEFECTO, ...labels }), [labels]);
  const tenantPath = useStore((s) => s.sesion.tenantPath) || '';
  const ds = useStore((s) => s.dataSources);
  const db = useMemo(() => getRtdb(ds?.operacionUrl || undefined), [ds]);
  const { width } = useWindowDimensions();
  const IS_MOBILE = width < 768;

  const {
    categorias,
    loading,
    actions,
    getProductosPorCategoria,
    validacionActive,
    validandoActive,
  } = useGestionMenu({ db, tenantPath });
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
  const [formData, setFormData] = useState<FormState>(crearFormularioVacio());
  const [editingTab, setEditingTab] = useState<PestanaProducto>('basico');
  const [isSaving, setIsSaving] = useState(false);
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
          setFormData({ ...crearFormularioVacio(), categoriaId: activeCat });
          actions.setRecetaEnEdicion(null);
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

  const handleSaveProduct = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = formularioACarga(formData);
      if (showModal === 'addProd') {
        await actions.crearProductoConValidacion({ ...payload, categoriaId: formData.categoriaId });
        showToast('Producto creado', 'success');
      } else {
        await actions.actualizarProductoConValidacion(formData.id, payload);
        showToast('Producto actualizado', 'success');
      }
      setFormData(crearFormularioVacio());
      actions.setRecetaEnEdicion(null);
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

  const abrirEdicion = (prod: Producto, pestana: PestanaProducto) => {
    const nextForm = productoAFormulario(prod);
    setFormData(nextForm);
    actions.setRecetaEnEdicion(nextForm.receta?.ingredientes || null);
    setEditingTab(pestana);
    setShowModal('editProd');
  };

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
        <BarraCategorias
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
          <ListaProductos
            categoriaNombre={activeCategoryObj?.nombre}
            productos={currentProducts}
            onAgregarProducto={() => {
              if (!activeCat) return;
              setFormData({ ...crearFormularioVacio(), categoriaId: activeCat });
              actions.setRecetaEnEdicion(null);
              setEditingTab('basico');
              setShowModal('addProd');
            }}
            onEditar={(prod) => abrirEdicion(prod, 'basico')}
            onToggle={async (prod) => {
              try {
                await actions.actualizarProducto(prod.id, { activo: !(prod.activo ?? true) });
                showToast('Estado del producto actualizado', 'success');
              } catch (err: any) {
                showToast(err?.message || 'Error al actualizar', 'error');
              }
            }}
            onReceta={(prod) => abrirEdicion(prod, 'receta')}
            onEliminar={(prod) => handleDeleteProduct(prod.id, prod.nombre)}
          />
        </View>
      </View>

      {showModal && (
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          {showModal === 'addCat' ? (
            <ModalNuevaCategoria
              nombre={catNombre}
              onCambiarNombre={setCatNombre}
              onCancelar={() => setShowModal(null)}
              onCrear={handleAddCategory}
            />
          ) : (
            <ModalProducto
              modo={showModal}
              formData={formData}
              onFormDataChange={setFormData}
              pestana={editingTab}
              onPestanaChange={setEditingTab}
              itemsInventario={itemsInventario}
              validacion={validacionActive}
              validando={validandoActive}
              onRecetaEnEdicion={(ing) => actions.setRecetaEnEdicion(ing)}
              etiquetas={l}
              isSaving={isSaving}
              onGuardar={handleSaveProduct}
              onCancelar={() => setShowModal(null)}
            />
          )}
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
  modalOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: theme.spacing.md,
  },
});

export default PantallaMenuAdmin;
