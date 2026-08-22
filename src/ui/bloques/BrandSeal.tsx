/**
 * Dirección visual: sello compacto de Puerto Libres; deja que los orbes sean
 * el foco primario y evita un hero vacío antes de la selección de roles.
 */

import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAppTheme } from '../../compartido/temas';

interface BrandSealProps {
  nombreNegocio: string;
}

export function BrandSeal({ nombreNegocio }: BrandSealProps) {
  const { colors, isElite } = useAppTheme();
  const { height, width } = useWindowDimensions();
  const titleSize = Math.max(25, Math.min(42, Math.round(width * 0.034)));

  const styles = StyleSheet.create({
    brandSeal: {
      alignItems: 'center',
      marginTop: Math.max(28, Math.min(72, Math.round(height * 0.07))),
      marginBottom: Math.max(24, Math.min(44, Math.round(height * 0.04))),
      paddingHorizontal: 18,
      width: '100%',
    },
    eyebrow: {
      color: isElite ? 'rgba(212,175,55,0.78)' : colors.secondary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 3.4,
      marginBottom: 9,
      textTransform: 'uppercase',
    },
    brandTitle: {
      color: colors.text,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
      fontSize: titleSize,
      fontWeight: '700',
      letterSpacing: Math.min(6, Math.max(2, titleSize * 0.12)),
      textAlign: 'center',
      textShadowColor: isElite ? 'rgba(212,175,55,0.24)' : 'rgba(37,99,235,0.22)',
      textShadowOffset: { width: 0, height: 3 },
      textShadowRadius: 14,
      textTransform: 'uppercase',
    },
    brandLema: {
      color: isElite ? '#D4AF37' : colors.primary,
      fontSize: 11,
      fontStyle: 'italic',
      fontWeight: '600',
      letterSpacing: 3.1,
      marginTop: 12,
      opacity: 0.88,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.brandSeal}>
      <Text style={styles.eyebrow}>Centro de roles</Text>
      <Text style={styles.brandTitle} numberOfLines={2} adjustsFontSizeToFit>{nombreNegocio}</Text>
      {isElite && <Text style={styles.brandLema}>¡Hasta en el Caos Hay Orden!</Text>}
    </View>
  );
}
