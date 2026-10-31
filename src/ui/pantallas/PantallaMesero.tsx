/**
 * 🍽️ MESERO SCREEN (FOH - Front of House)
 * Componente visual puro para alimentos y bebidas
 */

import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StatusBar, Text, View } from 'react-native';
import { NotificacionToast as NotificationToast } from '../../compartido/componentes/NotificacionAvisoEmergente';
import { useModoInmersivo as useImmersiveMode } from '../../sistema/navegacion/ModoInmersivo';
import { useStore, useNegocioNombre, useNegocioId } from '../../sistema/store';
import { useFierros } from '../../sistema/impresion/fierros';
import { useEscuchaEstadoPartida as useItemStatusListener } from '../../compartido/hooks/useEscuchaEstadoPartida';
import { useNotificaciones as useNotifications } from '../../compartido/hooks/useNotificaciones';
import { logger } from '../../sistema/monitoreo';

import { useOcultarTotal } from '../../capacidades/mesero/useOcultarTotal';
import { BluetoothPrinterModal, ProductPickerOverlay, PuestoMando, ModalVariantes } from '..';
import {
  useLogicaMesero,
  useSelectorProductos,
  useSelectorVariantes,
} from '../../roles/logica/mesero';

function MeseroScreenContent() {
  const negocioNombre = useNegocioNombre();
  const negocioId = useNegocioId();
  // 🖨️ Conexión con el proveedor canónico de fierros
  const { estaConectado, dispositivoActivo } = useFierros();
  const [showPrinterModal, setShowPrinterModal] = useState(false);

  // Helper para garantizar conexión (compatible con useMeseroLogic)
  const ensureConnection = useCallback(async (): Promise<boolean> => {
    if (estaConectado && dispositivoActivo) {
      return true;
    }
    setShowPrinterModal(true);
    return false;
  }, [estaConectado, dispositivoActivo]);

  // Wrapper para cerrar modal
  const closeModal = useCallback(() => setShowPrinterModal(false), []);
  const defaultPrinter = dispositivoActivo;

  // Modo inmersivo: ocultar status bar y navigation bar
  useImmersiveMode(true);

  // 🔔 Sistema de notificaciones
  const { notify } = useNotifications();
  const [toastData, setToastData] = useState<{ message: string; subtitle: string } | null>(null);

  // 👂 Escuchar items listos de CUALQUIER mesa
  useItemStatusListener({
    enabled: true,
    onItemReady: useCallback(
      ({ mesaId, itemName }) => {
        logger.debug('[MeseroScreen.tsx]', '🔔 Item listo', { mesaId, itemName });

        const result = notify({ type: 'item_listo', mesaId, itemName }, 'mesero');
        if (result.showToast) {
          setToastData({
            message: result.message || '',
            subtitle: result.subtitle || '',
          });
        }
      },
      [notify]
    ),
  });

  // 🧠 LÓGICA DE NEGOCIO (hook puro)
  const {
    tables,
    selectedTable,
    activePendingItems,
    liveItems,
    loading,
    cartsLoading,
    isSending,
    isPrinting,
    canSend,
    hasReadyItems,
    hasUndelivered,
    allItemsDelivered,
    hasPrinted,
    canMarkPaid,
    totalOrder,
    activeSubpedidoId,
    permitirMeseraImprimirCuenta,
    selectTable,
    addPendingItem,
    removePendingItem,
    incrementPendingItem,
    decrementPendingItem,
    sendOrderWithValidation,
    requestBill,
    printBillWithConnectionCheck,
    markAsPaid,
    markAsDelivered,
    pedidoActivo,
    logisticaHabilitada,
    solicitandoEntrega,
    solicitarEntrega,
  } = useLogicaMesero({
    ensureConnection,
    onPrintBill: useCallback(
      (mesaId: string) => {
        logger.debug('[MeseroScreen.tsx]', '🔔 Ticket impreso', mesaId);
        notify({ type: 'ticket_impreso', mesaId }, 'mesero');
      },
      [notify]
    ),
    onFreeMesa: useCallback(
      (mesaId: string) => {
        logger.debug('[MeseroScreen.tsx]', '🔔 Mesa liberada', mesaId);
        notify({ type: 'mesa_liberada', mesaId }, 'mesero');
      },
      [notify]
    ),
  });

  const {
    products,
    categories,
    selectedCategory,
    loading: menuLoading,
    selectCategory,
    getProduct,
    getProductAsync,
  } = useSelectorProductos();

  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showVariantsModal, setShowVariantsModal] = useState(false);

  const {
    selectedProduct,
    variantSelections,
    startSelection,
    toggleOption,
    confirmSelection,
    cancelSelection,
  } = useSelectorVariantes({ getProduct, getProductAsync });

  const handleSend = useCallback(async () => {
    const result = await sendOrderWithValidation(activeSubpedidoId);
    if (result?.success === false && result.error) {
      Alert.alert('No se pudo enviar', result.error);
    }
    return result;
  }, [sendOrderWithValidation, activeSubpedidoId]);

  const handlePrintBill = useCallback(async () => {
    const result = await printBillWithConnectionCheck(hasPrinted);
    if (result && !result.success) {
      if (!result.requiresConnection) {
        const errorMsg = result.error || result.message || 'Error desconocido';
        Alert.alert('Error al imprimir', errorMsg);
      }
    }
  }, [printBillWithConnectionCheck, hasPrinted]);

  const handleRequestDelivery = useCallback(async () => {
    const result = await solicitarEntrega();
    if (result && result.success === false && result.error) {
      Alert.alert('No se pudo solicitar la entrega', result.error);
    }
    return result;
  }, [solicitarEntrega]);

  const handleMarkDelivered = useCallback(
    async (itemId: string) => {
      const result = await markAsDelivered(itemId);
      if (result && result.success === false && result.error) {
        Alert.alert('No se pudo entregar', result.error);
      }
      return result;
    },
    [markAsDelivered]
  );

  const handlePrinterConnected = useCallback(() => {
    logger.debug('[MeseroScreen.tsx]', '✅ Impresora conectada, cerrando modal');
    closeModal();
  }, [closeModal]);

  const handlePrinterCancel = useCallback(() => {
    logger.debug('[MeseroScreen.tsx]', '❌ Usuario canceló conexión');
    closeModal();
  }, [closeModal]);

  const handleAddItem = useCallback(() => {
    setShowProductPicker(true);
  }, []);

  const handleCloseProductPicker = useCallback(() => {
    setShowProductPicker(false);
  }, []);

  const handleSelectProduct = useCallback(
    async (productId: string) => {
      const { requiresVariants, pendingItem } = await startSelection(productId);

      if (requiresVariants) {
        setShowVariantsModal(true);
      } else if (pendingItem) {
        addPendingItem(pendingItem, activeSubpedidoId);
      }
      setShowProductPicker(false);
    },
    [startSelection, addPendingItem, activeSubpedidoId]
  );

  const handleConfirmVariants = useCallback(() => {
    const item = confirmSelection();
    if (item) {
      addPendingItem(item, activeSubpedidoId);
    }
    setShowVariantsModal(false);
  }, [confirmSelection, addPendingItem, activeSubpedidoId]);

  const handleCancelVariants = useCallback(() => {
    cancelSelection();
    setShowVariantsModal(false);
    setShowProductPicker(true);
  }, [cancelSelection]);

  const isTotalVisible = useOcultarTotal({
    mesaSeleccionada: selectedTable,
    pendingCount: activePendingItems.length,
    liveItemsCount: liveItems.length,
  });

  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#0f172a' }}>
      <StatusBar barStyle="light-content" />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: '#111827',
          borderBottomWidth: 1,
          borderBottomColor: '#1f2937',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 16 }}>🍽️</Text>
          <View>
            <Text style={{ color: '#f9fafb', fontSize: 14, fontWeight: '800' }}>
              Mesero / Salón
            </Text>
            <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '600' }}>
              {negocioNombre}{negocioId ? ` · ${negocioId}` : ''}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setShowPrinterModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: estaConectado
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(107, 114, 128, 0.15)',
            borderWidth: 1,
            borderColor: estaConectado
              ? 'rgba(16, 185, 129, 0.3)'
              : 'rgba(107, 114, 128, 0.3)',
          }}
        >
          <Text
            style={{
              color: estaConectado ? '#34d399' : '#9ca3af',
              fontSize: 11,
              fontWeight: '700',
            }}
          >
            {estaConectado ? '🖨️ Conectada' : '🖨️ Sin impresora'}
          </Text>
        </Pressable>
      </View>
      <PuestoMando
        mesas={tables}
        mesaSeleccionada={selectedTable}
        itemsPendientes={activePendingItems}
        itemsEnCurso={liveItems}
        totalPedido={totalOrder}
        loading={loading}
        cartsLoading={cartsLoading || menuLoading}
        isSending={isSending}
        isPrinting={isPrinting}
        canSend={canSend}
        hasReadyItems={hasReadyItems}
        hasUndelivered={hasUndelivered}
        allItemsDelivered={allItemsDelivered}
        hasPrinted={hasPrinted}
        canMarkPaid={canMarkPaid}
        permissionToPrint={permitirMeseraImprimirCuenta}
        pendingCount={activePendingItems.length}
        liveItemsCount={liveItems.length}
        activeOrderId={selectedTable}
        pedidoActivo={pedidoActivo}
        logisticaHabilitada={logisticaHabilitada}
        solicitandoEntrega={solicitandoEntrega}
        onRequestDelivery={logisticaHabilitada ? handleRequestDelivery : undefined}
        isTotalVisible={isTotalVisible}
        onSelectMesa={selectTable}
        onAddItem={handleAddItem}
        onSend={handleSend}
        onPrintBill={handlePrintBill}
        onRequestBill={requestBill}
        onMarkPaid={markAsPaid}
        onIncrementPending={(index) => incrementPendingItem(index, activeSubpedidoId)}
        onDecrementPending={(index) => decrementPendingItem(index, activeSubpedidoId)}
        onRemovePending={(index) => removePendingItem(index, activeSubpedidoId)}
        onMarkDelivered={handleMarkDelivered}
        getProduct={getProduct}
      />

      {toastData && (
        <NotificationToast
          message={toastData.message}
          subtitle={toastData.subtitle}
          duration={2000}
          onDismiss={() => setToastData(null)}
        />
      )}

      {showProductPicker && (
        <ProductPickerOverlay
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={selectCategory}
          productsInCategory={products}
          onOpenVariant={handleSelectProduct}
          onClose={handleCloseProductPicker}
        />
      )}

      {showVariantsModal && selectedProduct && (
        <ModalVariantes
          product={selectedProduct}
          variantSelections={variantSelections}
          toggleOption={toggleOption}
          onConfirm={handleConfirmVariants}
          onClose={handleCancelVariants}
        />
      )}

      <BluetoothPrinterModal
        visible={showPrinterModal}
        defaultPrinter={defaultPrinter}
        onConnected={handlePrinterConnected}
        onCancel={handlePrinterCancel}
      />
    </View>
  );
}

export function PantallaMesero() {
  const rutaNegocio = useStore((s) => s.sesion.rutaNegocio) || '';
  return <MeseroScreenContent key={rutaNegocio || 'no-negocio'} />;
}

export default PantallaMesero;
export const MeseroScreen = PantallaMesero;
