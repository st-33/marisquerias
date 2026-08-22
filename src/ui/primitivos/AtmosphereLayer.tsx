/**
 * Dirección visual: material oscuro, halos de baja frecuencia y entradas breves.
 * Esta capa unifica profundidad y motion de las superficies Elite sin competir
 * con los datos operativos ni mantener animaciones perpetuas.
 */

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInLeft, FadeInRight, FadeInUp } from 'react-native-reanimated';

export type AtmosphereVariant = 'command' | 'service' | 'roles';
export type RevealAxis = 'up' | 'down' | 'left' | 'right';

type AtmosphereLayerProps = {
  variant?: AtmosphereVariant;
  style?: StyleProp<ViewStyle>;
};

const ATMOSPHERE = {
  command: {
    main: ['rgba(56, 112, 202, 0.24)', 'rgba(10, 13, 20, 0)'] as const,
    accent: ['rgba(212, 175, 55, 0.17)', 'rgba(212, 175, 55, 0)'] as const,
    ember: ['rgba(78, 208, 178, 0.12)', 'rgba(78, 208, 178, 0)'] as const,
  },
  service: {
    main: ['rgba(35, 145, 138, 0.21)', 'rgba(10, 13, 20, 0)'] as const,
    accent: ['rgba(212, 175, 55, 0.14)', 'rgba(212, 175, 55, 0)'] as const,
    ember: ['rgba(64, 125, 226, 0.13)', 'rgba(64, 125, 226, 0)'] as const,
  },
  roles: {
    main: ['rgba(58, 99, 180, 0.2)', 'rgba(10, 13, 20, 0)'] as const,
    accent: ['rgba(212, 175, 55, 0.16)', 'rgba(212, 175, 55, 0)'] as const,
    ember: ['rgba(94, 208, 176, 0.12)', 'rgba(94, 208, 176, 0)'] as const,
  },
};

export function AtmosphereLayer({ variant = 'command', style }: AtmosphereLayerProps) {
  const palette = ATMOSPHERE[variant];

  return (
    <View pointerEvents="none" style={[styles.layer, style]}>
      <LinearGradient
        colors={palette.main}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.orb, styles.mainOrb]}
      />
      <LinearGradient
        colors={palette.accent}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.orb, styles.accentOrb]}
      />
      <LinearGradient
        colors={palette.ember}
        end={{ x: 0, y: 1 }}
        start={{ x: 1, y: 0 }}
        style={[styles.orb, styles.emberOrb]}
      />
      <View style={styles.topHairline} />
    </View>
  );
}

type MotionRevealProps = {
  children: React.ReactNode;
  delay?: number;
  axis?: RevealAxis;
  style?: StyleProp<ViewStyle>;
};

export function MotionReveal({ children, delay = 0, axis = 'up', style }: MotionRevealProps) {
  const entering = {
    up: FadeInUp.delay(delay).duration(340),
    down: FadeInDown.delay(delay).duration(340),
    left: FadeInLeft.delay(delay).duration(340),
    right: FadeInRight.delay(delay).duration(340),
  }[axis];

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  orb: { position: 'absolute' },
  mainOrb: { height: 520, left: -180, top: -230, transform: [{ rotate: '-24deg' }], width: 660 },
  accentOrb: { height: 340, right: -150, top: 80, transform: [{ rotate: '18deg' }], width: 440 },
  emberOrb: { bottom: -220, height: 440, left: '26%', width: 510 },
  topHairline: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
