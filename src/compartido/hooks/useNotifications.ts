/**
 * 🔔 HOOK DE NOTIFICACIONES
 * Sistema unificado de notificaciones de audio + toast para todos los roles
 *
 * CASOS DE USO:
 * - Mesero: Notificar cuando items están listos (audio + toast)
 * - Cocina/Admin: Notificar cuando mesero imprime/libera (solo audio)
 *
 * AUDIO: /assets/sounds/huge.wav
 *
 * FIX: Usa ProveedorAudioNotificaciones para evitar "AudioPlayer already released"
 */

import { useCallback } from 'react';
import { useAudioNotificaciones } from '../../sistema/proveedores/ProveedorAudioNotificaciones';

export type NotificationType =
  | 'item_listo' // Item de cocina → listo (mesero)
  | 'ticket_impreso' // Mesero imprimió (cocina/admin)
  | 'mesa_liberada'; // Mesero liberó mesa (cocina/admin)

export type NotificationPayload = {
  type: NotificationType;
  mesaId: string;
  itemName?: string; // Solo para item_listo
  onPress?: () => void; // Callback al tocar toast
};

export function useNotifications() {
  // 🔊 Usar el audio provider global (fix para "AudioPlayer already released")
  const { playNotificationSound } = useAudioNotificaciones();

  /**
   * Reproducir sonido de notificación
   */
  const playSound = useCallback(() => {
    playNotificationSound();
  }, [playNotificationSound]);

  /**
   * Mostrar notificación según tipo y rol
   */
  const notify = useCallback(
    (payload: NotificationPayload, currentRole: 'mesero' | 'cocina' | 'admin') => {
      const { type, mesaId, itemName } = payload;

      console.log('[useNotifications] 🔔', { type, mesaId, itemName, currentRole });

      // 🎚️ Gate de audio por rol/tipo para evitar sonidos indiscriminados
      let shouldPlay = false;
      if (currentRole === 'mesero') {
        shouldPlay = type === 'item_listo';
      } else if (currentRole === 'cocina' || currentRole === 'admin') {
        shouldPlay = type === 'ticket_impreso' || type === 'mesa_liberada';
      }
      if (shouldPlay) {
        playSound();
      }

      // 📱 Toast solo para mesero en item_listo
      if (currentRole === 'mesero' && type === 'item_listo') {
        return {
          showToast: true,
          message: `Mesa ${mesaId}`,
          subtitle: itemName || '',
          duration: 2000,
        };
      }

      // 🔕 Cocina/Admin solo reciben audio
      return { showToast: false };
    },
    [playSound]
  );

  /**
   * Formatear mensaje para logs/debugging
   */
  const formatMessage = useCallback((payload: NotificationPayload): string => {
    const { type, mesaId, itemName } = payload;

    switch (type) {
      case 'item_listo':
        return `Mesa ${mesaId} - ${itemName || 'Item'} listo`;
      case 'ticket_impreso':
        return `Mesa ${mesaId} - Ticket impreso`;
      case 'mesa_liberada':
        return `Mesa ${mesaId} - Liberada`;
      default:
        return `Mesa ${mesaId}`;
    }
  }, []);

  return {
    notify,
    playSound,
    formatMessage,
  };
}
