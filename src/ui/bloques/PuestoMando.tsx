/**
 * Dirección visual: estación de mesero a dos paneles persistentes; la parrilla
 * de mesas conserva su territorio izquierdo y la comanda siempre vive a la derecha.
 */

import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SPACING, TYPOGRAPHY } from '../../compartido/constantes/theme';
import { useThemedColors } from '../../compartido/hooks/useThemedColors';
import { ActionArea } from './ActionArea';
import { OrderList } from './OrderList';
import { TablesGrid } from './TablesGrid';

export type MesaState = 'libre' | 'ocupada' | 'cuenta';
export type Mesa = { id: string; state: MesaState; pedidoActivoId?: string };
export type CartItem = { name: string; price: number; qty: number; productId?: string; variants?: Record<string, string[]> };
export type LiveItem = { id: string; nombre: string; precio: number; cantidad: number; estado: string; variantes?: Record<string, string[]> };

export type PuestoMandoProps = {
  mesas: Mesa[];
  mesaSeleccionada: string | null;
  itemsPendientes: CartItem[];
  itemsEnCurso: LiveItem[];
  totalPedido: number;
  loading: boolean;
  cartsLoading: boolean;
  isSending: boolean;
  isPrinting?: boolean;
  canSend: boolean;
  hasReadyItems: boolean;
  hasUndelivered: boolean;
  allItemsDelivered: boolean;
  hasPrinted: boolean;
  canMarkPaid: boolean;
  permissionToPrint: boolean;
  pendingCount: number;
  liveItemsCount: number;
  activeOrderId: string | null;
  isTotalVisible?: boolean;
  onSelectMesa: (mesaId: string | null) => void;
  onAddItem: () => void;
  onSend: () => void;
  onPrintBill: () => void;
  onRequestBill: () => void;
  onMarkPaid: () => void;
  onIncrementPending: (index: number) => void;
  onDecrementPending: (index: number) => void;
  onRemovePending: (index: number) => void;
  onMarkDelivered: (itemId: string) => void;
  getProduct: (productId: string) => any | null;
};

