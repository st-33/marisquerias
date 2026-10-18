/**
 * 💳 PANTALLA CAJA — TERMINAL CIEGA DE COBRO RÁPIDO
 *
 * Terminal especializada para el rol Cajero:
 * - Vista enfocada exclusivamente en cobro
 * - Lista de productos agrupados/filtrados por categoría
 * - Carrito lateral/integrado con total y botón "Cobrar"
 * - Modal de cobro con métodos de pago
 * - Impresión de ticket condicional a la capacidad `tickets_impresion`
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useCajaCobro, type MetodoPagoCaja } from '../../roles/logica/caja';

export function PantallaCaja() {
  const { width } = useWindowDimensions();
  const esPantallaAmplia = width >= 768;

  const {
    loading,
    categorias,
    categoriaSeleccionada,
    setCategoriaSeleccionada,
    busqueda,
    setBusqueda,
    productosFiltrados,
    carrito,
    subtotal,
    descuento,
    total,
    metodoPago,
    setMetodoPago,
    procesandoCobro,
    errorCobro,
    ticketsImpresionActivo,
    agregarProducto,
    actualizarCantidad,
    eliminarItem,
    limpiarCarrito,
    cobrar,
  } = useCajaCobro();

  const [modalCobroVisible, setModalCobroVisible] = useState(false);
  const [imprimirTicket, setImprimirTicket] = useState(true);

  const ejecutarCobro = async () => {
    const res = await cobrar({
      imprimirTicket,
      metodoPago,
    });

    if (res.exito) {
      setModalCobroVisible(false);
      Alert.alert(
        'Venta Exitosa',
        `Folio: ${res.ventaId || 'OK'}\nTotal: $${total.toFixed(2)}${
          res.ticketEmitido ? '\nTicket impreso correctamente.' : ''
        }`
      );
    } else {
      Alert.alert('Error de Cobro', res.error || 'No se pudo registrar la venta.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Iniciando terminal de cobro...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="card-outline" size={24} color="#60a5fa" />
          <Text style={styles.headerTitle}>Terminal de Cobro</Text>
        </View>
        <View style={styles.headerRight}>
          {ticketsImpresionActivo ? (
            <View style={[styles.badge, styles.badgeImpresionActiva]}>
              <Ionicons name="print-outline" size={14} color="#34d399" />
              <Text style={styles.badgeTextActivo}>Tickets Activos</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeImpresionDormida]}>
              <Ionicons name="print-outline" size={14} color="#94a3b8" />
              <Text style={styles.badgeTextDormido}>Tickets Inactivos</Text>
            </View>
          )}
        </View>
      </View>

      {/* Main workspace */}
      <View style={[styles.body, esPantallaAmplia ? styles.bodyRow : styles.bodyCol]}>
        {/* Catálogo de Productos */}
        <View style={styles.catalogoContainer}>
          {/* Búsqueda */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre o código..."
              placeholderTextColor="#64748b"
              value={busqueda}
              onChangeText={setBusqueda}
              autoCapitalize="none"
            />
            {busqueda.length > 0 && (
              <Pressable onPress={() => setBusqueda('')}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </Pressable>
            )}
          </View>

          {/* Categorías */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesBar}
            contentContainerStyle={styles.categoriesContent}
          >
            <Pressable
              style={[
                styles.categoryChip,
                categoriaSeleccionada === null && styles.categoryChipActive,
              ]}
              onPress={() => setCategoriaSeleccionada(null)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  categoriaSeleccionada === null && styles.categoryChipTextActive,
                ]}
              >
                Todos
              </Text>
            </Pressable>
            {Object.values(categorias).map((cat) => (
              <Pressable
                key={cat.id}
                style={[
                  styles.categoryChip,
                  categoriaSeleccionada === cat.id && styles.categoryChipActive,
                ]}
                onPress={() => setCategoriaSeleccionada(cat.id)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    categoriaSeleccionada === cat.id && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.nombre}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Grid de Productos */}
          <ScrollView style={styles.productsScroll} contentContainerStyle={styles.productsGrid}>
            {productosFiltrados.length === 0 ? (
              <View style={styles.emptyProducts}>
                <Ionicons name="cube-outline" size={40} color="#475569" />
                <Text style={styles.emptyText}>No se encontraron productos</Text>
              </View>
            ) : (
              productosFiltrados.map((prod) => (
                <Pressable
                  key={prod.id}
                  style={styles.productCard}
                  onPress={() => agregarProducto(prod)}
                >
                  <Text style={styles.productName} numberOfLines={2}>
                    {prod.nombre}
                  </Text>
                  <View style={styles.productPriceRow}>
                    <Text style={styles.productPrice}>${Number(prod.precio || 0).toFixed(2)}</Text>
                    <Ionicons name="add-circle" size={22} color="#3b82f6" />
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>

        {/* Carrito Lateral */}
        <View style={styles.cartContainer}>
          <View style={styles.cartHeader}>
            <View style={styles.cartHeaderTitleRow}>
              <Ionicons name="cart" size={20} color="#f8fafc" />
              <Text style={styles.cartHeaderTitle}>Ticket de Venta</Text>
              <View style={styles.cartCountBadge}>
                <Text style={styles.cartCountText}>{carrito.length}</Text>
              </View>
            </View>
            {carrito.length > 0 && (
              <Pressable style={styles.clearCartBtn} onPress={limpiarCarrito}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={styles.clearCartText}>Vaciar</Text>
              </Pressable>
            )}
          </View>

          {/* Lista de Items en Carrito */}
          <ScrollView
            style={styles.cartItemsScroll}
            contentContainerStyle={styles.cartItemsContent}
          >
            {carrito.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="receipt-outline" size={48} color="#334155" />
                <Text style={styles.emptyCartTitle}>Carrito Vacío</Text>
                <Text style={styles.emptyCartSub}>
                  Selecciona productos del catálogo para cobrar
                </Text>
              </View>
            ) : (
              carrito.map((item) => (
                <View key={item.id} style={styles.cartItemRow}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName} numberOfLines={1}>
                      {item.nombre}
                    </Text>
                    <Text style={styles.cartItemSub}>
                      ${item.precio.toFixed(2)} x {item.cantidad} = ${item.subtotal.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.cartItemActions}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => actualizarCantidad(item.id, item.cantidad - 1)}
                    >
                      <Ionicons name="remove" size={16} color="#f8fafc" />
                    </Pressable>
                    <Text style={styles.qtyText}>{item.cantidad}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => actualizarCantidad(item.id, item.cantidad + 1)}
                    >
                      <Ionicons name="add" size={16} color="#f8fafc" />
                    </Pressable>
                    <Pressable style={styles.deleteBtn} onPress={() => eliminarItem(item.id)}>
                      <Ionicons name="close" size={16} color="#94a3b8" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Resumen y Botón de Cobro */}
          <View style={styles.cartSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
            </View>
            {descuento > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelDescuento}>Descuento</Text>
                <Text style={styles.summaryValueDescuento}>-${descuento.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
            </View>

            <Pressable
              style={[
                styles.cobrarBtn,
                (carrito.length === 0 || procesandoCobro) && styles.cobrarBtnDisabled,
              ]}
              disabled={carrito.length === 0 || procesandoCobro}
              onPress={() => setModalCobroVisible(true)}
            >
              <Ionicons name="cash-outline" size={22} color="#ffffff" />
              <Text style={styles.cobrarBtnText}>
                {procesandoCobro ? 'Procesando...' : `Cobrar $${total.toFixed(2)}`}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Modal de Cobro */}
      <Modal
        visible={modalCobroVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalCobroVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmar Cobro</Text>
              <Pressable onPress={() => setModalCobroVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </Pressable>
            </View>

            <View style={styles.modalTotalBox}>
              <Text style={styles.modalTotalLabel}>Monto a Cobrar</Text>
              <Text style={styles.modalTotalValue}>${total.toFixed(2)}</Text>
            </View>

            {/* Selector de Método de Pago */}
            <Text style={styles.sectionHeader}>Método de Pago</Text>
            <View style={styles.metodosGrid}>
              {(['efectivo', 'tarjeta', 'transferencia'] as MetodoPagoCaja[]).map((metodo) => {
                const activo = metodoPago === metodo;
                const icono =
                  metodo === 'efectivo'
                    ? 'cash-outline'
                    : metodo === 'tarjeta'
                      ? 'card-outline'
                      : 'swap-horizontal-outline';
                return (
                  <Pressable
                    key={metodo}
                    style={[styles.metodoBtn, activo && styles.metodoBtnActivo]}
                    onPress={() => setMetodoPago(metodo)}
                  >
                    <Ionicons name={icono} size={20} color={activo ? '#ffffff' : '#94a3b8'} />
                    <Text style={[styles.metodoText, activo && styles.metodoTextActivo]}>
                      {metodo.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Opción de Impresión (SOLO si tickets_impresion está encendido) */}
            {ticketsImpresionActivo && (
              <Pressable
                style={styles.printToggleRow}
                onPress={() => setImprimirTicket((prev) => !prev)}
              >
                <View style={styles.printToggleLeft}>
                  <Ionicons
                    name={imprimirTicket ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={imprimirTicket ? '#3b82f6' : '#64748b'}
                  />
                  <Text style={styles.printToggleLabel}>Imprimir ticket de venta</Text>
                </View>
                <Ionicons name="print-outline" size={20} color="#94a3b8" />
              </Pressable>
            )}

            {errorCobro && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{errorCobro}</Text>
              </View>
            )}

            {/* Acciones */}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setModalCobroVisible(false)}
                disabled={procesandoCobro}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, procesandoCobro && styles.confirmBtnDisabled]}
                onPress={ejecutarCobro}
                disabled={procesandoCobro}
              >
                {procesandoCobro ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                    <Text style={styles.confirmBtnText}>Confirmar</Text>
                  </>
                )}
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
    backgroundColor: '#0a0f1d',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0a0f1d',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeImpresionActiva: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  badgeImpresionDormida: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  badgeTextActivo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34d399',
  },
  badgeTextDormido: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  body: {
    flex: 1,
  },
  bodyRow: {
    flexDirection: 'row',
  },
  bodyCol: {
    flexDirection: 'column',
  },
  catalogoContainer: {
    flex: 3,
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    padding: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
  },
  categoriesBar: {
    marginVertical: 12,
    maxHeight: 40,
  },
  categoriesContent: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
  },
  categoryChipActive: {
    backgroundColor: '#2563eb',
  },
  categoryChipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  productsScroll: {
    flex: 1,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: '#111c35',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    width: '48%',
    minHeight: 85,
    justifyContent: 'space-between',
  },
  productName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  productPrice: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyProducts: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  cartContainer: {
    flex: 2,
    backgroundColor: '#0c1322',
    display: 'flex',
    flexDirection: 'column',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  cartHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartHeaderTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  cartCountBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  cartCountText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  clearCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearCartText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  cartItemsScroll: {
    flex: 1,
  },
  cartItemsContent: {
    padding: 12,
    gap: 8,
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyCartTitle: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCartSub: {
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 200,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  cartItemSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    backgroundColor: '#1e293b',
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    minWidth: 16,
    textAlign: 'center',
  },
  deleteBtn: {
    padding: 4,
  },
  cartSummary: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0a0f1d',
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  summaryValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryLabelDescuento: {
    color: '#ef4444',
    fontSize: 13,
  },
  summaryValueDescuento: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  summaryTotalRow: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  totalLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
  },
  totalValue: {
    color: '#38bdf8',
    fontSize: 22,
    fontWeight: '900',
  },
  cobrarBtn: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  cobrarBtnDisabled: {
    backgroundColor: '#1e293b',
    opacity: 0.6,
  },
  cobrarBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  modalTotalBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalTotalLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalTotalValue: {
    color: '#38bdf8',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  sectionHeader: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metodosGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metodoBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metodoBtnActivo: {
    backgroundColor: '#2563eb',
    borderColor: '#60a5fa',
  },
  metodoText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  metodoTextActivo: {
    color: '#ffffff',
  },
  printToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 10,
  },
  printToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  printToggleLabel: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  confirmBtnDisabled: {
    backgroundColor: '#1e293b',
    opacity: 0.7,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default PantallaCaja;
