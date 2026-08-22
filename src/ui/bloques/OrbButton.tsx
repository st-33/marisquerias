/**
 * Dirección visual: orbes profundos con halo contenido; cada rol es un destino
 * circular visible, no un botón plano ni una animación perpetua.
 */

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAppTheme } from '../../compartido/temas';

interface OrbButtonProps {
  icono: string;
  etiqueta: string;
  onPress: () => void;
  esPrincipal?: boolean;
  esSecundario?: boolean;
  variant?: 'role' | 'client';
}

export function OrbButton({
  icono,
  etiqueta,
  onPress,
  esPrincipal = false,
  esSecundario = false,
  variant = 'role',
}: OrbButtonProps) {
  const { colors, isElite } = useAppTheme();
  const { width } = useWindowDimensions();
  const [pressScale] = useState(() => new Animated.Value(1));
  const [haloOpacity] = useState(() => new Animated.Value(0.72));

  const isCompact = width < 480;
  const baseSize = variant === 'client' ? (isCompact ? 124 : 146) : isCompact ? 112 : 158;
  const size = esPrincipal ? baseSize + 12 : esSecundario ? baseSize + 6 : baseSize;
  const iconSize = variant === 'client' ? Math.round(size * 0.24) : Math.round(size * 0.29);

  const dynamic = useMemo(
    () =>
      StyleSheet.create({
        container: { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
        halo: {
          position: 'absolute',
          width: size + 14,
          height: size + 14,
          borderRadius: (size + 14) / 2,
          backgroundColor: isElite ? 'rgba(212,175,55,0.09)' : 'rgba(76,139,230,0.10)',
          borderWidth: 1,
          borderColor: isElite ? 'rgba(212,175,55,0.20)' : 'rgba(112,166,244,0.20)',
          shadowColor: isElite ? '#D4AF37' : '#4F8FEF',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 22,
          elevation: 12,
        },
        shell: {
          width: size,
          height: size,
          borderRadius: size / 2,
          padding: Math.max(5, Math.round(size * 0.055)),
          backgroundColor: isElite ? '#111725' : '#14213A',
          borderWidth: 1,
          borderColor: isElite ? 'rgba(212,175,55,0.42)' : 'rgba(120,172,246,0.30)',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.46,
          shadowRadius: 18,
          elevation: 16,
        },
        core: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: size / 2,
          paddingHorizontal: 8,
          backgroundColor: isElite ? '#121827' : '#172A47',
          borderWidth: 1,
          borderColor: isElite ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.08)',
        },
        iconWell: {
          width: Math.round(size * 0.39),
          height: Math.round(size * 0.39),
          borderRadius: Math.round(size * 0.195),
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: variant === 'client' ? 6 : 8,
          backgroundColor: isElite ? 'rgba(212,175,55,0.11)' : 'rgba(103,164,245,0.12)',
          borderWidth: 1,
          borderColor: isElite ? 'rgba(212,175,55,0.20)' : 'rgba(103,164,245,0.22)',
        },
        label: {
          color: colors.text,
          fontSize: Math.max(10, Math.round(size * (variant === 'client' ? 0.082 : 0.09))),
          fontWeight: '800',
          letterSpacing: Math.max(1.2, Math.round(size * 0.016)),
          textTransform: 'uppercase',
          textAlign: 'center',
        },
        sublabel: {
          marginTop: 3,
          color: isElite ? 'rgba(233,221,179,0.62)' : 'rgba(197,219,250,0.65)',
          fontSize: Math.max(7, Math.round(size * 0.056)),
          fontWeight: '600',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        },
      }),
    [colors.text, isElite, size, variant]
  );

  const animateTo = (value: number, halo: number) => {
    Animated.parallel([
      Animated.timing(pressScale, { toValue: value, duration: value < 1 ? 90 : 150, useNativeDriver: true }),
      Animated.timing(haloOpacity, { toValue: halo, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  return (
    <View style={dynamic.container}>
      <Animated.View pointerEvents="none" style={[dynamic.halo, { opacity: haloOpacity }]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Entrar a ${etiqueta}`}
        onPress={onPress}
        onPressIn={() => animateTo(0.965, 1)}
        onPressOut={() => animateTo(1, 0.72)}
      >
        <Animated.View style={[dynamic.shell, { transform: [{ scale: pressScale }] }]}>
          <View style={dynamic.core}>
            <View style={dynamic.iconWell}>
              <Ionicons name={icono as any} size={iconSize} color={isElite ? '#D4AF37' : colors.primary} />
            </View>
            <Text style={dynamic.label} numberOfLines={2}>{etiqueta}</Text>
            {variant === 'client' && <Text style={dynamic.sublabel}>Explorar</Text>}
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}
