/**
 * Dirección visual: parrilla operativa como un mapa de estaciones, con estado
 * legible por material, rail y halo; nunca cambia la semántica de una mesa.
 */

import React, { useMemo, useState } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TableBadge, type TableIndicator } from '../../compartido/componentes/ui/TableBadge';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../compartido/constantes/theme';
import { useThemedColors } from '../../compartido/hooks/useThemedColors';
import { OrderItem } from '../../roles/logica/mesero/useMeseroLogic';

export type TableState = 'libre' | 'ocupada' | 'cuenta';

export type Table = {
  id: string;
  state: TableState;
  pedidoActivoId?: string;
};

type TablesGridProps = {
  tables: Table[];
  selectedTable: string | null;
  mode: 'table' | 'takeaway' | null;
  liveItems: OrderItem[];
  pendingCount: number;
  indicators?: Record<string, TableIndicator | null>;
  onPressTable: (tableId: string, isFree: boolean) => void;
  onSelectTakeaway: () => void;
  layoutOptions?: {
    minTileWidth?: number;
    tileHeight?: number;
    gap?: number;
  };
};

type TileVisual = {
  colors: [string, string];
  accent: string;
  muted: string;
  label: string;
};

function visualFor(state: TableState | 'takeaway'): TileVisual {
  if (state === 'takeaway') return { colors: ['#5C4815', '#211A0D'], accent: '#F5CF65', muted: '#E8C979', label: 'PEDIDO RÁPIDO' };
  if (state === 'libre') return { colors: ['#195C4A', '#102A29'], accent: '#6DE0B5', muted: '#93E5C5', label: 'DISPONIBLE' };
  if (state === 'ocupada') return { colors: ['#6C3140', '#2B1821'], accent: '#FF8F9A', muted: '#F5B2B9', label: 'EN SERVICIO' };
  return { colors: ['#725227', '#2E2315'], accent: '#F4C36A', muted: '#F3D39A', label: 'CUENTA' };
}

function TablesGridComponent(props: TablesGridProps) {
  const { tables, selectedTable, mode, liveItems, pendingCount, indicators, onPressTable, onSelectTakeaway, layoutOptions } = props;
  const { minTileWidth = 76, gap = SPACING.sm } = layoutOptions ?? {};
  const [containerWidth, setContainerWidth] = useState(0);
  const tileHeight = layoutOptions?.tileHeight ?? (containerWidth > 500 ? 124 : 84);
  const COLORS = useThemedColors();

  const tileWidth = useMemo(() => {
    if (containerWidth === 0) return minTileWidth;
    const numColumns = containerWidth >= 900 ? 6 : containerWidth >= 600 ? 5 : 4;
    return Math.floor((containerWidth - (numColumns - 1) * gap) / numColumns);
  }, [containerWidth, minTileWidth, gap]);

  const validTables = useMemo(() => {
    const validStates: TableState[] = ['libre', 'ocupada', 'cuenta'];
    return (tables || []).filter((table): table is Table => Boolean(table && typeof table.id === 'string' && table.id.length && validStates.includes(table.state)));
  }, [tables]);

  const renderTile = (id: string, state: TableState | 'takeaway', isTakeaway = false, onPress: () => void) => {
    const isSelected = isTakeaway ? mode === 'takeaway' : selectedTable === id && mode === 'table';
    const mesaData = !isTakeaway ? (tables.find((table) => table.id === id) as any) : null;
    const thisMesaPending = isSelected ? pendingCount > 0 : (mesaData?.hasPending ?? false);
    const thisMesaLiveCount = isSelected ? liveItems.filter((item) => item.estado !== 'entregado').length : (mesaData?.liveCount ?? 0);
    const thisMesaHasReady = isSelected ? liveItems.some((item) => item.estado === 'listo') : (mesaData?.hasReady ?? false);
    const visual = visualFor(state);

    return (
      <Pressable
        accessibilityLabel={isTakeaway ? 'Pedido para llevar' : `Mesa ${id}, ${visual.label.toLowerCase()}`}
        accessibilityRole="button"
        key={id}
        onPress={onPress}
        style={({ pressed }) => [
          styles.tileShell,
          {
            width: tileWidth,
            height: tileHeight,
            marginBottom: gap,
            borderColor: isSelected ? visual.accent : 'rgba(235,241,250,0.12)',
            shadowColor: isSelected ? visual.accent : '#000',
          },
          isSelected && styles.tileSelected,
          pressed && styles.tilePressed,
        ]}
      >
        <LinearGradient colors={visual.colors} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.tileFill}>
          <View pointerEvents="none" style={[styles.tileGlow, { backgroundColor: `${visual.accent}26` }]} />
          <View style={[styles.iconPlate, { borderColor: `${visual.accent}55`, backgroundColor: `${visual.accent}18` }]}>
            {isTakeaway ? <MaterialCommunityIcons name="package-variant-closed" size={20} color={visual.accent} /> : <Ionicons name="people" size={17} color={visual.accent} />}
          </View>
          <Text numberOfLines={1} style={styles.tableId}>{isTakeaway ? 'Para llevar' : id}</Text>
          <View style={styles.statusRow}><View style={[styles.statusDot, { backgroundColor: visual.accent }]} /><Text numberOfLines={1} style={[styles.statusText, { color: visual.muted }]}>{visual.label}</Text></View>
          <View pointerEvents="none" style={[styles.accentRail, { backgroundColor: visual.accent }]} />
          {!isTakeaway && <TableBadge count={thisMesaLiveCount} hasReady={thisMesaHasReady} hasPending={thisMesaPending > 0} indicator={indicators?.[id] ?? null} />}
        </LinearGradient>
      </Pressable>
    );
  };

  const minHeightForTwoRows = tileHeight * 2 + gap + SPACING.xl + SPACING.xs;

  return (
    <View style={{ flex: 2, minHeight: minHeightForTwoRows, width: '100%' }} onLayout={(event) => {
      const nextWidth = event.nativeEvent.layout.width;
      if (Math.abs(containerWidth - nextWidth) > 10) setContainerWidth(nextWidth);
    }}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {validTables.map((table) => renderTile(table.id, table.state, false, () => onPressTable(table.id, table.state === 'libre')))}
          {renderTile('takeaway', 'takeaway', true, onSelectTakeaway)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: SPACING.xl, paddingTop: SPACING.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tileShell: { borderRadius: RADIUS.xl, borderWidth: 1, elevation: 4, overflow: 'hidden', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 13 },
  tileSelected: { borderWidth: 2, elevation: 9, shadowOpacity: 0.42, shadowRadius: 18 },
  tilePressed: { opacity: 0.86, transform: [{ scale: 0.975 }] },
  tileFill: { alignItems: 'center', flex: 1, justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 7, position: 'relative' },
  tileGlow: { borderRadius: 70, height: 118, position: 'absolute', right: -44, top: -58, width: 118 },
  iconPlate: { alignItems: 'center', borderRadius: 9, borderWidth: 1, height: 28, justifyContent: 'center', width: 28 },
  tableId: { color: '#F7F9FC', fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.black, marginTop: 5, paddingHorizontal: 2, textAlign: 'center', width: '100%' },
  statusRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 3 },
  statusDot: { borderRadius: 4, height: 6, width: 6 },
  statusText: { fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  accentRail: { bottom: 0, height: 3, left: 0, position: 'absolute', right: 0 },
});

export const TablesGrid = React.memo(TablesGridComponent);
