/**
 * 🏷️ BRAND SEAL - THEME-AWARE
 * Nombre del negocio + slogan con colores dinámicos
 */

import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../compartido/temas';

// [11Ene8:47.pm] SCREEN_HEIGHT: altura de pantalla usada para cálculos de margen
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BrandSealProps {
  nombreNegocio: string;
}

export function BrandSeal({ nombreNegocio }: BrandSealProps) {
  // [11Ene8:47.pm] colors=paleta dinámica, theme.scale=factor de escala, isElite=modo premium activo
  const { colors, theme, isElite } = useAppTheme();

  const dynamicStyles = StyleSheet.create({
    brandSeal: {
      alignItems: 'center',
      // [11Ene8:47.pm] marginTop: subir valor = más espacio arriba del título (12% de pantalla)
      marginTop: SCREEN_HEIGHT * 0.12,
      // [11Ene8:47.pm] marginBottom: subir valor = más espacio debajo del título (5% de pantalla)
      marginBottom: SCREEN_HEIGHT * 0.1,
      // [11Ene8:47.pm] paddingHorizontal: margen lateral del contenedor
      paddingHorizontal: 10,
      width: '100%',
    },
    brandTitle: {
      // [11Ene8:47.pm] fontFamily: tipografía según plataforma y modo Elite (Georgia/serif para Elite)
      fontFamily:
        Platform.OS === 'ios' ? (isElite ? 'Georgia' : 'System') : isElite ? 'serif' : 'sans-serif',
      // [11Ene8:47.pm] fontSize: si nombre >18 chars usa 24, sino 32 (escalado por theme.scale)
      fontSize: Math.round((nombreNegocio.length > 24 ? 30 : 36) * theme.scale),
      fontWeight: '700',
      // [11Ene8:47.pm] letterSpacing: espaciado entre letras (máx 8px)
      letterSpacing: Math.min(8, Math.round(6 * theme.scale)),
      textTransform: 'uppercase',
      // [11Ene8:47.pm] color: color del texto desde paleta dinámica
      color: colors.text,
      // [11Ene8:47.pm] textShadowColor: Elite=dorado(197,160,89), Normal=azul(37,99,235)
      textShadowColor: isElite ? 'rgba(197,160,89,0.6)' : 'rgba(37,99,235,0.3)',
      textShadowOffset: { width: 0, height: 0 },
      // [11Ene8:47.pm] textShadowRadius: subir = sombra más difusa/expandida
      textShadowRadius: 30,
      textAlign: 'center',
    },
    brandLema: {
      // [11Ene8:47.pm] fontSize del lema: base 12px escalado
      fontSize: Math.round(12 * theme.scale),
      // [11Ene8:47.pm] letterSpacing del lema: espaciado entre letras (máx 8px)
      letterSpacing: Math.min(8, Math.round(4 * theme.scale)),
      fontStyle: 'italic',
      // [11Ene8:47.pm] color del lema: usa color primario del tema
      color: colors.primary,
      // [11Ene8:47.pm] marginTop: separación entre título y lema
      marginTop: Math.round(15 * theme.scale),
      fontWeight: '500',
      // [11Ene8:47.pm] opacity: bajar = lema más transparente
      opacity: 0.9,
    },
  });

  return (
    <View style={dynamicStyles.brandSeal}>
      <Text style={dynamicStyles.brandTitle} numberOfLines={2} adjustsFontSizeToFit>
        {nombreNegocio}
      </Text>
      {/* [11Ene8:47.pm] CONDICIONAL: lema solo visible si isElite=true */}
      {isElite && (
        // [11Ene8:47.pm] TEXTO DEL LEMA: cambiar aquí para modificar el slogan
        <Text style={dynamicStyles.brandLema}>¡Hasta en el Caos Hay Orden!</Text>
      )}
    </View>
  );
}
