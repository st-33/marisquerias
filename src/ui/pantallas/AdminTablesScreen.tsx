/**
 * 🪑 ADMIN TABLES SCREEN (Gestión de Mesas Premium)
 * Componente visual para alimentos y bebidas
 */

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../compartido/componentes/ui/Toast';
import { getRtdb } from '../../plataforma/core/firebase';
import { useStore } from '../../plataforma/core/store';
import {
  useMesasManagement,
  usePuenteAccionesFlotantes,
} from '../../plataforma/dominios/alimentos_y_bebidas';
import type { FabItem } from '../../plataforma/core/types/contratos';

// --- COMPONENTS ---

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryTitle}>{title}</Text>
      </View>
    </View>
  );
}

export function AdminTablesScreen() {
  const tenantPath = useStore((s) => s.sesion.tenantPath) || '';
  const ds = useStore((s) => s.dataSources);
  const db = useMemo(() => getRtdb(ds?.operacionUrl || undefined), [ds]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // 🧠 CEREBRO
  const { mesas, cantidad, resumen, loading, actions } = useMesasManagement({ db, tenantPath });

  // 👐 MANOS - Estado UI
  const [editMode, setEditMode] = useState(false);
  const [draftLayout, setDraftLayout] = useState<Record<string, { posX: number; posY: number }>>(
    {}
  );
  const [, setLayoutDirty] = useState(false);
  const [activeMesaId, setActiveMesaId] = useState<string | null>(null);
  const [newQuantity, setNewQuantity] = useState(cantidad);

  const canvasRef = useRef<View | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: width - 48, height: 600 });
  const [dragState] = useState<{ id?: string; startX: number; startY: number }>(() => ({
    startX: 0,
    startY: 0,
  }));
  const { showToast, ToastComponent } = useToast();

  const [prevCantidad, setPrevCantidad] = useState(cantidad);
  if (cantidad !== prevCantidad) {
    setPrevCantidad(cantidad);
    setNewQuantity(cantidad);
  }

  const [prevMesas, setPrevMesas] = useState(mesas);
  if (mesas !== prevMesas) {
    setPrevMesas(mesas);
    setDraftLayout(
      mesas.reduce((acc, m) => ({ ...acc, [m.id]: { posX: m.posX, posY: m.posY } }), {})
    );
  }

  // --- DRAG & DROP LOGIC ---
  const createMesaPanResponder = (mesaId: string) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => editMode,
      onMoveShouldSetPanResponder: () => editMode,
      onPanResponderGrant: () => {
        if (!editMode) return;
        const draft = draftLayout[mesaId];
        const mesa = mesas.find((m) => m.id === mesaId);
        dragState.id = mesaId;
        dragState.startX = draft?.posX ?? mesa?.posX ?? 0.5;
        dragState.startY = draft?.posY ?? mesa?.posY ?? 0.5;
        setActiveMesaId(mesaId);
      },
      onPanResponderMove: (_, gesture) => {
        if (!editMode) return;

        const { dx, dy } = gesture;
        const normDx = dx / canvasSize.width;
        const normDy = dy / canvasSize.height;

        let newX = dragState.startX + normDx;
        let newY = dragState.startY + normDy;

        newX = Math.max(0.05, Math.min(0.95, newX));
        newY = Math.max(0.05, Math.min(0.95, newY));

        setDraftLayout((prev) => ({ ...prev, [mesaId]: { posX: newX, posY: newY } }));
        setLayoutDirty(true);
      },
      onPanResponderRelease: () => {
        dragState.id = undefined;
        setActiveMesaId(null);
      },
    });
  };

  // --- HANDLERS ---
  const handleSaveLayout = useCallback(async () => {
    try {
      const payload = mesas.map((m) => ({
        id: m.id,
        posX: draftLayout[m.id]?.posX ?? m.posX,
        posY: draftLayout[m.id]?.posY ?? m.posY,
        shape: m.shape,
      }));
      await actions.guardarLayout?.(payload);
      setLayoutDirty(false);
      setEditMode(false);
      showToast('Distribución guardada', 'success');
    } catch {
      showToast('Error al guardar distribución', 'error');
    }
  }, [actions, draftLayout, mesas, showToast]);

  const handleUpdateQuantity = async () => {
    if (newQuantity === cantidad) return;
    try {
      const res = await actions.aplicarCantidad(newQuantity);
      if (res.bloqueadas.length > 0) {
        Alert.alert('Atención', `No se eliminaron mesas ocupadas: ${res.bloqueadas.join(', ')}`);
      } else {
        showToast('Cantidad actualizada', 'success');
      }
    } catch {
      showToast('Error al actualizar cantidad', 'error');
    }
  };

  // --- FAB ITEMS ---
  const fabItems = useMemo<FabItem[]>(() => {
    if (editMode) {
      return [
        {
          key: 'save-layout',
          label: 'Guardar Distribución',
          icon: <Ionicons name="checkmark" size={24} color={'#FFFFFF'} />,
          onPress: handleSaveLayout,
        },
        {
          key: 'cancel-layout',
          label: 'Cancelar',
          icon: <Ionicons name="close" size={24} color={'#FFFFFF'} />,
          onPress: () => {
            setEditMode(false);
            setLayoutDirty(false);
            setDraftLayout(
              mesas.reduce((acc, m) => ({ ...acc, [m.id]: { posX: m.posX, posY: m.posY } }), {})
            );
          },
        },
      ];
    }

    return [
      {
        key: 'edit-layout',
        label: 'Modificar Distribución',
        icon: <Ionicons name="create-outline" size={20} color={'#FFFFFF'} />,
        onPress: () => setEditMode(true),
      },
    ];
  }, [editMode, handleSaveLayout, mesas]);

  usePuenteAccionesFlotantes({
    items: fabItems,
    position: 'bottom-right',
    initialKey: null,
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando plano de salón...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {ToastComponent}

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Plano de Salón</Text>
          <Text style={styles.subtitle}>Distribución e información de mesas en tiempo real</Text>
        </View>

        <View style={styles.headerActions}>
          {editMode ? (
            <View style={styles.editBadge}>
              <Ionicons name="pencil-outline" size={16} color="#f59e0b" />
              <Text style={styles.editBadgeText}>Arrastra las mesas para reubicarlas</Text>
            </View>
          ) : (
            <View style={styles.quantityControl}>
              <Text style={styles.quantityLabel}>Mesas Totales:</Text>
              <Pressable
                style={styles.btnQty}
                onPress={() => setNewQuantity(Math.max(1, newQuantity - 1))}
              >
                <Ionicons name="remove" size={16} color="white" />
              </Pressable>
              <Text style={styles.quantityValue}>{newQuantity}</Text>
              <Pressable style={styles.btnQty} onPress={() => setNewQuantity(newQuantity + 1)}>
                <Ionicons name="add" size={16} color="white" />
              </Pressable>
              {newQuantity !== cantidad && (
                <Pressable style={styles.btnApply} onPress={handleUpdateQuantity}>
                  <Text style={styles.btnApplyText}>Aplicar</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>

      {/* SUMMARY BAR */}
      <View style={styles.summaryBar}>
        <SummaryCard
          title="Libres"
          value={resumen.libres}
          icon="checkmark-circle-outline"
          color="#10b981"
        />
        <SummaryCard
          title="Ocupadas"
          value={resumen.ocupadas}
          icon="people-outline"
          color="#ef4444"
        />
        <SummaryCard
          title="Cuenta Pedida"
          value={resumen.solicitarCuenta}
          icon="receipt-outline"
          color="#f59e0b"
        />
        <SummaryCard
          title="Pagadas"
          value={(resumen as any).pagadas || 0}
          icon="wallet-outline"
          color="#3b82f6"
        />
      </View>

      {/* CANVAS EDITOR */}
      <ScrollView contentContainerStyle={styles.canvasContainer}>
        <View
          ref={canvasRef}
          style={[styles.canvas, editMode && styles.canvasEditMode]}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            setCanvasSize({ width: w, height: h });
          }}
        >
          {/* GRID PATTERN IN EDIT MODE */}
          {editMode && (
            <View style={styles.gridOverlay} pointerEvents="none">
              <Text style={styles.gridWatermark}>MODO EDICIÓN VISUAL</Text>
            </View>
          )}

          {mesas.map((mesa) => {
            const layout = draftLayout[mesa.id] || { posX: mesa.posX, posY: mesa.posY };
            const isSelected = activeMesaId === mesa.id;

            let statusColor = '#10b981'; // Libre
            if (mesa.estado === 'ocupada') statusColor = '#ef4444';
            if ((mesa.estado as any) === 'cuenta_pedida') statusColor = '#f59e0b';
            if ((mesa.estado as any) === 'pagado') statusColor = '#3b82f6';

            const panResponder = createMesaPanResponder(mesa.id);

            return (
              <View
                key={mesa.id}
                {...(editMode ? panResponder.panHandlers : {})}
                style={[
                  styles.mesaItem,
                  {
                    left: `${layout.posX * 100}%`,
                    top: `${layout.posY * 100}%`,
                    borderColor: editMode ? '#f59e0b' : statusColor,
                    backgroundColor: isSelected
                      ? '#3b82f640'
                      : editMode
                      ? '#1e293b'
                      : `${statusColor}15`,
                  },
                ]}
              >
                <Ionicons
                  name={mesa.shape === 'round' ? 'disc-outline' : 'square-outline'}
                  size={24}
                  color={editMode ? '#f59e0b' : statusColor}
                />
                <Text style={styles.mesaNum}>{mesa.numero}</Text>
                {(mesa as any).total > 0 && !editMode && (
                  <Text style={styles.mesaTotal}>${(mesa as any).total}</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b40',
  },
  editBadgeText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quantityLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  quantityValue: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  btnQty: {
    backgroundColor: '#334155',
    padding: 4,
    borderRadius: 6,
  },
  btnApply: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 4,
  },
  btnApplyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryBar: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  summaryTitle: {
    color: '#94a3b8',
    fontSize: 12,
  },
  canvasContainer: {
    flexGrow: 1,
  },
  canvas: {
    flex: 1,
    minHeight: 500,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
  },
  canvasEditMode: {
    borderColor: '#f59e0b',
    backgroundColor: '#0f172a',
  },
  gridOverlay: {
    ...(StyleSheet.absoluteFill as any),
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridWatermark: {
    color: '#f59e0b10',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
  },
  mesaItem: {
    position: 'absolute',
    width: 64,
    height: 64,
    marginLeft: -32,
    marginTop: -32,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  mesaNum: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  mesaTotal: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default AdminTablesScreen;
