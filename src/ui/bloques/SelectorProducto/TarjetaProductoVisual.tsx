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
import { RADIUS, SPACING } from '@/compartido/temas';
import { useThemedColors, useThemedShadows } from '@/compartido/hooks/useColoresTema';
import { formatMoney } from '@/compartido/utils/formateadores';
import { obtenerImagenProducto } from '@/compartido/catalogoImagenes';

export type TarjetaProductoVisualProps = {
  id: string;
  nombre?: string;
  precio?: number;
  imagenId?: string | null;
  ancho?: number | string;
  onPress: (id: string) => void;
};

export const TarjetaProductoVisual = React.memo(function TarjetaProductoVisual({
  id,
  nombre = 'Producto',
  precio = 0,
  imagenId,
  ancho,
  onPress,
}: TarjetaProductoVisualProps) {
  const COLORS = useThemedColors();
  const SHADOWS = useThemedShadows();

  const imagenAsset = useMemo(
    () => obtenerImagenProducto(imagenId, nombre),
    [imagenId, nombre]
  );

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress(id);
  };

  const siglas = useMemo(() => {
    if (!nombre) return 'P';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }, [nombre]);

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
      {/* Etiqueta de precio flotante en verde esmeralda */}
      <View style={styles.priceBadge}>
        <Text style={styles.priceText}>{formatMoney(Number(precio))}</Text>
      </View>

      {/* Contenedor central: Imagen hero si existe, o badge tipográfico agnóstico */}
      <View style={styles.imageContainer}>
        {imagenAsset ? (
          <Image
            source={imagenAsset}
            style={styles.productImage}
            contentFit="contain"
            transition={200}
          />
        ) : (
          <View style={[styles.fallbackBadge, { backgroundColor: COLORS.bg.tertiary, borderColor: COLORS.bg.elevated }]}>
            <Text style={[styles.fallbackInitials, { color: COLORS.primary }]}>
              {siglas}
            </Text>
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

// Alias de retrocompatibilidad
export const TarjetaProductoSticker = TarjetaProductoVisual;

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
    backgroundColor: '#10b981',
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
  productImage: {
    width: '100%',
    height: '100%',
  },
  fallbackBadge: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackInitials: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
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
