/**
 * 🔊 PROVIDER GLOBAL DE AUDIO PARA NOTIFICACIONES
 * Solución robusta al bug de "AudioPlayer already released"
 *
 * PROBLEMA:
 * - useAudioPlayer() crea un player que se libera al desmontar el componente
 * - Si el listener de notificaciones dispara después del desmontaje, crashea
 *
 * SOLUCIÓN:
 * - Player único global que NUNCA se desmonta
 * - Usar replay() en lugar de play() para reiniciar desde el inicio
 * - Guardas para evitar llamadas sobre player liberado
 */

import { useAudioPlayer } from 'expo-audio';
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

type NotificationsAudioContextType = {
  playNotificationSound: () => void;
};

const NotificationsAudioContext = createContext<NotificationsAudioContextType | null>(null);

function ProveedorAudioNotificacionesWeb({ children }: { children: React.ReactNode }) {
  const playNotificationSound = () => {
    return;
  };

  return (
    <NotificationsAudioContext.Provider value={{ playNotificationSound }}>
      {children}
    </NotificationsAudioContext.Provider>
  );
}

function ProveedorAudioNotificacionesNative({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer(require('@assets/sounds/huge.wav'));
  const isPlayerReady = useRef(false);

  useEffect(() => {
    isPlayerReady.current = true;
    return () => {
      isPlayerReady.current = false;
    };
  }, []);

  const playNotificationSound = () => {
    try {
      if (!isPlayerReady.current) {
        console.warn('[NotificationsAudio] Player no está listo');
        return;
      }

      if (player.playing) {
        try {
          player.pause();
          player.seekTo(0);
        } catch {
          // Ignorar errores de pause/seek
        }
      }

      try {
        player.play();
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        if (
          errorMsg.includes('not allowed') ||
          errorMsg.includes('permission') ||
          errorMsg.includes('user agent') ||
          errorMsg.includes('platform')
        ) {
          return;
        }
        throw error;
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (
        errorMsg.includes('not allowed') ||
        errorMsg.includes('permission') ||
        errorMsg.includes('user agent') ||
        errorMsg.includes('platform')
      ) {
        return;
      }
      console.warn('[NotificationsAudio] Error playing sound:', errorMsg);
    }
  };

  return (
    <NotificationsAudioContext.Provider value={{ playNotificationSound }}>
      {children}
    </NotificationsAudioContext.Provider>
  );
}

export function ProveedorAudioNotificaciones({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'web') {
    return <ProveedorAudioNotificacionesWeb>{children}</ProveedorAudioNotificacionesWeb>;
  }
  return <ProveedorAudioNotificacionesNative>{children}</ProveedorAudioNotificacionesNative>;
}

/**
 * Hook para usar el audio de notificaciones
 */
export function useAudioNotificaciones() {
  const context = useContext(NotificationsAudioContext);
  if (!context) {
    throw new Error('useAudioNotificaciones debe usarse dentro de ProveedorAudioNotificaciones');
  }
  return context;
}
