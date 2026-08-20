/**
 * 🍽️ MESERO SCREEN (FOH - Front of House)
 * Componente visual puro para alimentos y bebidas
 */

import { useCallback, useMemo, useState } from 'react';
import { Alert, StatusBar, View } from 'react-native';
import { NotificationToast } from '../../compartido/componentes/NotificationToast';
import { getRtdb } from '../../plataforma/core/firebase';
import { useImmersiveMode } from '../../plataforma/core/navigation/ImmersiveMode';
import { useStore } from '../../plataforma/core/store';
import { useHardware } from '../../compartido/hooks/useHardware';
import { useItemStatusListener } from '../../compartido/hooks/useItemStatusListener';
import { useNotifications } from '../../compartido/hooks/useNotifications';
import { logger } from '../../compartido/utils/logger';
import { useTotalAutoHide } from '../../capacidades/mesero/useTotalAutoHide';
import {
  BluetoothPrinterModal,
  ProductPickerOverlay,
  PuestoMando,
  VariantsModal,
} from '..';
import {
  useMeseroLogic,
  useProductSelector,
  useVariantSelector,
} from '../../roles/logica/mesero';

function MeseroScreenContent() {
  const tenantPath = useStore((s) => s.sesion.tenantPath) || '';
  const tenantId = useStore((s) => s.sesion.tenantId) || '';
  const access_code = useStore((s) => s.sesion.access_code) || '';
  const ds = useStore((s) => s.dataSources);
  const db = useMemo(() => getRtdb(ds?.operacionUrl || undefined), [ds]);

  // 🖨️ Conexión con HardwareProvider (Centralizado)
  const { isConnected, connectedDevice } = useHardware();
  const [showPrinterModal, setShowPrinterModal] = useState(false);

  // Helper para garantizar conexión (compatible con useMeseroLogic)
  const ensureConnection = useCallback(async (): Promise<boolean> => {
    if (isConnected && connectedDevice) {
      return true;
    }
    setShowPrinterModal(true);
    return false;
  }, [isConnected, connectedDevice]);

  // Wrapper para cerrar modal
  const closeModal = useCallback(() => setShowPrinterModal(false), []);
  const defaultPrinter = connectedDevice;

  // Modo inmersivo: ocultar status bar y navigation bar
  useImmersiveMode(true);

  // 🔔 Sistema de notificaciones
  const { notify } = useNotifications();
  const [toastData, setToastData] = useState<{ message: string; subtitle: string } | null>(null);

  // 👂 Escuchar items listos de CUALQUIER mesa
  useItemStatusListener({
    db,
    tenantPath,
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
  } = useMeseroLogic({
    db,
    tenantPath,
    accessCode: access_code,
    tenantId,
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
  } = useProductSelector();

  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showVariantsModal, setShowVariantsModal] = useState(false);

  const {
    selectedProduct,
    variantSelections,
    startSelection,
    toggleOption,
    confirmSelection,
    cancelSelection,
  } = useVariantSelector({ getProduct, getProductAsync });

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

  const isTotalVisible = useTotalAutoHide({
    mesaSeleccionada: selectedTable,
    pendingCount: activePendingItems.length,
    liveItemsCount: liveItems.length,
  });

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
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
        <VariantsModal
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

export function MeseroScreen() {
  const tenantPath = useStore((s) => s.sesion.tenantPath) || '';
  return <MeseroScreenContent key={tenantPath || 'no-tenant'} />;
}

export default MeseroScreen;
