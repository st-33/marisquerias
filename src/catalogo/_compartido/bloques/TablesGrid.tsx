import React, { useMemo, useState } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
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

  const { minTileWidth = 112, tileHeight = 128, gap = SPACING.md } = layoutOptions ?? {};

  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | TableState>('all');

  // 🎯 GRID RESPONSIVE: 2 columnas en móvil, 3 en tablet compacta, 4 en web/tablet ancha
  // Si hay más de 8 mesas (2 filas x 4 cols), se hace scroll vertical
  const tileWidth = useMemo(() => {
    if (containerWidth === 0) return minTileWidth;

    const numColumns = containerWidth >= 760 ? 4 : containerWidth >= 460 ? 3 : 2;

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

  const filteredTables = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return validTables.filter((table) => {
      const matchesQuery = !normalizedQuery || table.id.toLowerCase().includes(normalizedQuery);
      const matchesState = stateFilter === 'all' || table.state === stateFilter;
      return matchesQuery && matchesState;
    });
  }, [query, stateFilter, validTables]);

  const renderTile = (
    id: string,
    state: TableState | 'takeaway',
    isTakeaway: boolean = false,
    onPress: () => void
  ) => {
    const isSelected = isTakeaway ? mode === 'takeaway' : selectedTable === id && mode === 'table';

    // Datos para badge (solo si es mesa normal)
    const mesaData = !isTakeaway ? (tables.find((t) => t.id === id) as any) : null;

    const thisMesaPending = isSelected ? pendingCount > 0 : mesaData?.hasPending ?? false;
    const thisMesaLiveCount = isSelected
      ? liveItems.filter((it: OrderItem) => it.estado !== 'entregado').length
      : mesaData?.liveCount ?? 0;
    const thisMesaHasReady = isSelected
      ? liveItems.some((it: OrderItem) => it.estado === 'listo')
      : mesaData?.hasReady ?? false;
    const mesaIndicator = !isTakeaway ? indicators?.[id] ?? null : null;

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
      <View
        style={{
          gap: SPACING.sm,
          marginBottom: SPACING.md,
        }}
      >
        <View
          style={{
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            gap: SPACING.sm,
            backgroundColor: COLORS.bg.tertiary,
            borderRadius: RADIUS.lg,
            borderWidth: 1,
            borderColor: COLORS.bg.elevated,
            paddingHorizontal: SPACING.md,
          }}
        >
          <Ionicons name="search" size={20} color={COLORS.text.muted} />
          <TextInput
            accessibilityLabel="Buscar mesa"
            placeholder="Buscar mesa"
            placeholderTextColor={COLORS.text.muted}
            value={query}
            onChangeText={setQuery}
            style={{
              flex: 1,
              color: COLORS.text.primary,
              fontSize: TYPOGRAPHY.sizes.md,
              minHeight: 46,
            }}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              onPress={() => setQuery('')}
              hitSlop={8}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.text.muted} />
            </Pressable>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: SPACING.sm }}
        >
          {[
            { key: 'all' as const, label: 'Todas' },
            { key: 'libre' as const, label: 'Libres' },
            { key: 'ocupada' as const, label: 'Ocupadas' },
            { key: 'cuenta' as const, label: 'Cuenta' },
          ].map((filter) => {
            const selected = stateFilter === filter.key;
            return (
              <Pressable
                key={filter.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setStateFilter(filter.key)}
                style={({ pressed }) => ({
                  minHeight: 44,
                  paddingHorizontal: SPACING.lg,
                  borderRadius: RADIUS.full,
                  borderWidth: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? COLORS.primary : COLORS.bg.tertiary,
                  borderColor: selected ? COLORS.primaryLight : COLORS.bg.elevated,
                  opacity: pressed ? 0.78 : 1,
                })}
              >
                <Text
                  style={{
                    color: selected ? COLORS.text.primary : COLORS.text.secondary,
                    fontWeight: TYPOGRAPHY.weights.bold,
                  }}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

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
          {filteredTables.map((t) =>
            renderTile(t.id, t.state, false, () => onPressTable(t.id, t.state === 'libre'))
          )}

          {filteredTables.length === 0 && query.trim().length > 0 && (
            <View
              style={{
                width: '100%',
                minHeight: 120,
                alignItems: 'center',
                justifyContent: 'center',
                gap: SPACING.sm,
              }}
            >
              <Ionicons name="search-outline" size={28} color={COLORS.text.muted} />
              <Text
                style={{ color: COLORS.text.secondary, fontWeight: TYPOGRAPHY.weights.semibold }}
              >
                No encontramos esa mesa
              </Text>
            </View>
          )}

          {/* 2. Para Llevar permanece como salida operativa */}
          {query.trim().length === 0 &&
            stateFilter === 'all' &&
            renderTile('takeaway', 'takeaway', true, onSelectTakeaway)}

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
