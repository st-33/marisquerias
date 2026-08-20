import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { hardwareService } from '../../plataforma/core/services/HardwareService';
import { useMostradorPro } from '../../capacidades/pos/useMostradorPro';

// --- COMPONENTES AUXILIARES ---

function Keypad({
  onConfirm,
  onCancel,
}: {
  onConfirm: (val: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');

  const handlePress = (char: string) => {
    if (char === 'DEL') setValue((prev) => prev.slice(0, -1));
    else if (char === 'CLR') setValue('');
    else if (char === '.' && value.includes('.')) return;
    else setValue((prev) => prev + char);
  };

  return (
    <View style={styles.keypadContainer}>
      <Text style={styles.weightLabel}>INGRESO MANUAL (KG)</Text>
      <View style={styles.keypadDisplay}>
        <Text style={styles.keypadValue}>{value || '0.000'}</Text>
        <Text style={styles.keypadUnit}>kg</Text>
      </View>
      <View style={styles.keypadGrid}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((char) => (
          <Pressable key={char} style={styles.key} onPress={() => handlePress(char)}>
            {char === 'DEL' ? (
              <Ionicons name="backspace" size={24} color="white" />
            ) : (
              <Text style={styles.keyText}>{char}</Text>
            )}
          </Pressable>
        ))}
      </View>
      <View style={styles.shortcutRow}>
        {[0.25, 0.5, 1.0].map((val) => (
          <Pressable key={val} style={styles.keyShortcut} onPress={() => setValue(val.toFixed(3))}>
            <Text style={styles.keyShortcutText}>{val.toFixed(3)} kg</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.keypadActions}>
        <Pressable style={styles.keyCancel} onPress={onCancel}>
          <Text style={styles.keyActionText}>CERRAR</Text>
        </Pressable>
        <Pressable
          style={styles.keyConfirm}
          onPress={() => {
            const num = parseFloat(value);
            if (!isNaN(num) && num > 0) onConfirm(num);
          }}
        >
          <Text style={styles.keyActionText}>CONFIRMAR</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function MostradorPro() {
  const { width } = useWindowDimensions();
  const isLarge = width > 900;

  const {
    loading,
    productos,
    categorias,
    carrito,
    total,
    efectivo,
    setEfectivo,
    cambio,
    isHubOnline,
    actions,
    isBasculaEnabled,
  } = useMostradorPro();

  const [search, setSearch] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [weight, setWeight] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showCart, setShowCart] = useState(false); // 🔥 Mobile toggle
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Lectura de Báscula en Tiempo Real ---
  useEffect(() => {
    if (!selectedProduct || selectedProduct.unidad !== 'kg' || showKeypad || !isBasculaEnabled) {
      return;
    }
    const timer = setInterval(async () => {
      const res = await hardwareService.leerPeso();
      if (res.success) {
        setWeight(res.peso || 0);
      }
    }, 300);
    return () => clearInterval(timer);
  }, [selectedProduct, showKeypad, isBasculaEnabled]);

  const handleProductPress = (item: any) => {
    if (item.unidad === 'kg') {
      setSelectedProduct(item);
      setWeight(0);
      // Si la flag de bascula esta apagada o fisica no responde, forzar keypad
      if (!isBasculaEnabled || !hardwareService.hasScale()) {
        setShowKeypad(true);
      }
    } else {
      actions.agregarAlCarrito(item, 1);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.layoutWrapper}>
        {/* 🛒 PANEL IZQUIERDO: CATÁLOGO */}
        <View style={styles.leftPanel}>
          {/* Header con Info & Status */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>VENTA Y CRUDO</Text>
              <Text style={styles.subtitle}>SISTEMA DE DESPACHO PROFESIONAL</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
              {/* Hub Status */}
              <View
                style={[
                  styles.hubBadge,
                  {
                    backgroundColor: isHubOnline
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(239, 68, 68, 0.1)',
                  },
                ]}
              >
                <View
                  style={[styles.hubDot, { backgroundColor: isHubOnline ? '#10b981' : '#ef4444' }]}
                />
                <Text style={[styles.hubText, { color: isHubOnline ? '#10b981' : '#ef4444' }]}>
                  {isHubOnline ? 'HUB ONLINE' : 'HUB OFFLINE'}
                </Text>
              </View>
              {/* Area Badge */}
              {/* Area Badge REMOVED - Inventory Purged */}
              {/* Cierre */}
              <Pressable
                style={styles.closeBoxBtn}
                onPress={() => Alert.alert('Corte X', 'Generando reporte de turno...')}
              >
                <Ionicons name="stats-chart" size={18} color="#ef4444" />
              </Pressable>
            </View>
          </View>

          {/* Buscador & Categorías */}
          <View style={styles.searchWrapper}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                placeholder="Escribe el nombre del producto..."
                placeholderTextColor="#64748b"
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>

          <View style={styles.categoryContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              <Pressable
                key="todo-cat"
                style={[styles.catItem, !selectedCatId && styles.catItemActive]}
                onPress={() => setSelectedCatId(null)}
              >
                <Text style={[styles.catText, !selectedCatId && styles.catTextActive]}>TODO</Text>
              </Pressable>
              {categorias.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[styles.catItem, selectedCatId === cat.id && styles.catItemActive]}
                  onPress={() => setSelectedCatId(cat.id)}
                >
                  <Text style={[styles.catText, selectedCatId === cat.id && styles.catTextActive]}>
                    {cat.nombre.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Grid de Productos */}
          <FlatList
            data={productos.filter((p) => {
              const matchesSearch = p.nombre.toLowerCase().includes(search.toLowerCase());
              const matchesCat = !selectedCatId || p.categoriaId === selectedCatId;
              return matchesSearch && matchesCat;
            })}
            keyExtractor={(item) => item.id}
            numColumns={2} // 🔥 Siempre 2 columnas para el carnal
            contentContainerStyle={styles.gridContent}
            renderItem={({ item, index }) => {
              return (
                <Animated.View
                  entering={FadeInDown.delay(Math.min(index * 30, 300))
                    .duration(400)
                    .springify()}
                  style={{ flex: 1 }}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.productCard,
                      pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 },
                    ]}
                    onPress={() => handleProductPress(item)}
                  >
                    <View
                      style={[
                        styles.unitBadge,
                        { backgroundColor: item.unidad === 'kg' ? '#3b82f6' : '#10b981' },
                      ]}
                    >
                      <Text style={styles.unitText}>{item.unidad === 'kg' ? 'KG' : 'PZA'}</Text>
                    </View>
                    <View style={{ height: 20 }} />
                    <Text style={styles.pName} numberOfLines={2}>
                      {item.nombre}
                    </Text>
                    <Text style={styles.pPrice}>${item.precio}</Text>
                  </Pressable>
                </Animated.View>
              );
            }}
          />
        </View>

        {/* 💳 PANEL DERECHO: CAJA / TICKET (Responsive) */}
        {(isLarge || showCart) && (
          <View style={[styles.rightPanel, !isLarge && StyleSheet.absoluteFill]}>
            <View style={styles.cashierHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={styles.cashierTitle}>DETALLE DE CAJA</Text>
                <Pressable
                  onPress={async () => {
                    try {
                      const res = await actions.reimprimirUltimoTicket();
                      if (res.success) {
                        Alert.alert('🖨️', 'Reimpresión enviada al Hub');
                      } else {
                        Alert.alert('Error', res.error || 'Fallo reimpresión');
                      }
                    } catch (e: any) {
                      Alert.alert('Error', e.message || 'Fallo reimpresión');
                    }
                  }}
                  style={({ pressed }) => [{ marginLeft: 4, opacity: pressed ? 0.5 : 1 }]}
                >
                  <Ionicons name="print-outline" size={20} color="#60a5fa" />
                </Pressable>
              </View>
              {!isLarge && (
                <Pressable onPress={() => setShowCart(false)}>
                  <Ionicons name="close-circle" size={32} color="white" />
                </Pressable>
              )}
            </View>

            {/* Visor de Pesaje Live (Si hay producto kg seleccionado) */}
            {selectedProduct && (
              <View style={styles.neonVisor}>
                <Text style={styles.weightLabel}>{selectedProduct.nombre.toUpperCase()}</Text>
                <Pressable onPress={() => setShowKeypad(true)}>
                  <Text style={styles.weightValue}>
                    {weight.toFixed(3)}
                    <Text style={{ fontSize: 24, color: '#06b6d4' }}> KG</Text>
                  </Text>
                </Pressable>
                <View style={styles.keypadActions}>
                  <Pressable style={styles.keyCancel} onPress={() => setSelectedProduct(null)}>
                    <Text style={styles.keyActionText}>CANCELAR</Text>
                  </Pressable>
                  <Pressable
                    style={styles.keyConfirm}
                    onPress={() => {
                      actions.agregarAlCarrito(selectedProduct, weight);
                      setSelectedProduct(null);
                    }}
                    disabled={weight <= 0}
                  >
                    <Text style={styles.keyActionText}>AGREGAR</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Simulación de Ticket */}
            <View style={styles.ticketContainer}>
              <Text style={styles.ticketTitle}>*** TICKET DE VENTA ***</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {carrito.map((item, idx) => (
                  <View key={item.id}>
                    <View style={styles.ticketItem}>
                      <View style={styles.ticketItemMain}>
                        <Text style={styles.ticketPName}>{item.nombre}</Text>
                        <Text style={styles.ticketPDesc}>
                          {item.cantidad}
                          {item.unidad} x ${item.precio}
                        </Text>
                      </View>
                      <View
                        style={{ alignItems: 'flex-end', justifyContent: 'center', marginLeft: 10 }}
                      >
                        <Text style={styles.ticketPPrice}>${item.subtotal.toFixed(0)}</Text>
                        <Pressable onPress={() => actions.eliminarItem(item.id)}>
                          <Ionicons name="trash-outline" size={14} color="#ef4444" />
                        </Pressable>
                      </View>
                    </View>
                    {idx < carrito.length - 1 && <View style={styles.ticketDivider} />}
                  </View>
                ))}
                {carrito.length === 0 && (
                  <View style={{ alignItems: 'center', paddingVertical: 40, opacity: 0.3 }}>
                    <Ionicons name="receipt-outline" size={48} color="#1e293b" />
                    <Text style={{ color: '#1e293b', fontWeight: 'bold' }}>CARRO VACÍO</Text>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Footer de Pago */}
            <View style={styles.cajaFooter}>
              <View style={styles.totalMain}>
                <Text style={styles.totalText}>EFECTIVO / TOTAL</Text>
                <Text style={styles.totalAmount}>${total.toFixed(0)}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.payBtn,
                  carrito.length === 0 && { opacity: 0.5 },
                  pressed && { transform: [{ scale: 0.97 }] },
                ]}
                onPress={() => setShowCheckout(true)}
                disabled={carrito.length === 0}
              >
                <Ionicons name="print-outline" size={24} color="white" />
                <Text style={styles.payBtnText}>COBRAR E IMPRIMIR</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Toggle Carrito Móvil */}
      {!isLarge && !showCart && (
        <Pressable style={styles.mobileCartToggle} onPress={() => setShowCart(true)}>
          <Ionicons name="receipt" size={28} color="white" />
          {carrito.length > 0 && (
            <View
              style={{
                position: 'absolute',
                top: -5,
                right: -5,
                backgroundColor: '#ef4444',
                borderRadius: 10,
                width: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                {carrito.length}
              </Text>
            </View>
          )}
        </Pressable>
      )}

      {/* MODAL TECLADO MANUAL */}
      <Modal visible={showKeypad} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Keypad
            onConfirm={(val) => {
              setWeight(val);
              setShowKeypad(false);
            }}
            onCancel={() => {
              setShowKeypad(false);
            }}
          />
        </View>
      </Modal>

      {/* MODAL COBRO */}
      <Modal visible={showCheckout} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.keypadContainer}>
            <Text style={styles.weightLabel}>TOTAL A PAGAR</Text>
            <Text style={[styles.totalAmount, { textAlign: 'center', marginBottom: 20 }]}>
              ${total.toFixed(0)}
            </Text>

            <View style={styles.calcRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.calcLabel}>RECIBIDO ($)</Text>
                <TextInput
                  style={styles.calcInput}
                  placeholder="0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={efectivo}
                  onChangeText={setEfectivo}
                  autoFocus
                />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.calcLabel}>CAMBIO ($)</Text>
                <Text style={[styles.cambioText, cambio > 0 && { color: '#fbbf24' }]}>
                  ${cambio.toFixed(0)}
                </Text>
              </View>
            </View>

            <View style={styles.quickCashRow}>
              <Pressable
                style={[styles.quickCashBtn, { backgroundColor: '#1e293b' }]}
                onPress={() => setEfectivo(total.toString())}
              >
                <Text style={[styles.quickCashText, { color: '#3b82f6' }]}>EXACTO</Text>
              </Pressable>
              {[50, 100, 200, 500].map((val) => (
                <Pressable
                  key={val}
                  style={styles.quickCashBtn}
                  onPress={() => setEfectivo(val.toString())}
                >
                  <Text style={styles.quickCashText}>${val}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.keypadActions}>
              <Pressable
                onPress={() => {
                  setShowCheckout(false);
                  setEfectivo('');
                }}
                style={({ pressed }) => [
                  styles.keyCancel,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Text style={styles.keyActionText}>CANCELAR</Text>
              </Pressable>
              <Pressable
                disabled={isProcessing}
                onPress={async () => {
                  setIsProcessing(true);
                  try {
                    const res = await actions.completarVenta('efectivo');
                    setShowCheckout(false);
                    setShowCart(false);
                    setEfectivo('');

                    if (res && res.success) {
                      if (res.offline) {
                        if (Platform.OS !== 'web') {
                          const msg =
                            res.method === 'bluetooth'
                              ? '✅ Impreso vía Bluetooth'
                              : '📦 En cola (sin conexión)';
                          Alert.alert('Modo Offline', msg);
                        }
                      } else {
                        if (Platform.OS === 'web') {
                          Alert.alert('🖨️', 'Enviado al Hub');
                        }
                      }
                    }
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                style={({ pressed }) => [
                  styles.keyConfirm,
                  (pressed || isProcessing) && { opacity: 0.7, transform: [{ scale: 0.98 }] },
                  isProcessing && { backgroundColor: '#065f46' },
                ]}
              >
                {isProcessing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.keyActionText}>FINALIZAR</Text>
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
    backgroundColor: '#020617', // Deep Navy
  },
  layoutWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },

  // --- PANEL IZQUIERDO (MENU) ---
  leftPanel: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  posTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // --- SEARCH & CATS ---
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 14,
    paddingHorizontal: 15,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  searchInput: {
    flex: 1,
    color: 'white',
    marginLeft: 10,
    fontSize: 15,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  catItemActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  catText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  catTextActive: {
    color: 'white',
  },

  // --- PRODUCT GRID ---
  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  productCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 20,
    padding: 16,
    margin: 8,
    minHeight: 160,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  pName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 40,
  },
  pPrice: {
    color: '#3b82f6',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  unitBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unitText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
  },
  stockBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  stockText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // --- PANEL DERECHO (CAJA / TICKET) ---
  rightPanel: {
    width: 400,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(51, 65, 85, 0.5)',
    padding: 24,
  },
  cashierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cashierTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // TICKET VIEW
  ticketContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    // Diente de sierra simulado o borde
    borderStyle: 'dashed',
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
  },
  ticketTitle: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  ticketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ticketItemMain: {
    flex: 1,
  },
  ticketPName: {
    color: '#0f172a',
    fontSize: 18, // 🔥 +40% Tamaño para el carnal
    fontWeight: '700',
  },
  ticketPDesc: {
    color: '#64748b',
    fontSize: 14,
  },
  ticketPPrice: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  ticketDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 15,
    borderStyle: 'dashed',
    borderRadius: 1,
  },

  // --- CAJA FOOTER ---
  cajaFooter: {
    marginTop: 20,
  },
  totalMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  totalText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  totalAmount: {
    color: 'white',
    fontSize: 48,
    fontWeight: '900',
  },
  payBtn: {
    backgroundColor: '#10b981',
    height: 70,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  payBtnText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // --- NEON VISOR (PESO) ---
  neonVisor: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: '#06b6d4',
    marginBottom: 20,
    shadowColor: '#06b6d4',
    shadowRadius: 20,
    shadowOpacity: 0.4,
  },
  weightLabel: {
    color: '#06b6d4',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  weightValue: {
    color: 'white',
    fontSize: 64,
    fontWeight: '900',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // --- MODALS (KEYPAD & CHECKOUT) ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keypadContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1e293b',
    borderRadius: 30,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 1)',
  },
  keypadDisplay: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 30,
  },
  keypadValue: {
    color: 'white',
    fontSize: 42,
    fontWeight: '900',
  },
  keypadUnit: {
    color: '#3b82f6',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 10,
    marginTop: 10,
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    justifyContent: 'center',
  },
  key: {
    width: 80,
    height: 70,
    backgroundColor: '#334155',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
  },
  shortcutRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  keyShortcut: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  keyShortcutText: {
    color: '#60a5fa',
    fontWeight: '700',
  },
  keypadActions: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 30,
  },
  keyConfirm: {
    flex: 2,
    backgroundColor: '#10b981',
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyCancel: {
    flex: 1,
    backgroundColor: '#475569',
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyActionText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
  },

  // --- RESPONSIVE MOBILE TWEAKS ---
  mobileCartToggle: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowRadius: 15,
    shadowOpacity: 0.5,
    elevation: 10,
  },

  // STATUS BADGES
  hubBadge: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignItems: 'center',
    gap: 6,
  },
  hubDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hubText: {
    fontSize: 10,
    fontWeight: '900',
  },

  // UTILS
  areaBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  areaBadgeText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '800',
  },
  closeBoxBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- CALCULADORA DE CAMBIO ---
  calcRow: {
    flexDirection: 'row',
    gap: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  calcLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
  },
  calcInput: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    padding: 0,
  },
  cambioText: {
    color: '#64748b',
    fontSize: 32,
    fontWeight: '900',
  },
  quickCashRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  quickCashBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#334155',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCashText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
});
