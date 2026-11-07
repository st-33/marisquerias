import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SPACING, TYPOGRAPHY } from '@/compartido/temas';
import { useThemedColors } from '../../compartido/hooks/useColoresTema';
import { AreaAccion } from './AreaAccion';
import { ListaComandas } from './ListaComandas';
import { CuadriculaMesas } from './CuadriculaMesas';
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
    paddingTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.xs,
    gap: SPACING.xs,
    overflow: 'hidden',
  },
  orderContent: {
    flex: 1,
    overflow: 'hidden',
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
  const { width, height } = useWindowDimensions();
  // Detección de orientación apaisada / tableta horizontal:
  // Si el ancho supera a la altura y el ancho es >= 600, estamos en horizontal/tableta
  const isLandscape = width > height && width >= 600;

  // En horizontal, calculamos si se requiere 1 o 2 columnas para las mesas:
  // Si hay más de 7 mesas, 2 columnas (ancho ~190), de lo contrario 1 sola columna compacta (ancho ~96)
  const totalTiles = (mesas?.length || 0) + 1; // Mesas + Para Llevar
  const sidebarWidth = useMemo(() => {
    if (!isLandscape) return undefined;
    return totalTiles > 7 ? 190 : 96;
  }, [isLandscape, totalTiles]);

  // Proporción de altura dinámica en modo vertical (portrait):
  const numRows = Math.ceil(totalTiles / 5);
  const calculatedGridHeight = useMemo(() => {
    if (isLandscape) return undefined;
    if (numRows <= 1) {
      return Math.max(90, Math.round(height * 0.2));
    }
    if (numRows === 2) {
      return Math.max(140, Math.round(height * 0.26));
    }
    return Math.max(160, Math.round(height * 0.28));
  }, [isLandscape, numRows, height]);

  // Estilos que dependen del tema
  const themedStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: COLORS.bg.primary,
          overflow: 'hidden',
        },
        gridWrapper: {
          ...(isLandscape
            ? { width: sidebarWidth, flexShrink: 0 }
            : { flexGrow: 0, flexShrink: 0 }),
          backgroundColor: 'transparent',
          overflow: 'hidden',
        },
        orderWrapper: {
          flex: 1,
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
    [COLORS, isLandscape, sidebarWidth]
  );

  // Total auto hide recibido por props
  const isTotalVisibleState = isTotalVisible;

  const showGridLoading = loading;
  const showOrderLoading = cartsLoading;

  return (
    <View style={themedStyles.container}>
      <View style={[staticStyles.layout, { flexDirection: isLandscape ? 'row' : 'column' }]}>
        <View style={[themedStyles.gridWrapper, !isLandscape && { height: calculatedGridHeight }]}>
          {showGridLoading ? (
            <View style={staticStyles.emptyState}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={themedStyles.emptyText}>Cargando mesas…</Text>
            </View>
          ) : (
            <CuadriculaMesas
              tables={mesas}
              selectedTable={mesaSeleccionada}
              mode={mesaSeleccionada ? 'table' : null}
              liveItems={itemsEnCurso}
              pendingCount={pendingCount}
              onPressTable={async (id: string, isFree: boolean) => {
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
              <ListaComandas
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

          <AreaAccion
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
            isPrinting={isPrinting}
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
