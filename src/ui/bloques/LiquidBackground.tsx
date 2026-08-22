/**
 * 🌊 LIQUID BACKGROUND - THEME-AWARE
 * Solo se muestra en tema Elite
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../../compartido/temas';

// [11Ene8:47.pm] Dimensiones de pantalla para cálculos de posicionamiento
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// [11Ene8:47.pm] SCALE: factor responsivo (<480px=0.85, <1024px=1.0, >=1024px=1.4)
const SCALE = SCREEN_WIDTH < 480 ? 0.85 : SCREEN_WIDTH < 1024 ? 1.0 : 1.4;

// [11Ene8:47.pm] ORBES: array de configuración de cada orbe flotante
// - size: tamaño en px (subir = orbe más grande)
// - left/right/top/bottom: posición inicial (negativos = parcialmente fuera de pantalla)
// - delay: retardo en ms antes de iniciar animación
// - duration: duración completa del ciclo de animación en ms (subir = más lento)
const ORBES = [
  { size: Math.round(500 * SCALE), left: -100, top: -150, delay: 0, duration: 22000 },
  { size: Math.round(400 * SCALE), right: -80, top: 100, delay: 3000, duration: 25000 },
  { size: Math.round(450 * SCALE), left: 50, bottom: -100, delay: 6000, duration: 28000 },
  { size: Math.round(350 * SCALE), right: -50, bottom: 150, delay: 9000, duration: 24000 },
  {
    size: Math.round(300 * SCALE),
    left: -60,
    top: SCREEN_HEIGHT * 0.4,
    delay: 4000,
    duration: 26000,
  },
];

interface FloatingOrbProps {
  size: number;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  delay: number;
  duration: number;
  color: string;
}

// [11Ene8:47.pm] FloatingOrb: componente individual de cada orbe animado
function FloatingOrb({ size, left, right, top, bottom, delay, duration, color }: FloatingOrbProps) {
  const [animValue] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // [11Ene8:47.pm] LOOP INFINITO: animación sube(0→1) y baja(1→0) continuamente
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration,
          // [11Ene8:47.pm] Easing.inOut(Easing.sin): movimiento tipo onda sinusoidal suave
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
          delay,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animValue, delay, duration]);

  // [11Ene8:47.pm] translateY: desplazamiento vertical (0→35px→0), subir 35 = más movimiento vertical
  const translateY = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 35, 0],
  });

  // [11Ene8:47.pm] translateX: desplazamiento horizontal (0→20px→0), subir 20 = más movimiento lateral
  const translateX = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 20, 0],
  });

  // [11Ene8:47.pm] scale: escala pulsante (1→1.12→1), subir 1.12 = orbe crece más al pulsar
  const scale = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.12, 1],
  });

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          left,
          right,
          top,
          bottom,
          // [11Ene8:47.pm] backgroundColor hereda colors.primary del tema
          backgroundColor: color,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
    />
  );
}

export function LiquidBackground() {
  const { colors, isElite } = useAppTheme();

  // [11Ene8:47.pm] GUARD: componente solo se renderiza si isElite=true
  if (!isElite) return null;

  return (
    <View style={styles.container}>
      {/* [11Ene8:47.pm] LinearGradient: fondo degradado diagonal
          - colors: array de colores del gradiente
          - locations: posiciones 0-1 donde aparece cada color */}
      <LinearGradient
        colors={['#000000', colors.background, '#0a0a0c', colors.background, '#000000']}
        style={StyleSheet.absoluteFill}
        // [11Ene8:47.pm] start/end: dirección del gradiente (0,0)→(1,1) = diagonal
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.2, 0.5, 0.8, 1]}
      />

      {/* [11Ene8:47.pm] Renderiza todos los orbes del array ORBES con color primario del tema */}
      {ORBES.map((orb, index) => (
        <FloatingOrb key={index} {...orb} color={colors.primary} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    // [11Ene8:47.pm] borderRadius: valor alto = forma perfectamente circular
    borderRadius: 1000,
    // [11Ene8:47.pm] opacity: subir = orbes más visibles (actual 10%)
    opacity: 0.1,
  },
});
