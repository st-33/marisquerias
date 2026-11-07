import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/compartido/temas';
import type { PestanaProducto } from './tipos';

export type BarraPestanasModalProductoProps = {
  pestana: PestanaProducto;
  onPestanaChange: (pestana: PestanaProducto) => void;
};

export const BarraPestanasModalProducto = React.memo(function BarraPestanasModalProducto({
  pestana,
  onPestanaChange,
}: BarraPestanasModalProductoProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
      <Pressable
        style={[
          styles.tabBtn,
          pestana === 'basico' && {
            backgroundColor: `${colors.primary}22`,
            borderColor: `${colors.primary}66`,
          },
        ]}
        onPress={() => onPestanaChange('basico')}
      >
        <Ionicons
          name="pricetag-outline"
          size={17}
          color={pestana === 'basico' ? colors.primaryLight : colors.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            { color: pestana === 'basico' ? colors.primaryLight : colors.textSecondary },
            pestana === 'basico' && styles.tabTextActive,
          ]}
        >
          1. Oferta & Precio
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.tabBtn,
          pestana === 'variantes' && {
            backgroundColor: `${colors.primary}22`,
            borderColor: `${colors.primary}66`,
          },
        ]}
        onPress={() => onPestanaChange('variantes')}
      >
        <Ionicons
          name="options-outline"
          size={17}
          color={pestana === 'variantes' ? colors.primaryLight : colors.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            { color: pestana === 'variantes' ? colors.primaryLight : colors.textSecondary },
            pestana === 'variantes' && styles.tabTextActive,
          ]}
        >
          2. Variantes & Preparación
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.tabBtn,
          pestana === 'inventario' && {
            backgroundColor: `${colors.primary}22`,
            borderColor: `${colors.primary}66`,
          },
        ]}
        onPress={() => onPestanaChange('inventario')}
      >
        <Ionicons
          name="cube-outline"
          size={17}
          color={pestana === 'inventario' ? colors.primaryLight : colors.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            { color: pestana === 'inventario' ? colors.primaryLight : colors.textSecondary },
            pestana === 'inventario' && styles.tabTextActive,
          ]}
        >
          3. Área de Descuento
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '800',
  },
});