export function PuestoMando(props: PuestoMandoProps) {
  const {
    mesas, mesaSeleccionada, itemsPendientes, itemsEnCurso, totalPedido, loading, cartsLoading,
    isSending, isPrinting, canSend, hasUndelivered, allItemsDelivered, hasPrinted, canMarkPaid,
    permissionToPrint, onSelectMesa, onAddItem, onSend, onPrintBill, onRequestBill, onMarkPaid,
    onIncrementPending, onDecrementPending, onRemovePending, onMarkDelivered, getProduct,
    pendingCount, liveItemsCount, activeOrderId, isTotalVisible = true,
  } = props;
  const COLORS = useThemedColors();
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 860;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg.primary },
    stage: { flex: 1, flexDirection: isWideLayout ? 'row' : 'column', gap: isWideLayout ? 12 : 10, paddingBottom: 4, paddingHorizontal: isWideLayout ? 14 : 10, paddingTop: 10 },
    panel: { backgroundColor: COLORS.bg.elevated, borderColor: 'rgba(212,175,55,0.18)', borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
    gridPanel: { flex: isWideLayout ? 0.95 : 0, minHeight: isWideLayout ? undefined : 300, maxHeight: isWideLayout ? undefined : 380 },
    orderPanel: { flex: isWideLayout ? 1.15 : 1, minHeight: isWideLayout ? undefined : 360 },
    panelHeader: { alignItems: 'center', backgroundColor: COLORS.bg.secondary, borderBottomColor: 'rgba(255,255,255,0.08)', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
    panelKicker: { color: COLORS.primary, fontSize: 9, fontWeight: '800', letterSpacing: 2.2, textTransform: 'uppercase' },
    panelTitle: { color: COLORS.text.primary, fontSize: 16, fontWeight: TYPOGRAPHY.weights.black, marginTop: 2 },
    panelCount: { backgroundColor: `${COLORS.primary}18`, borderColor: `${COLORS.primary}44`, borderRadius: 12, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
    panelCountText: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },
    gridBody: { flex: 1, paddingHorizontal: 10, paddingTop: 7 },
    orderBody: { flex: 1, minHeight: 0 },
    orderLoading: { ...StyleSheet.absoluteFill, alignItems: 'center', backgroundColor: 'rgba(3,6,11,0.58)', justifyContent: 'center', zIndex: 3 },
    emptyOrder: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28 },
    emptyOrderIcon: { alignItems: 'center', backgroundColor: `${COLORS.primary}13`, borderColor: `${COLORS.primary}35`, borderRadius: 32, borderWidth: 1, height: 64, justifyContent: 'center', width: 64 },
    emptyOrderTitle: { color: COLORS.text.primary, fontSize: 17, fontWeight: '800', marginTop: 14 },
    emptyOrderText: { color: COLORS.text.secondary, fontSize: 12, lineHeight: 18, marginTop: 6, maxWidth: 230, textAlign: 'center' },
    actionDock: { backgroundColor: COLORS.bg.secondary, borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: 1 },
    loadingText: { color: COLORS.text.secondary, fontSize: 13, fontWeight: '700', marginTop: 12 },
  }), [COLORS, isWideLayout]);

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <View style={[styles.panel, styles.gridPanel]}>
          <View style={styles.panelHeader}>
            <View><Text style={styles.panelKicker}>Operación en piso</Text><Text style={styles.panelTitle}>Parrilla de mesas</Text></View>
            <View style={styles.panelCount}><Text style={styles.panelCountText}>{mesas.length} mesas</Text></View>
          </View>
          <View style={styles.gridBody}>
            {loading ? <View style={styles.emptyOrder}><ActivityIndicator color={COLORS.primary} size="large" /><Text style={styles.loadingText}>Cargando mesas…</Text></View> : <TablesGrid tables={mesas} selectedTable={mesaSeleccionada} mode={mesaSeleccionada ? 'table' : null} liveItems={itemsEnCurso} pendingCount={pendingCount} layoutOptions={{ minTileWidth: isWideLayout ? 104 : 82, tileHeight: isWideLayout ? 108 : 82, gap: 9 }} onPressTable={async (id, isFree) => { await onSelectMesa(id); if (isFree) onAddItem(); }} onSelectTakeaway={() => onSelectMesa(null)} />}
          </View>
        </View>

        <View style={[styles.panel, styles.orderPanel]}>
          <View style={styles.panelHeader}>
            <View><Text style={styles.panelKicker}>{mesaSeleccionada ? `Mesa ${mesaSeleccionada}` : 'Sin mesa seleccionada'}</Text><Text style={styles.panelTitle}>Comanda activa</Text></View>
            <View style={styles.panelCount}><Text style={styles.panelCountText}>{pendingCount + liveItemsCount} ítems</Text></View>
          </View>
          <View style={styles.orderBody}>
            {mesaSeleccionada ? <OrderList pending={itemsPendientes} liveItems={itemsEnCurso} getProduct={getProduct} onIncPending={onIncrementPending} onDecPending={onDecrementPending} onRemovePending={onRemovePending} onMarkDelivered={onMarkDelivered} /> : <View style={styles.emptyOrder}><View style={styles.emptyOrderIcon}><Text style={{ color: COLORS.primary, fontSize: 26 }}>+</Text></View><Text style={styles.emptyOrderTitle}>Selecciona una mesa</Text><Text style={styles.emptyOrderText}>La comanda se mantiene aquí mientras agregas productos desde la parrilla lateral.</Text></View>}
            {cartsLoading && <View style={styles.orderLoading}><ActivityIndicator color={COLORS.primary} size="large" /></View>}
          </View>
          <View style={styles.actionDock}>
            <ActionArea total={totalPedido} pendingCount={pendingCount} liveItemsCount={liveItemsCount} mode={mesaSeleccionada ? 'table' : null} activeOrderId={activeOrderId} hasUndelivered={hasUndelivered} allItemsDelivered={allItemsDelivered} hasPrinted={hasPrinted} canMarkPaid={canMarkPaid} isCollapsed={!isTotalVisible} isPrinting={isPrinting} isSending={isSending} canSend={canSend} permissionToPrint={permissionToPrint} onAdd={onAddItem} onSend={onSend} onPrintBill={onPrintBill} onBill={onRequestBill} onPaid={onMarkPaid} />
          </View>
        </View>
      </View>
    </View>
  );
}
