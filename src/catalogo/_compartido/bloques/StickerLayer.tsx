/**
 * 🎭 STICKER LAYER - THEME-AWARE
 * Solo se muestra en tema Elite
 */

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../../../compartido/temas';

// [11Ene8:47.pm] Dimensiones de pantalla para cálculos de tamaño
const { width: SCREEN_WIDTH } = Dimensions.get('window');
// [11Ene8:47.pm] SCALE: factor responsivo (<480px=0.85, <1024px=1.0, >=1024px=1.4)
const SCALE = SCREEN_WIDTH < 480 ? 0.85 : SCREEN_WIDTH < 1024 ? 1.0 : 1.4;

// [11Ene8:47.pm] STICKERS_CONFIG: configuración de cada sticker decorativo
// - icon: nombre del icono Ionicons (fish, compass, boat, nutrition, water, leaf)
// - size: tamaño en px (subir = sticker más grande)
// - left/top: posición en porcentaje de pantalla
// - delay: retardo en ms antes de iniciar animación
// - duration: duración del ciclo de flotación en ms (subir = más lento)
const STICKERS_CONFIG = [
  {
    icon: 'fish',
    size: Math.round(300 * SCALE),
    left: '-10%',
    top: '5%',
    delay: 0,
    duration: 28000,
  },
  {
    icon: 'compass',
    size: Math.round(200 * SCALE),
    left: '70%',
    top: '35%',
    delay: 2000,
    duration: 32000,
  },
  {
    icon: 'boat',
    size: Math.round(200 * SCALE),
    left: '45%',
    top: '-8%',
    delay: 4000,
    duration: 30000,
  },
  {
    icon: 'nutrition',
    size: Math.round(280 * SCALE),
    left: '-15%',
    top: '55%',
    delay: 6000,
    duration: 26000,
  },
  {
    icon: 'water',
    size: Math.round(380 * SCALE),
    left: '55%',
    top: '65%',
    delay: 1000,
    duration: 28000,
  },
  {
    icon: 'leaf',
    size: Math.round(260 * SCALE),
    left: '80%',
    top: '0%',
    delay: 3000,
    duration: 24000,
  },
];

interface FloatingStickerProps {
  icon: string;
  size: number;
  left: string;
  top: string;
  delay: number;
  duration: number;
  color: string;
  opacity: number;
}

// [11Ene8:47.pm] FloatingSticker: componente individual de cada sticker animado
function FloatingSticker({
  icon,
  size,
  left,
  top,
  delay,
  duration,
  color,
  opacity,
}: FloatingStickerProps) {
  // [11Ene8:47.pm] floatAnim: controla movimiento vertical, rotateAnim: controla rotación
  const [floatAnim] = useState(() => new Animated.Value(0));
  const [rotateAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // [11Ene8:47.pm] FLOTACIÓN: loop infinito de movimiento vertical (0→1→0)
    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration,
          // [11Ene8:47.pm] Easing sinusoidal: movimiento orgánico tipo onda
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // [11Ene8:47.pm] ROTACIÓN: loop infinito de balanceo (0→1→0), 1.2x más lento que flotación
    const rotating = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          // [11Ene8:47.pm] duration * 1.2: rotación 20% más lenta que flotación para efecto asíncrono
          duration: duration * 1.2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: duration * 1.2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // [11Ene8:47.pm] setTimeout: inicia animaciones después del delay configurado
    setTimeout(() => {
      floating.start();
      rotating.start();
    }, delay);

    return () => {
      floating.stop();
      rotating.stop();
    };
  }, [floatAnim, rotateAnim, delay, duration]);

  // [11Ene8:47.pm] translateY: desplazamiento vertical (0 → -30*SCALE px), subir 30 = más flotación
  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30 * SCALE],
  });

  // [11Ene8:47.pm] rotate: balanceo (-3deg → +3deg → -3deg), subir grados = más inclinación
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-3deg', '3deg', '-3deg'],
  });

  return (
    <Animated.View
      style={[
        styles.sticker,
        {
          left: left as any,
          top: top as any,
          // [11Ene8:47.pm] opacity: transparencia heredada de theme.stickerOpacity
          opacity,
          transform: [{ translateY }, { rotate }],
        },
      ]}
    >
      {/* [11Ene8:47.pm] ICONO: renderiza Ionicons con tamaño y color dinámicos */}
      <Ionicons name={icon as any} size={size} color={color} />
    </Animated.View>
  );
}

export function StickerLayer() {
  // [11Ene8:47.pm] colors=paleta, isElite=modo premium, theme.stickerOpacity=opacidad de stickers
  const { colors, isElite, theme } = useAppTheme();

  // [11Ene8:47.pm] GUARD: componente solo se renderiza si isElite=true
  if (!isElite) return null;

  return (
    // [11Ene8:47.pm] pointerEvents="none": stickers no bloquean interacción táctil
    <View style={styles.container} pointerEvents="none">
      {/* [11Ene8:47.pm] Renderiza todos los stickers del array con color primario y opacidad del tema */}
      {STICKERS_CONFIG.map((sticker, index) => (
        <FloatingSticker
          key={index}
          {...sticker}
          // [11Ene8:47.pm] color: usa colors.primary del tema activo
          color={colors.primary}
          // [11Ene8:47.pm] opacity: usa theme.stickerOpacity (configurable por tema)
          opacity={theme.stickerOpacity}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    // [11Ene8:47.pm] zIndex 0: capa detrás del contenido principal
    zIndex: 0,
    overflow: 'hidden',
  },
  sticker: {
    position: 'absolute',
  },
});
