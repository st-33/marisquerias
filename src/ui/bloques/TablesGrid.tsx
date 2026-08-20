import React, { useMemo, useState } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { TableBadge, type TableIndicator } from '../../compartido/componentes/ui/TableBadge';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../compartido/constantes/theme';
import { useThemedColors, useThemedShadows } from '../../compartido/hooks/useThemedColors';
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
    minTileWidth?: number; // Ancho mínimo deseado para cada tile
    tileHeight?: number;
    gap?: number;
  };
};

function TablesGridComponent(props: TablesGridProps) {
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

  const { minTileWidth = 76, gap = SPACING.sm } = layoutOptions ?? {};
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const tileHeight = layoutOptions?.tileHeight ?? (containerWidth > 500 ? 124 : 84);
  const COLORS = useThemedColors();
  const SHADOWS = useThemedShadows();

  // 🎯 GRID RESPONSIVE: 2 columnas en móvil, 3 en tablet compacta, 4 en web/tablet ancha
  // Si hay más de 8 mesas (2 filas x 4 cols), se hace scroll vertical
  const tileWidth = useMemo(() => {
    if (containerWidth === 0) return minTileWidth;

    const numColumns = containerWidth >= 900 ? 6 : containerWidth >= 600 ? 5 : 4;

    // Calcular ancho exacto para llenar el contenedor
    const totalGapSpace = (numColumns - 1) * gap;
    const availableSpace = containerWidth - totalGapSpace;
    return Math.floor(availableSpace / numColumns);
  }, [containerWidth, minTileWidth, gap]);

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

  const tileColor = (state: TableState) =>
    state === 'libre'
      ? COLORS.table.free
      : state === 'ocupada'
        ? COLORS.table.occupied
        : COLORS.table.billing;

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
          borderRadius: RADIUS.xl,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: gap,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          borderWidth: isSelected ? 3 : 0,
          borderColor: isSelected ? COLORS.primaryLight : 'transparent',
          ...(isSelected ? SHADOWS.primary : SHADOWS.sm),
        })}
      >
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          {isTakeaway ? (
            <MaterialCommunityIcons name="package-variant-closed" size={24} color={textColor} />
          ) : (
            <Ionicons name="people" size={18} color={textColor} />
          )}

          <Text
            style={{
              color: textColor,
              fontWeight: TYPOGRAPHY.weights.black,
              fontSize: isTakeaway ? TYPOGRAPHY.sizes.sm : TYPOGRAPHY.sizes.xl,
              marginTop: 4,
              textAlign: 'center',
              flexShrink: 1,
              width: '100%',
              paddingHorizontal: 4,
            }}
            numberOfLines={2}
          >
            {isTakeaway ? 'Para Llevar' : id}
          </Text>

          {!isTakeaway && (
            <Text
              style={{
                color: textColor,
                fontSize: 10,
                opacity: 0.8,
                fontWeight: '600',
                flexShrink: 1,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {String(state).toUpperCase()}
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

  // 🎯 Calcular altura mínima para 2 filas completas
  const minHeightFor2Rows = tileHeight * 2 + gap * 1 + SPACING.xl + SPACING.xs;

  return (
    <View
      style={{
        flex: 2,
        width: '100%',
        minHeight: minHeightFor2Rows, // 🔥 Asegura que 2 filas sean visibles
      }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (Math.abs(containerWidth - w) > 10) {
          setContainerWidth(w);
        }
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: SPACING.xl,
          paddingTop: SPACING.xs,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between', // Distribución fractal
            gap: 0, // Usamos marginBottom en los tiles y justifyContent para el gap horizontal
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

export const TablesGrid = React.memo(TablesGridComponent);
