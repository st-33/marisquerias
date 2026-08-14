import { useEffect, useRef } from 'react';
import {
  playSoundEvent,
  preloadSoundEvent,
  stopSoundEvent,
} from '../../core/audio/soundNotifications';
import type { OrdenCocina } from './useCocinaLogic';

/**
 * 🔊 HOOK DE EFECTOS DE AUDIO PARA COCINA
 * Encapsula toda la lógica de notificaciones sonoras del KDS.
 * Sigue el principio de separación: La lógica decide, este hook suena.
 */
export function useCocinaAudio(ordenes: OrdenCocina[]) {
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  // 1. Preload del sonido al montar y stop al desmontar
  useEffect(() => {
    console.log('[useCocinaAudio] 🔄 Iniciando preload de audio...');
    preloadSoundEvent('orderToKitchen')
      .then(() => {
        console.log('[useCocinaAudio] ✅ Preload SUCCESS');
      })
      .catch((error: any) => {
        // Logging silencioso para no saturar consola en producción
        if (__DEV__) console.warn('[useCocinaAudio] Preload warning:', error?.message);
        console.error('[useCocinaAudio] ❌ Preload FAILED:', error?.message);
      });

    return () => {
      console.log('[useCocinaAudio] 🧹 Deteniendo audio de cocina...');
      stopSoundEvent('orderToKitchen').catch(() => {});
    };
  }, []);

  // 2. Detectar nuevas órdenes y sonar
  useEffect(() => {
    // Extraer IDs actuales
    const currentIds = new Set(ordenes.map((o) => o.id));

    // Evitar sonar en la carga inicial (hidratación)
    if (firstLoadRef.current) {
      knownOrderIdsRef.current = currentIds;
      firstLoadRef.current = false;
      return;
    }

    // Detectar diferencias
    const prevIds = knownOrderIdsRef.current;
    // Una orden es "nueva" si no estaba en el set anterior
    const hasNewOrder = ordenes.some((order) => !prevIds.has(order.id));

    if (hasNewOrder) {
      console.log('[useCocinaAudio] 🔔 Nueva orden detectada, reproduciendo sonido...');
      playSoundEvent('orderToKitchen').catch((error: any) => {
        // El error ya es manejado internamente por playSoundEvent,
        // pero atrapamos aquí por doble seguridad para no afectar el flujo de react.
        if (__DEV__) console.warn('[useCocinaAudio] Play error:', error?.message);
      });
    }

    // Actualizar referencias
    knownOrderIdsRef.current = currentIds;
  }, [ordenes]);
}
