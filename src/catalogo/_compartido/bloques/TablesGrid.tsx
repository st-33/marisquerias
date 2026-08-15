import React, { useMemo, useState } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  UIManager,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../compartido/constantes/theme';

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
  const { tables, selectedTable, mode, onPressTable, onSelectTakeaway, layoutOptions } = props;

  const { minTileWidth = 112, tileHeight = 96, gap = SPACING.sm } = layoutOptions ?? {};

  const [containerWidth, setContainerWidth] = useState<number>(0);

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

  const renderTile = (
    id: string,
    state: TableState | 'takeaway',
    isTakeaway: boolean = false,
    onPress: () => void
  ) => {
    const isSelected = isTakeaway ? mode === 'takeaway' : selectedTable === id && mode === 'table';

    const bgColor = isTakeaway ? COLORS.primary : tileColor(state as TableState);
    const textColor = COLORS.text.primary;

    return (
      <Pressable
        key={id}
        onPress={() => {
          if (Platform.OS !== 'web') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onPress();
        }}
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
        </View>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        width: '100%',
        flex: 1,
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
          paddingBottom: SPACING.md,
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
          {validTables.map((t) =>
            renderTile(t.id, t.state, false, () => onPressTable(t.id, t.state === 'libre'))
          )}

          {renderTile('takeaway', 'takeaway', true, onSelectTakeaway)}
        </View>
      </ScrollView>
    </View>
  );
}

export const TablesGrid = React.memo(TablesGridComponent);
