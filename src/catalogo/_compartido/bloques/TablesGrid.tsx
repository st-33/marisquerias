import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  UIManager,
  View,
} from 'react-native';
import { TableBadge, type TableIndicator } from '../../../compartido/componentes/ui/TableBadge';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../compartido/constantes/theme';
import { OrderItem } from '../../../plataforma/dominios/marisqueria/mesero/useMeseroLogic';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

const tileColor = (s: TableState) =>
  s === 'libre'
    ? COLORS.table.free
    : s === 'ocupada'
      ? COLORS.table.occupied
      : COLORS.table.billing;

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

  const {
    minTileWidth = 85, // Ancho mínimo para asegurar legibilidad
    tileHeight = 95, // 🔥 Aumentado para que se vean 2 filas completas
    gap = SPACING.md,
  } = layoutOptions ?? {};

  const [containerWidth, setContainerWidth] = useState<number>(0);

  // 🎯 GRID FIJO: 4 COLUMNAS (2 filas visibles)
  // Si hay más de 8 mesas (2 filas x 4 cols), se hace scroll vertical
  const tileWidth = useMemo(() => {
    if (containerWidth === 0) return minTileWidth;

    // 🔥 FORZAR 4 COLUMNAS SIEMPRE
    const numColumns = 4;

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
          // Efectos visuales
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
          borderWidth: isSelected ? 3 : 0,
          borderColor: isSelected ? COLORS.primary : 'transparent',
          // Sombra fractal (más profunda si está seleccionado)
          ...(isSelected
            ? {
                shadowColor: COLORS.primary,
                shadowOpacity: 0.5,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
              }
            : SHADOWS.sm),
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
          // Debounce simple
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
          {validTables.map((t) =>
            renderTile(t.id, t.state, false, () => onPressTable(t.id, t.state === 'libre'))
          )}

          {/* 2. Renderizar Para Llevar (siempre al final, como un ciudadano más del grid) */}
          {renderTile('takeaway', 'takeaway', true, onSelectTakeaway)}

          {/* 3. Elementos fantasma para alinear la última fila a la izquierda si usamos space-between */}
          {[...Array(6)].map((_, i) => (
            <View key={`ghost-${i}`} style={{ width: tileWidth, height: 0 }} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export const TablesGrid = React.memo(TablesGridComponent);
