/**
 * 🎯 GESTOS NATIVOS - ANDROID
 *
 * Maneja gestos para navegación sin botones físicos
 * - Deslizar desde borde izquierdo → Back
 * - Deslizar desde abajo → Home/Salir
 */

import { useEffect, useMemo, useRef } from 'react';
import { BackHandler, Dimensions, PanResponder } from 'react-native';
import { router } from 'expo-router';

type GestureConfig = {
  enableBackGesture?: boolean;
  enableHomeGesture?: boolean;
  onBack?: () => boolean | void;
  onHome?: () => void;
};

export function useGestureNavigation(config: GestureConfig = {}) {
  const { enableBackGesture = true, enableHomeGesture = true, onBack, onHome } = config;

  const { width, height } = Dimensions.get('window');
  const EDGE_THRESHOLD = 30; // Área desde el borde para iniciar gesto
  const SWIPE_THRESHOLD = width * 0.3; // 30% de la pantalla para confirmar
  const HOME_THRESHOLD = height * 0.5; // 50% de la pantalla para salir

  const gestureState = useRef({
    isBackGesture: false,
    isHomeGesture: false,
    startX: 0,
    startY: 0,
  });

  // PanResponder para gestos
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;

          // Detectar inicio de gesto de back (borde izquierdo)
          if (enableBackGesture && locationX < EDGE_THRESHOLD) {
            gestureState.current.isBackGesture = true;
            gestureState.current.startX = locationX;
            return true;
          }

          // Detectar inicio de gesto de home (borde inferior)
          if (enableHomeGesture && locationY > height - EDGE_THRESHOLD) {
            gestureState.current.isHomeGesture = true;
            gestureState.current.startY = locationY;
            return true;
          }

          return false;
        },

        onMoveShouldSetPanResponder: () => {
          return gestureState.current.isBackGesture || gestureState.current.isHomeGesture;
        },

        onPanResponderMove: (evt, gestureState) => {
          // Aquí podrías agregar feedback visual si quieres
        },

        onPanResponderRelease: (evt, gesture) => {
          const { dx, dy } = gesture;

          // Gesto de BACK (deslizar desde izquierda hacia derecha)
          if (gestureState.current.isBackGesture && dx > SWIPE_THRESHOLD) {
            if (onBack) {
              const handled = onBack();
              if (handled !== false) {
                router.back();
              }
            } else {
              router.back();
            }
          }

          // Gesto de HOME (deslizar desde abajo hacia arriba)
          if (gestureState.current.isHomeGesture && Math.abs(dy) > HOME_THRESHOLD) {
            if (onHome) {
              onHome();
            } else {
              // Salir de la app (Android)
              BackHandler.exitApp();
            }
          }

          // Reset
          gestureState.current.isBackGesture = false;
          gestureState.current.isHomeGesture = false;
        },

        onPanResponderTerminate: () => {
          gestureState.current.isBackGesture = false;
          gestureState.current.isHomeGesture = false;
        },
      }),
    [enableBackGesture, enableHomeGesture, height, SWIPE_THRESHOLD, HOME_THRESHOLD, onBack, onHome]
  );

  // Manejar botón físico de back (si existe)
  useEffect(() => {
    if (!enableBackGesture) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onBack) {
        const handled = onBack();
        return handled !== false;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [enableBackGesture, onBack]);

  return {
    panHandlers: panResponder.panHandlers,
  };
}
