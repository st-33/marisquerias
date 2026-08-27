import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SPACING, TYPOGRAPHY } from '../../compartido/constantes/theme';
import { useThemedColors } from '../../compartido/hooks/useThemedColors';
import { ActionArea } from './ActionArea';
import { OrderList } from './OrderList';
import { TablesGrid } from './TablesGrid';
import {
  etiquetaEstadoLogistico,
  pedidoRequiereLogistica,
  type LogisticaPedido,
} from '../../logica/dominio/logistica';

export type MesaState = 'libre' | 'ocupada' | 'cuenta';

export type Mesa = {
  id: string;
  state: MesaState;
  pedidoActivoId?: string;
};

export type CartItem = {
  name: string;
  price: number;
  qty: number;
  productId?: string;
  variants?: Record<string, string[]>;
};

export type LiveItem = {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  estado: string;
  variantes?: Record<string, string[]>;
};

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
  pedidoActivo?: {
    tipo?: string;
    modalidad?: string;
    logistica?: Partial<LogisticaPedido> | null;
  } | null;
  logisticaHabilitada?: boolean;
  solicitandoEntrega?: boolean;
  onRequestDelivery?: () => void;
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

// Estilos estáticos (spacing, radius, typography)
const staticStyles = StyleSheet.create({
  layout: {
    flex: 1,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  orderContent: {
    flex: 1,
  },
  orderLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
});

export function PuestoMando(props: PuestoMandoProps) {
  const {
    mesas,
    mesaSeleccionada,
    itemsPendientes,
    itemsEnCurso,
    totalPedido,
    loading,
    cartsLoading,
    isSending,
    isPrinting,
    canSend,
    hasUndelivered,
    allItemsDelivered,
    hasPrinted,
    canMarkPaid,
    permissionToPrint,
    onSelectMesa,
    onAddItem,
    onSend,
    onPrintBill,
    onRequestBill,
    onMarkPaid,
    onIncrementPending,
    onDecrementPending,
    onRemovePending,
    onMarkDelivered,
    getProduct,
    pendingCount,
    liveItemsCount,
    activeOrderId,
    pedidoActivo,
    logisticaHabilitada = false,
    solicitandoEntrega = false,
    onRequestDelivery,
    isTotalVisible = true,
  } = props;

  // 🎨 COLORES DINÁMICOS según tema activo
  const COLORS = useThemedColors();
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 900;

  // Estilos que dependen del tema
  const themedStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: COLORS.bg.primary,
        },
        gridWrapper: {
          flex: 3,
          backgroundColor: 'transparent',
          overflow: 'hidden',
        },
        orderWrapper: {
          flex: isWideLayout ? 7 : 1,
          backgroundColor: 'transparent',
          overflow: 'hidden',
        },
        headerTitle: {
          color: COLORS.text.primary,
          fontSize: TYPOGRAPHY.sizes.xl,
          fontWeight: TYPOGRAPHY.weights.black,
        },
        emptyText: {
          color: COLORS.text.secondary,
          fontSize: TYPOGRAPHY.sizes.lg,
          fontWeight: TYPOGRAPHY.weights.bold,
          textAlign: 'center',
        },
      }),
    [COLORS, isWideLayout]
  );

  // Total auto hide recibido por props
  const isTotalVisibleState = isTotalVisible;

  const showGridLoading = loading;
  const showOrderLoading = cartsLoading;

  return (
    <View style={themedStyles.container}>
      <View style={[staticStyles.layout, { flexDirection: isWideLayout ? 'row' : 'column' }]}>
        <View
          style={[
            themedStyles.gridWrapper,
            !isWideLayout && { flex: 0, minHeight: 252, maxHeight: 320 },
          ]}
        >
          {showGridLoading ? (
            <View style={staticStyles.emptyState}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={themedStyles.emptyText}>Cargando mesas…</Text>
            </View>
          ) : (
            <TablesGrid
              tables={mesas}
              selectedTable={mesaSeleccionada}
              mode={mesaSeleccionada ? 'table' : null}
              liveItems={itemsEnCurso}
              pendingCount={pendingCount}
              onPressTable={async (id, isFree) => {
                await onSelectMesa(id);
                if (isFree) {
                  onAddItem();
                }
              }}
              onSelectTakeaway={() => onSelectMesa(null)}
            />
          )}
        </View>

        <View style={themedStyles.orderWrapper}>
          <View style={staticStyles.orderContent}>
            {pedidoActivo && pedidoRequiereLogistica(pedidoActivo) && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: SPACING.sm,
                  marginBottom: SPACING.xs,
                  paddingHorizontal: SPACING.xs,
                  paddingVertical: 7,
                  borderRadius: 10,
                  backgroundColor: COLORS.alpha.primary10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: COLORS.primary,
                      fontSize: 11,
                      fontWeight: '900',
                      letterSpacing: 0.7,
                    }}
                  >
                    A DOMICILIO
                  </Text>
                  <Text style={{ color: COLORS.text.secondary, fontSize: 11, marginTop: 2 }}>
                    {etiquetaEstadoLogistico(pedidoActivo.logistica?.estado)}
                    {pedidoActivo.logistica?.referenciaMision
                      ? ` · ${pedidoActivo.logistica.referenciaMision}`
                      : ''}
                  </Text>
                </View>
                {logisticaHabilitada &&
                  onRequestDelivery &&
                  !pedidoActivo.logistica?.referenciaMision && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Solicitar entrega del pedido"
                      onPress={onRequestDelivery}
                      disabled={solicitandoEntrega}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: solicitandoEntrega ? COLORS.bg.elevated : COLORS.primary,
                      }}
                    >
                      <Text style={{ color: COLORS.text.primary, fontSize: 11, fontWeight: '900' }}>
                        {solicitandoEntrega ? 'ENVIANDO…' : 'SOLICITAR'}
                      </Text>
                    </Pressable>
                  )}
              </View>
            )}

            {mesaSeleccionada ? (
              <OrderList
                pending={itemsPendientes}
                liveItems={itemsEnCurso}
                getProduct={getProduct}
                onIncPending={onIncrementPending}
                onDecPending={onDecrementPending}
                onRemovePending={onRemovePending}
                onMarkDelivered={onMarkDelivered}
              />
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {showOrderLoading && (
              <View style={staticStyles.orderLoadingOverlay}>
                <ActivityIndicator color={COLORS.primary} size="large" />
              </View>
            )}
          </View>

          <ActionArea
            total={totalPedido}
            pendingCount={pendingCount}
            liveItemsCount={liveItemsCount}
            mode={mesaSeleccionada ? 'table' : null}
            activeOrderId={activeOrderId}
            hasUndelivered={hasUndelivered}
            allItemsDelivered={allItemsDelivered}
            hasPrinted={hasPrinted}
            canMarkPaid={canMarkPaid}
            isCollapsed={!isTotalVisibleState}
            isSending={isSending}
            canSend={canSend}
            permissionToPrint={permissionToPrint}
            onAdd={onAddItem}
            onSend={onSend}
            onPrintBill={onPrintBill}
            onBill={onRequestBill}
            onPaid={onMarkPaid}
          />
        </View>
      </View>
    </View>
  );
}
