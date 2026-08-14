import { AudioPlayer, AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';
import { SOUND_MAP, SoundKey } from '@compartido/sounds';

type LoadedSound = {
  player: AudioPlayer;
};

class SoundBankClass {
  private cache = new Map<SoundKey, LoadedSound>();
  private initializing = new Map<SoundKey, Promise<LoadedSound>>();
  private audioConfigured = false;

  private async ensureAudioMode() {
    if (this.audioConfigured) return;
    try {
      if (Platform.OS !== 'web') {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          shouldPlayInBackground: true,
          shouldRouteThroughEarpiece: false,
          interruptionMode: 'mixWithOthers',
          interruptionModeAndroid: 'duckOthers',
        });
      }
    } catch (error) {
      console.warn('[SoundBank] Unable to set audio mode', error);
    } finally {
      this.audioConfigured = true;
    }
  }

  async preload(key: SoundKey): Promise<void> {
    await this.load(key);
  }

  async preloadAll(): Promise<void> {
    // Preload all if needed
  }

  async play(key: SoundKey): Promise<void> {
    // 🔥 CORRECCIÓN CRÍTICA: Deshabilitar audio en web completamente
    if (Platform.OS === 'web') {
      return; // Web no soporta audio automático sin interacción
    }

    try {
      const clip = await this.load(key);
      try {
        await clip.player.seekTo(0);
      } catch (error) {
        console.warn(`[SoundBank] seek failed for ${key}`, error);
      }

      // 🔥 CORRECCIÓN: Manejar error de permisos de audio con try-catch robusto
      try {
        await clip.player.play();
      } catch (error: any) {
        // Error común: "play method is not allowed" - requiere interacción del usuario
        const errorMsg = error?.message || String(error);
        if (
          errorMsg.includes('not allowed') ||
          errorMsg.includes('permission') ||
          errorMsg.includes('user agent') ||
          errorMsg.includes('platform')
        ) {
          // Silenciosamente fallar - no crashear la app
          return;
        }
        // Re-lanzar otros errores pero capturarlos arriba
        throw error;
      }
    } catch (error: any) {
      // 🔥 CORRECCIÓN: Capturar TODOS los errores sin crashear
      const errorMsg = error?.message || String(error);
      if (
        errorMsg.includes('not allowed') ||
        errorMsg.includes('permission') ||
        errorMsg.includes('user agent') ||
        errorMsg.includes('platform')
      ) {
        // Silenciosamente fallar
        return;
      }
      // Solo loggear, no crashear
      console.warn(`[SoundBank] Error playing ${key}:`, errorMsg);
    }
  }

  async unloadAll(): Promise<void> {
    await Promise.all(
      Array.from(this.cache.entries()).map(async ([key, clip]) => {
        try {
          clip.player.remove();
        } catch (error) {
          console.warn(`[SoundBank] unload ${key} failed`, error);
        }
      })
    );
    this.cache.clear();
    this.initializing.clear();
  }

  async stop(key: SoundKey): Promise<void> {
    try {
      const clip = this.cache.get(key);
      if (clip) {
        // En expo-audio, pausar y regresar al inicio detiene la reproducción
        await clip.player.pause();
        await clip.player.seekTo(0);
      }
    } catch (error) {
      console.warn(`[SoundBank] stop failed for ${key}`, error);
    }
  }

  async stopAll(): Promise<void> {
    await Promise.all(Array.from(this.cache.keys()).map((key) => this.stop(key)));
  }

  private async load(key: SoundKey): Promise<LoadedSound> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    if (this.initializing.has(key)) {
      return this.initializing.get(key)!;
    }

    const initialize = (async (): Promise<LoadedSound> => {
      try {
        await this.ensureAudioMode();

        const player = createAudioPlayer(SOUND_MAP[key], {
          keepAudioSessionActive: false,
        });

        await this.waitUntilLoaded(player);

        const clip: LoadedSound = { player };
        this.cache.set(key, clip);
        return clip;
      } finally {
        this.initializing.delete(key);
      }
    })();

    this.initializing.set(key, initialize);
    return initialize;
  }

  private async waitUntilLoaded(player: AudioPlayer) {
    const status = player.currentStatus as AudioStatus | undefined;
    if (status?.isLoaded) return;

    await new Promise<void>((resolve) => {
      const subscription = player.addListener('playbackStatusUpdate', (nextStatus: AudioStatus) => {
        if (nextStatus.isLoaded) {
          subscription.remove();
          resolve();
        }
      });

      // Failsafe in caso de que nunca llegue el evento
      setTimeout(() => {
        subscription.remove();
        resolve();
      }, 1000);
    });
  }
}

export const SoundBank = new SoundBankClass();
