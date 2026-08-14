/**
 * 🔘 ORB BUTTON - THEME-AWARE
 * Botón de rol con colores dinámicos según tema
 */

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../compartido/temas';

// [11Ene8:47.pm] Dimensiones de pantalla para cálculos de tamaño
const { width: SCREEN_WIDTH } = Dimensions.get('window');
// [11Ene8:47.pm] SCALE: factor responsivo (<480px=0.85, <1024px=1.0, >=1024px=1.4)
const SCALE = SCREEN_WIDTH < 480 ? 0.85 : SCREEN_WIDTH < 1024 ? 1.0 : 1.4;

interface OrbButtonProps {
  icono: string;
  etiqueta: string;
  onPress: () => void;
  esPrincipal?: boolean;
  esSecundario?: boolean;
}

export function OrbButton({
  icono,
  etiqueta,
  onPress,
  esPrincipal = false,
  esSecundario = false,
}: OrbButtonProps) {
  // [11Ene8:47.pm] colors=paleta dinámica, isElite=modo premium, theme.scale=factor de escala
  const { colors, isElite, theme } = useAppTheme();

  // [11Ene8:47.pm] ANIMACIONES: scaleAnim=escala del botón, haloScale/Opacity=efecto de aureola
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [haloScale] = useState(() => new Animated.Value(1));
  const [haloOpacity] = useState(() => new Animated.Value(0));
  // [11Ene8:47.pm] isAnimatingRef: previene animaciones duplicadas durante interacción
  const isAnimatingRef = useRef(false);
  // [11Jul26:09.am] timerRef: previene memory leaks al desmontar rápido
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // [11Ene8:47.pm] CLEANUP: detiene y resetea animaciones al desmontar componente
  useEffect(() => {
    return () => {
      haloScale.stopAnimation();
      haloOpacity.stopAnimation();
      scaleAnim.stopAnimation();
      haloScale.setValue(1);
      haloOpacity.setValue(0);
      scaleAnim.setValue(1);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [haloScale, haloOpacity, scaleAnim]);

  // [11Ene8:47.pm] resetInstant: reinicia todas las animaciones a valores base inmediatamente
  const resetInstant = () => {
    haloScale.stopAnimation();
    haloOpacity.stopAnimation();
    scaleAnim.stopAnimation();
    haloScale.setValue(1);
    haloOpacity.setValue(0);
    scaleAnim.setValue(1);
    isAnimatingRef.current = false;
  };

  // [11Ene8:47.pm] handlePressIn: animación al TOCAR el botón (antes de soltar)
  const handlePressIn = () => {
    if (isAnimatingRef.current) return;

    Animated.parallel([
      Animated.spring(scaleAnim, {
        // [11Ene8:47.pm] toValue 1.06: botón crece 6% al presionar (subir = más crecimiento)
        toValue: 1.06,
        useNativeDriver: true,
        // [11Ene8:47.pm] friction: resistencia del spring (subir = menos rebote)
        friction: 6,
        // [11Ene8:47.pm] tension: rigidez del spring (subir = más rápido)
        tension: 100,
      }),
      Animated.timing(haloOpacity, {
        // [11Ene8:47.pm] halo aparece al 40% de opacidad al presionar
        toValue: 0.4,
        // [11Ene8:47.pm] duration 120ms: velocidad de aparición del halo
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // [11Ene8:47.pm] handlePressOut: animación al SOLTAR el botón + dispara onPress
  const handlePressOut = () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    haloScale.setValue(1);
    haloOpacity.setValue(0.5);

    Animated.parallel([
      Animated.timing(haloScale, {
        // [11Ene8:47.pm] halo se expande 40% al soltar (efecto ripple)
        toValue: 1.4,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(haloOpacity, {
        // [11Ene8:47.pm] halo se desvanece a 0 (efecto ripple)
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        // [11Ene8:47.pm] botón regresa a tamaño normal
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }),
    ]).start();

    // [11Ene8:47.pm] setTimeout 30ms: pequeño delay antes de ejecutar onPress (UX feedback)
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      resetInstant();
      onPress();
    }, 30);
  };

  // [11Ene8:47.pm] TAMAÑOS BASE: principal=180px, secundario=170px, normal=160px (escalados)
  const size = esPrincipal
    ? Math.round(180 * SCALE)
    : esSecundario
    ? Math.round(170 * SCALE)
    : Math.round(160 * SCALE);

  // [11Ene8:47.pm] iconSize: 55% del tamaño del botón para que quepa dentro del círculo
  const iconSize = Math.round(size * 0.55);
  // [11Ene8:47.pm] labelSize: tamaño de la etiqueta (base 9px escalado)
  const labelSize = Math.round(18 * theme.scale);

  // Estilos dinámicos
  const dynamicStyles = StyleSheet.create({
    orb: {
      // [11Ene8:47.pm] backgroundColor: color glass del tema (fondo semitransparente)
      backgroundColor: colors.glass,
      alignItems: 'center',
      justifyContent: 'center',
      // [11Ene8:47.pm] shadowColor: color primario del tema para el brillo
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      // [11Ene8:47.pm] shadowOpacity: principal=35%, otros=20% (intensidad del brillo)
      shadowOpacity: esPrincipal ? 0.35 : 0.2,
      // [11Ene8:47.pm] shadowRadius: principal=25, otros=18 (expansión del brillo)
      shadowRadius: esPrincipal ? 25 : 18,
      // [11Ene8:47.pm] elevation: sombra en Android
      elevation: 20,
      width: size,
      height: size,
      // [11Ene8:47.pm] borderRadius: size/2 = círculo perfecto
      borderRadius: size / 2,
    },
    halo: {
      position: 'absolute',
      // [11Ene8:47.pm] backgroundColor halo: Elite=dorado, Normal=azul (20% opacidad)
      backgroundColor: isElite ? 'rgba(197, 160, 89, 0.2)' : 'rgba(37, 99, 235, 0.2)',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      // [11Ene8:47.pm] shadowOpacity halo: 60% de intensidad
      shadowOpacity: 0.6,
      // [11Ene8:47.pm] shadowRadius halo: 35px de expansión del brillo
      shadowRadius: 35,
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    label: {
      // [11Ene8:47.pm] marginTop: separación entre icono y etiqueta
      marginTop: 5,
      // [11Ene8:47.pm] letterSpacing: espaciado entre letras de la etiqueta
      letterSpacing: 2,
      textTransform: 'uppercase',
      fontWeight: '800',
      // [11Ene8:47.pm] color: usa textSecondary del tema para la etiqueta
      color: colors.textSecondary,
      fontSize: labelSize,
    },
  });

  return (
    <View style={[staticStyles.container, { width: size, height: size }]}>
      {/* [11Ene8:47.pm] HALO: capa de aureola animada detrás del botón */}
      <Animated.View
        style={[
          dynamicStyles.halo,
          {
            transform: [{ scale: haloScale }],
            opacity: haloOpacity,
          },
        ]}
        pointerEvents="none"
      />

      {/* [11Ene8:47.pm] PRESSABLE: zona táctil del botón */}
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View style={[dynamicStyles.orb, { transform: [{ scale: scaleAnim }] }]}>
          {/* [11Ene8:47.pm] ICONO: usa Ionicons, tamaño=iconSize, color=primario del tema */}
          <Ionicons
            name={icono as any}
            size={iconSize}
            color={colors.primary}
            // [11Ene8:47.pm] textShadowRadius 15: brillo sutil alrededor del icono
            style={{ textShadowColor: colors.primary, textShadowRadius: 15 }}
          />
          {/* [11Ene8:47.pm] ETIQUETA: texto debajo del icono */}
          <Text style={dynamicStyles.label}>{etiqueta}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
