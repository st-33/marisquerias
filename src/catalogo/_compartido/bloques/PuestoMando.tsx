import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../compartido/constantes/theme';
import { useThemedColors, useThemedShadows } from '../../../compartido/hooks/useThemedColors';
import { ActionArea } from './ActionArea';
import { OrderList } from './OrderList';
import { TablesGrid } from './TablesGrid';

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
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.lg,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.black,
    letterSpacing: 1.2,
  },
  orderTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.black,
    marginTop: 2,
  },
  orderMeta: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginTop: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  countBadge: {
    minHeight: 38,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  countText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
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
    hasReadyItems,
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
    isTotalVisible = true,
  } = props;

  // 🎨 COLORES DINÁMICOS según tema activo
  const COLORS = useThemedColors();
  const SHADOWS_T = useThemedShadows();
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
          backgroundColor: COLORS.bg.secondary,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: COLORS.bg.elevated,
          padding: SPACING.md,
          overflow: 'hidden',
          ...SHADOWS_T.md,
        },
        orderWrapper: {
          flex: isWideLayout ? 7 : 1,
          backgroundColor: COLORS.bg.secondary,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: COLORS.bg.elevated,
          padding: SPACING.md,
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
    [COLORS, SHADOWS_T, isWideLayout]
  );

  // Total auto hide recibido por props
  const isTotalVisibleState = isTotalVisible;

  const showGridLoading = loading;
  const showOrderLoading = cartsLoading;

  const handleSend = canSend && !isSending ? onSend : () => {};

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
              indicators={undefined}
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
          <View style={staticStyles.header}>
            <View style={staticStyles.headerLeft}>
              <Text style={[staticStyles.eyebrow, { color: COLORS.primaryLight }]}>
                PEDIDO ACTIVO
              </Text>
              <Text style={[staticStyles.orderTitle, { color: COLORS.text.primary }]}>
                {mesaSeleccionada ? `Mesa ${mesaSeleccionada}` : 'Sin mesa seleccionada'}
              </Text>
              <Text style={[staticStyles.orderMeta, { color: COLORS.text.muted }]}>
                {pendingCount} pendientes · {liveItemsCount} en curso
              </Text>
            </View>
            <View style={staticStyles.badgeRow}>
              {hasReadyItems && (
                <View style={[staticStyles.badge, { backgroundColor: COLORS.alpha.success20 }]}>
                  <Ionicons name="flash" size={16} color={COLORS.success} />
                  <Text style={[staticStyles.badgeText, { color: COLORS.success }]}>RETIRA YA</Text>
                </View>
              )}
              <View
                style={[
                  staticStyles.countBadge,
                  {
                    backgroundColor: COLORS.bg.tertiary,
                    borderColor: COLORS.bg.elevated,
                  },
                ]}
              >
                <Text style={[staticStyles.countText, { color: COLORS.text.secondary }]}>
                  {pendingCount + liveItemsCount} ítems
                </Text>
              </View>
            </View>
          </View>
          <View style={staticStyles.orderContent}>
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
              <View style={staticStyles.emptyState}>
                <Ionicons name="walk" size={56} color={COLORS.text.muted} />
                <Text style={themedStyles.emptyText}>
                  Selecciona una mesa para empezar a tomar nota
                </Text>
              </View>
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
            isPrinting={isPrinting}
            isSending={isSending}
            permissionToPrint={permissionToPrint}
            onAdd={onAddItem}
            onSend={handleSend}
            onPrintBill={onPrintBill}
            onBill={onRequestBill}
            onPaid={onMarkPaid}
          />
        </View>
      </View>
    </View>
  );
}
