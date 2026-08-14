/**
 * 🖥️ MODO INMERSIVO - ANDROID
 *
 * Oculta status bar y navigation bar (requiere rebuild para navigation bar)
 * Para apps de punto de venta que necesitan pantalla completa
 */

import { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

export function useImmersiveMode(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const setupImmersive = async () => {
      try {
        // OCULTAR STATUS BAR (funciona sin rebuild)
        if (Platform.OS === 'android') {
          StatusBar.setHidden(true, 'fade');
          StatusBar.setTranslucent(true);
          StatusBar.setBackgroundColor('transparent');
        }

        await hideNavigationBar();
      } catch (error) {
        console.warn('[ImmersiveMode] ⚠️ Error:', error);
      }
    };

    setupImmersive();

    // Cleanup
    return () => {
      restoreNavigationBar().catch(() => {});
    };
  }, [enabled]);
}

export function useStatusBarHidden(hidden: boolean = true) {
  useEffect(() => {
    StatusBar.setHidden(hidden, 'fade');
    return () => StatusBar.setHidden(false, 'fade');
  }, [hidden]);
}

async function hideNavigationBar() {
  if (Platform.OS !== 'android') return;
  try {
    await NavigationBar.setVisibilityAsync('hidden');
    console.log('[ImmersiveMode] ✅ Navigation bar hidden');
  } catch {
    console.log('[ImmersiveMode] ℹ️ Navigation bar module no disponible (requiere rebuild)');
  }
}

async function restoreNavigationBar() {
  if (Platform.OS !== 'android') return;
  try {
    await NavigationBar.setVisibilityAsync('visible');
  } catch {
    // Silencio
  }
}
