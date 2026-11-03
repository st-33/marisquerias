import React, { useMemo, useState } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  InsigniaMesa as TableBadge,
  type TableIndicator,
} from '../../compartido/componentes/ui/InsigniaMesa';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/compartido/temas';
import { useThemedColors, useThemedShadows } from '../../compartido/hooks/useColoresTema';
import { OrderItem } from '../../roles/logica/mesero/useLogicaMesero';

export type TableState = 'libre' | 'ocupada' | 'cuenta';
export type EstadoMesa = TableState;

export type Table = {
  id: string;
  state: TableState;
  pedidoActivoId?: string;
};
export type MesaCuadricula = Table;

export type CuadriculaMesasProps = {
  tables: Table[];
  selectedTable: string | null;
  mode: 'table' | 'takeaway' | null;
  liveItems: OrderItem[];
  pendingCount: number;
  indicators?: Record<string, TableIndicator | null>;
  onPressTable: (tableId: string, isFree: boolean) => void;
  onSelectTakeaway: () => void;
  layoutOptions?: {
    minTileWidth?: number; // Ancho mínimo deseado para cada tile
    tileHeight?: number;
    gap?: number;
  };
};

export type TablesGridProps = CuadriculaMesasProps;

function formatearEtiquetaMesa(id: string): string {
  const match = id.match(/^(?:mesa[-_ ]*)(\d+)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    return `M${num}`;
  }
  if (/^m\d+$/i.test(id)) {
    return id.toUpperCase();
  }
  if (/^\d+$/.test(id)) {
    return `M${parseInt(id, 10)}`;
  }
  return id;
}

function formatearEstadoMesa(state: TableState | string): string {
  const s = String(state).toLowerCase();
  if (s === 'libre' || s === 'disponible' || s === 'free') {
    return 'LIBRE';
  }
  return 'OCUPADA';
}

