/**
 * 🎯 GESTOS NATIVOS - ANDROID
 *
 * Maneja gestos para navegación sin botones físicos
 * - Deslizar desde borde izquierdo → Back
 * - Deslizar desde abajo → Home/Salir
 */

import { useEffect, useRef, useState } from 'react';
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
  const configRef = useRef({ enableBackGesture, enableHomeGesture, onBack, onHome });
  const metricsRef = useRef({ height, SWIPE_THRESHOLD, HOME_THRESHOLD });

  useEffect(() => {
    configRef.current = { enableBackGesture, enableHomeGesture, onBack, onHome };
    metricsRef.current = { height, SWIPE_THRESHOLD, HOME_THRESHOLD };
  }, [
    enableBackGesture,
    enableHomeGesture,
    height,
    HOME_THRESHOLD,
    onBack,
    onHome,
    SWIPE_THRESHOLD,
  ]);

  // PanResponder para gestos. Se crea una vez y consulta refs actualizadas.
  // eslint-disable-next-line react-hooks/refs -- PanResponder es una instancia imperativa estable.
  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const currentConfig = configRef.current;

        // Detectar inicio de gesto de back (borde izquierdo)
        if (currentConfig.enableBackGesture && locationX < EDGE_THRESHOLD) {
          gestureState.current.isBackGesture = true;
          gestureState.current.startX = locationX;
          return true;
        }

        // Detectar inicio de gesto de home (borde inferior)
        if (
          currentConfig.enableHomeGesture &&
          locationY > metricsRef.current.height - EDGE_THRESHOLD
        ) {
          gestureState.current.isHomeGesture = true;
          gestureState.current.startY = locationY;
          return true;
        }

        return false;
      },

      onMoveShouldSetPanResponder: () => {
        return gestureState.current.isBackGesture || gestureState.current.isHomeGesture;
      },

      onPanResponderMove: () => {
        // Aquí podrías agregar feedback visual si quieres
      },

      onPanResponderRelease: (_evt, gesture) => {
        const { dx, dy } = gesture;
        const currentConfig = configRef.current;
        const currentMetrics = metricsRef.current;

        // Gesto de BACK (deslizar desde izquierda hacia derecha)
        if (gestureState.current.isBackGesture && dx > currentMetrics.SWIPE_THRESHOLD) {
          if (currentConfig.onBack) {
            const handled = currentConfig.onBack();
            if (handled !== false) {
              router.back();
            }
          } else {
            router.back();
          }
        }

        // Gesto de HOME (deslizar desde abajo hacia arriba)
        if (gestureState.current.isHomeGesture && Math.abs(dy) > currentMetrics.HOME_THRESHOLD) {
          if (currentConfig.onHome) {
            currentConfig.onHome();
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
    })
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
