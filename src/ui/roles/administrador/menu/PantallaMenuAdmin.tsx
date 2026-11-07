/**
 * 📋 MENÚ (rol Administrador) — pantalla de configuración de la oferta comercial.
 *
 * Responsabilidad:
 *  - Seleccionar lo existente de Inventario o del Libro de Platillos.
 *  - Organizar categorías comerciales, consultar costos de referencia, establecer
 *    precios de venta y habilitar canales (Restaurante, Mostrador, Menú Digital).
 *  - Permitir saltar a Inventario o al Libro de Platillos (con retorno manual
 *    y conservación de borrador en memoria de sesión).
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { useToast } from '../../../../compartido/componentes/ui/AvisoEmergente';
import { theme, useAppTheme } from '@/compartido/temas';
import type { Producto } from '../../../../sistema/persistencia';
import { useInventoryAreas, useStore } from '../../../../sistema/store';
import { useFuncionalidadesAdmin, useGestionMenu } from '../../../../capacidades';
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
  const { colors } = useAppTheme();
  const estadoEncendido = useStore((s) => s.estadoEncendido);
  const esPlantilla = estadoEncendido?.tipo_acceso === 'plantilla';

  const l = useMemo(() => {
    const base = { ...ETIQUETAS_MENU_POR_DEFECTO, ...labels };
    if (!estadoEncendido || esPlantilla) return base;
    const caps = (estadoEncendido.capacidades_activas ||
      (estadoEncendido as any)?.activos?.capacidades ||
      []) as string[];
    const roles = (estadoEncendido.roles_activos ||
      (estadoEncendido as any)?.activos?.roles ||
      []) as string[];
    const tieneMostrador =
      caps.includes('mostrador_y_pos') || caps.includes('mostrador') || roles.includes('mostrador');
    const tieneDigital = caps.includes('menu_digital') || roles.includes('menu_digital');
    return {
      ...base,
      showVentaCrudo: tieneMostrador,
      showMenuDigital: tieneDigital,
    };
  }, [labels, estadoEncendido, esPlantilla]);

  const { width } = useWindowDimensions();
  const IS_MOBILE = width < 768;

  const {
    categorias,
    articulosVendiblesInventario,
    platillosDisponibles,
    loading,
    actions,
    getProductosPorCategoria,
  } = useGestionMenu();

  const areas = useInventoryAreas();
  const areasList = useMemo(() => {
    return Object.entries(areas || {}).map(([id, a]) => ({ ...(a as any), id }));
  }, [areas]);

  const { showToast } = useToast();

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<ModalType>(null);
  const [catNombre, setCatNombre] = useState('');
  const [formData, setFormData] = useState<FormState>(crearFormularioVacio());
  const [editingTab, setEditingTab] = useState<PestanaProducto>('basico');
  const [isSaving, setIsSaving] = useState(false);
  const { isEnabled: featureEnabled } = useFuncionalidadesAdmin();

  // Restaurar borrador si el administrador vuelve manualmente tras visitar Inventario o Libro de Platillos
  useEffect(() => {
    const borrador = actions.consumirBorradorMenu?.();
    if (borrador && borrador.formData) {
      setSelectedCat(borrador.selectedCat || null);
      setFormData(borrador.formData);
      setEditingTab(borrador.editingTab || 'basico');
      setShowModal(borrador.showModal || 'addProd');
    }
  }, [actions]);

  const activeCat = useMemo(() => {
    if (selectedCat && categorias.some((c) => c.id === selectedCat)) {
      return selectedCat;
    }
    return categorias.length > 0 ? categorias[0].id : null;
  }, [selectedCat, categorias]);

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
        showToast('Oferta agregada al menú', 'success');
      } else {
        await actions.actualizarProductoConValidacion(formData.id, payload);
        showToast('Oferta actualizada', 'success');
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
      `¿Seguro que quieres eliminar el producto "${nombre}" del menú?`,
      async () => {
        try {
          await actions.eliminarProductoConValidacion(id);
          showToast('Producto eliminado del menú', 'success');
        } catch (err: any) {
          showToast(err?.message || 'Error al eliminar producto', 'error');
        }
      }
    );
  };

  const handleIrAInventario = () => {
    actions.guardarBorradorMenu?.({
      selectedCat: activeCat,
      formData,
      editingTab,
      showModal,
    });
    setShowModal(null);
    router.push('/_role/admin/inventario' as any);
  };

  const handleIrALibroPlatillos = () => {
    actions.guardarBorradorMenu?.({
      selectedCat: activeCat,
      formData,
      editingTab,
      showModal,
    });
    setShowModal(null);
    router.push('/_role/cocina?vista=libro' as any);
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

  const abrirNuevaCategoria = () => {
    setCatNombre('');
    setShowModal('addCat');
  };

  const currentProducts = useMemo(
    () => (activeCat ? getProductosPorCategoria(activeCat) : []),
    [activeCat, getProductosPorCategoria]
  );

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando menú...</Text>
        </View>
      </View>
    );
  }

  const abrirEdicion = (prod: Producto, pestana: PestanaProducto = 'basico') => {
    const nextForm = productoAFormulario(prod);
    setFormData(nextForm);
    setEditingTab(pestana);
    setShowModal('editProd');
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="restaurant-outline" size={28} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{l.catalogTitle}</Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          {l.catalogSubtitle}
        </Text>
      </View>

      <View style={[styles.mainGrid, IS_MOBILE && styles.mainGridMobile]}>
        <BarraCategorias
          categorias={categorias}
          activeId={activeCat}
          totals={totals}
          onSelect={setSelectedCat}
          onAgregar={featureEnabled('admin_menu_add_category') ? abrirNuevaCategoria : undefined}
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

        <View
          style={[
            styles.productsSection,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <ListaProductos
            categoriaNombre={activeCategoryObj?.nombre}
            productos={currentProducts}
            onAgregarCategoria={
              featureEnabled('admin_menu_add_category') ? abrirNuevaCategoria : undefined
            }
            onAgregarProducto={() => {
              if (!activeCat) return;
              setFormData({ ...crearFormularioVacio(), categoriaId: activeCat });
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
            onReceta={(prod) => {
              const esPlatillo =
                prod.origenTipo === 'platillo' ||
                Boolean(prod.receta?.ingredientes && Object.keys(prod.receta.ingredientes).length > 0);
              if (esPlatillo) {
                router.push('/_role/cocina?vista=libro' as any);
              } else {
                router.push('/_role/admin/inventario' as any);
              }
            }}
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
              articulosInventario={articulosVendiblesInventario}
              platillosCocina={platillosDisponibles}
              areas={areasList}
              etiquetas={l}
              isSaving={isSaving}
              onIrAInventario={handleIrAInventario}
              onIrALibroPlatillos={handleIrALibroPlatillos}
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
    fontSize: 16,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.heavy,
    fontFamily: (theme.typography as any).displayFamily || theme.typography.fontFamily,
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.sm,
  },
  mainGrid: {
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  mainGridMobile: {
    flexDirection: 'column',
  },
  productsSection: {
    flex: 1,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
  },
  modalOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: theme.spacing.md,
  },
});

export default PantallaMenuAdmin;