function CuadriculaMesasComponent(props: CuadriculaMesasProps) {
  const {
    tables,
    selectedTable,
    mode,
    liveItems,
    pendingCount,
    indicators,
    onPressTable,
    onSelectTakeaway,
    layoutOptions,
  } = props;

  const { minTileWidth = 64, gap = 6 } = layoutOptions ?? {};
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const isTabletOrDesktop = containerWidth >= 600;
  const tileHeight = layoutOptions?.tileHeight ?? (isTabletOrDesktop ? 78 : 66);
  const COLORS = useThemedColors();
  const SHADOWS = useThemedShadows();

  // 🎯 GRID RESPONSIVE:
  // - Móviles (<600px): estrictamente 3 a 5 columnas (nunca más de 5 en móviles)
  // - Tabletas / Escritorio (>=600px): 6 a 8 columnas según ancho
  const numColumns = useMemo(() => {
    if (containerWidth === 0) return 4;
    if (containerWidth < 360) return 3;
    if (containerWidth < 480) return 4;
    if (containerWidth < 600) return 5;
    if (containerWidth < 768) return 6;
    if (containerWidth < 1024) return 7;
    return 8;
  }, [containerWidth]);

  const tileWidth = useMemo(() => {
    if (containerWidth === 0) return minTileWidth;
    const totalGapSpace = (numColumns - 1) * gap;
    const availableSpace = containerWidth - totalGapSpace;
    return Math.max(minTileWidth, Math.floor(availableSpace / numColumns));
  }, [containerWidth, numColumns, gap, minTileWidth]);

  // ✅ Filtrar mesas válidas: excluir mesas con datos inconsistentes
  const validTables = useMemo(() => {
    const validStates: TableState[] = ['libre', 'ocupada', 'cuenta'];
    return (tables || []).filter((t): t is Table => {
      if (!t || typeof t !== 'object') return false;
      if (typeof t.id !== 'string' || t.id.length === 0) return false;
      if (!t.state || !validStates.includes(t.state)) return false;
      return true;
    });
  }, [tables]);

  const tileColor = (state: TableState) => {
    if (state === 'libre') return COLORS.table.free;
    if (state === 'ocupada') return COLORS.table.occupied;
    return COLORS.table.billing;
  };

  const renderTile = (
    id: string,
    state: TableState | 'takeaway',
    isTakeaway: boolean = false,
    onPress: () => void
  ) => {
    const isSelected = isTakeaway ? mode === 'takeaway' : selectedTable === id && mode === 'table';

    // Datos para badge (solo si es mesa normal)
    const mesaData = !isTakeaway ? (tables.find((t) => t.id === id) as any) : null;

    const thisMesaPending = isSelected ? pendingCount > 0 : (mesaData?.hasPending ?? false);
    const thisMesaLiveCount = isSelected
      ? liveItems.filter((it: OrderItem) => it.estado !== 'entregado').length
      : (mesaData?.liveCount ?? 0);
    const thisMesaHasReady = isSelected
      ? liveItems.some((it: OrderItem) => it.estado === 'listo')
      : (mesaData?.hasReady ?? false);
    const mesaIndicator = !isTakeaway ? (indicators?.[id] ?? null) : null;

    const bgColor = isTakeaway ? COLORS.primary : tileColor(state as TableState);
    const textColor = COLORS.text.primary;

    return (
      <Pressable
        key={id}
        onPress={onPress}
        style={({ pressed }) => ({
          width: tileWidth,
          height: tileHeight,
          borderRadius: RADIUS.lg,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          borderWidth: isSelected ? 2.5 : 0,
          borderColor: isSelected ? COLORS.primaryLight : 'transparent',
          ...(isSelected ? SHADOWS.primary : SHADOWS.sm),
        })}
      >
        <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', paddingHorizontal: 2 }}>
          {isTakeaway ? (
            <MaterialCommunityIcons name="package-variant-closed" size={isTabletOrDesktop ? 20 : 16} color={textColor} />
          ) : (
            <Ionicons name="people" size={isTabletOrDesktop ? 18 : 15} color={textColor} />
          )}

          <Text
            style={{
              color: textColor,
              fontWeight: TYPOGRAPHY.weights.black,
              fontSize: isTakeaway ? (isTabletOrDesktop ? 12 : 10) : (isTabletOrDesktop ? 14 : 12),
              marginTop: 2,
              textAlign: 'center',
              flexShrink: 1,
              width: '100%',
            }}
            numberOfLines={1}
          >
            {isTakeaway ? 'Para Llevar' : formatearEtiquetaMesa(id)}
          </Text>

          {!isTakeaway && (
            <Text
              style={{
                color: textColor,
                fontSize: 9,
                opacity: 0.8,
                fontWeight: '700',
                flexShrink: 1,
                textAlign: 'center',
                marginTop: 1,
              }}
              numberOfLines={1}
            >
              {formatearEstadoMesa(state)}
            </Text>
          )}
        </View>

        {/* Badge Fractal */}
        {!isTakeaway && (
          <TableBadge
            count={thisMesaLiveCount}
            hasReady={thisMesaHasReady}
            hasPending={thisMesaPending > 0}
            indicator={mesaIndicator}
          />
        )}
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flex: 1,
        width: '100%',
      }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (Math.abs(containerWidth - w) > 5) {
          setContainerWidth(w);
        }
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 4,
          paddingTop: 2,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap,
          }}
        >
          {/* 1. Renderizar Mesas */}
          {validTables.map((table) =>
            renderTile(table.id, table.state, false, () =>
              onPressTable(table.id, table.state === 'libre')
            )
          )}

          {/* Salida operativa para pedidos sin mesa */}
          {renderTile('takeaway', 'takeaway', true, onSelectTakeaway)}
        </View>
      </ScrollView>
    </View>
  );
}

export const CuadriculaMesas = React.memo(CuadriculaMesasComponent);
export const TablesGrid = CuadriculaMesas;
