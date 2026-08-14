import { SoundBank } from './soundBank';
import type { SoundKey } from '@compartido/sounds';

export type SoundEvent = 'orderToKitchen' | 'orderReady' | 'sessionExit' | 'buttonClick';

export type TipoSonido = 'new_order' | 'order_ready' | 'notification' | 'alert' | 'success';

const EVENT_TO_SOUND: Record<SoundEvent, SoundKey> = {
  orderToKitchen: 'orderToKitchen',
  orderReady: 'orderReady',
  sessionExit: 'sessionExit',
  buttonClick: 'buttonClick',
};

const TIPO_SONIDO_TO_KEY: Record<TipoSonido, SoundKey> = {
  new_order: 'orderToKitchen',
  order_ready: 'orderReady',
  notification: 'buttonClick',
  alert: 'sessionExit',
  success: 'orderReady',
};

export async function playSoundEvent(event: SoundEvent): Promise<void> {
  const soundKey = EVENT_TO_SOUND[event];
  try {
    await SoundBank.play(soundKey);
  } catch (error: any) {
    // 🔥 CORRECCIÓN: Manejar error de permisos de audio específicamente
    if (error?.message?.includes('not allowed') || error?.message?.includes('permission')) {
      console.warn(`[SoundNotifications] Audio requiere interacción del usuario para ${event}`);
      return; // Silenciosamente fallar
    }
    console.warn(`[SoundNotifications] Failed to play ${event}`, error);
  }
}

export async function stopSoundEvent(event: SoundEvent): Promise<void> {
  const soundKey = EVENT_TO_SOUND[event];
  try {
    await SoundBank.stop(soundKey);
  } catch (error) {
    console.warn(`[SoundNotifications] Failed to stop ${event}`, error);
  }
}

export async function preloadSoundEvent(event: SoundEvent): Promise<void> {
  const soundKey = EVENT_TO_SOUND[event];
  try {
    await SoundBank.preload(soundKey);
  } catch (error) {
    console.warn(`[SoundNotifications] Failed to preload ${event}`, error);
  }
}

export async function reproducirSonido(tipo: TipoSonido): Promise<void> {
  const soundKey = TIPO_SONIDO_TO_KEY[tipo];

  if (!soundKey) {
    console.warn(`[SoundNotifications] Tipo de sonido desconocido: ${tipo}`);
    return;
  }

  try {
    await SoundBank.play(soundKey);
  } catch (error: any) {
    // 🔥 CORRECCIÓN: Manejar error de permisos de audio específicamente
    if (error?.message?.includes('not allowed') || error?.message?.includes('permission')) {
      console.warn(`[SoundNotifications] Audio requiere interacción del usuario para ${tipo}`);
      return; // Silenciosamente fallar
    }
    console.warn(`[SoundNotifications] Falló reproducir sonido ${tipo}`, error);
  }
}
