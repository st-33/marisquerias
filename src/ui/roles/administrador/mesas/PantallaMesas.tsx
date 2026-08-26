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
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './estilos';
import { useToast } from '../../../../compartido/componentes/ui/Toast';
import { TarjetaResumen } from './componentes/TarjetaResumen';
import { getRtdb } from '../../../../sistema/firebase';
import { useStore } from '../../../../sistema/store';
import { useGestionMesas, usePuenteAccionesFlotantes } from '../../../../capacidades';
import type { FabItem } from '../../../../sistema/tipos/contratos';

// --- COMPONENTS ---


export function PantallaMesas() {
  const tenantPath = useStore((s) => s.sesion.tenantPath) || '';
  const ds = useStore((s) => s.dataSources);
  const db = useMemo(() => getRtdb(ds?.operacionUrl || undefined), [ds]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // 🧠 CEREBRO
  const { mesas, cantidad, resumen, loading, actions } = useGestionMesas({ db, tenantPath });

  // 👐 MANOS - Estado UI
  const [editMode, setEditMode] = useState(false);
  const [draftLayout, setDraftLayout] = useState<Record<string, { posX: number; posY: number }>>(
    {}
  );
  const [, setLayoutDirty] = useState(false);
  const [activeMesaId, setActiveMesaId] = useState<string | null>(null);
  const [quantityOverride, setQuantityOverride] = useState<number | null>(null);
  const newQuantity = quantityOverride ?? cantidad;

  const canvasRef = useRef<View | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: width - 48, height: 600 });
  const [dragState] = useState<{ id?: string; startX: number; startY: number }>(() => ({
    startX: 0,
    startY: 0,
  }));
  const { showToast, ToastComponent } = useToast();

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
      setQuantityOverride(null);
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
            setDraftLayout({});
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
                onPress={() => setQuantityOverride(Math.max(1, newQuantity - 1))}
              >
                <Ionicons name="remove" size={16} color="white" />
              </Pressable>
              <Text style={styles.quantityValue}>{newQuantity}</Text>
              <Pressable style={styles.btnQty} onPress={() => setQuantityOverride(newQuantity + 1)}>
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
        <TarjetaResumen
          titulo="Libres"
          valor={resumen.libres}
          icono="checkmark-circle-outline"
          color="#10b981"
        />
        <TarjetaResumen
          titulo="Ocupadas"
          valor={resumen.ocupadas}
          icono="people-outline"
          color="#ef4444"
        />
        <TarjetaResumen
          titulo="Cuenta Pedida"
          valor={resumen.solicitarCuenta}
          icono="receipt-outline"
          color="#f59e0b"
        />
        <TarjetaResumen
          titulo="Pagadas"
          valor={(resumen as any).pagadas || 0}
          icono="wallet-outline"
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
            if (mesa.estado === 'solicitar_cuenta') statusColor = '#f59e0b';
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


export default PantallaMesas;
