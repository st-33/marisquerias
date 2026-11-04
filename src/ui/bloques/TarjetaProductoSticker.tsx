import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/compartido/temas';
import { useThemedColors, useThemedShadows } from '@/compartido/hooks/useColoresTema';
import { formatMoney } from '@/compartido/utils/formateadores';
import { obtenerStickerProducto } from '@/compartido/stickers';

export type TarjetaProductoStickerProps = {
  id: string;
  nombre?: string;
  precio?: number;
  stickerId?: string | null;
  ancho?: number | string;
  onPress: (id: string) => void;
};

export const TarjetaProductoSticker = React.memo(function TarjetaProductoSticker({
  id,
  nombre = 'Producto',
  precio = 0,
  stickerId,
  ancho,
  onPress,
}: TarjetaProductoStickerProps) {
  const COLORS = useThemedColors();
  const SHADOWS = useThemedShadows();

  const stickerAsset = useMemo(
    () => obtenerStickerProducto(stickerId, nombre),
    [stickerId, nombre]
  );

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress(id);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Agregar ${nombre}`}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          width: (ancho as any) ?? '100%',
          backgroundColor: pressed ? COLORS.bg.elevated : COLORS.bg.surface,
          borderColor: pressed ? COLORS.primary : COLORS.bg.elevated,
          transform: [{ scale: pressed ? 0.96 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
        SHADOWS.sm,
      ]}
    >
      {/* Etiqueta de precio estilo sticker verde */}
      <View style={styles.priceBadge}>
        <Text style={styles.priceText}>{formatMoney(Number(precio))}</Text>
      </View>

      {/* Contenedor central del sticker / ilustración */}
      <View style={styles.imageContainer}>
        {stickerAsset ? (
          <Image
            source={stickerAsset}
            style={styles.stickerImage}
            contentFit="contain"
            transition={200}
          />
        ) : (
          <View style={styles.fallbackIcon}>
            <Ionicons name="fast-food-outline" size={44} color={COLORS.text.muted} />
          </View>
        )}
      </View>

      {/* Nombre del producto */}
      <View style={styles.footer}>
        <Text style={[styles.productName, { color: COLORS.text.primary }]} numberOfLines={2}>
          {nombre}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 160,
    position: 'relative',
    overflow: 'hidden',
  },
  priceBadge: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: '#10b981', // Verde brillante como el mockup del usuario
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  priceText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  imageContainer: {
    width: '100%',
    height: 105,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  stickerImage: {
    width: '100%',
    height: '100%',
  },
  fallbackIcon: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  footer: {
    width: '100%',
    paddingTop: SPACING.xs,
    alignItems: 'center',
  },
  productName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 15,
  },
});
