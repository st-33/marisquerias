/**
 * 🔊 HOOK DE SONIDOS ALTERNANTES
 * Alterna entre dos sonidos cada vez que se llama.
 * Se usa principalmente para el botón de agregar en mesero.
 */

import { useCallback, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import { SoundBank } from '../../sistema/audio/soundBank';

interface UseAlternatingSoundsOptions {
  enableVibration?: boolean;
  vibrationDuration?: number;
}

export function useAlternatingSounds(options: UseAlternatingSoundsOptions = {}) {
  const { enableVibration = true, vibrationDuration = 10 } = options;

  const currentSoundRef = useRef<'A' | 'B'>('A');

  // Precargar ambas claves en SoundBank
  const loadSounds = useCallback(async () => {
    await Promise.all([SoundBank.preload('addButtonA'), SoundBank.preload('addButtonB')]);
  }, []);

  // Reproducir sonido alternante
  const playSound = useCallback(async () => {
    if (enableVibration && Platform.OS !== 'web') {
      Vibration.vibrate(vibrationDuration);
    }

    const key = currentSoundRef.current === 'A' ? 'addButtonA' : 'addButtonB';
    currentSoundRef.current = currentSoundRef.current === 'A' ? 'B' : 'A';

    await SoundBank.play(key);
  }, [enableVibration, vibrationDuration]);

  // SoundBank administra el ciclo de vida global; cleanup es no-op
  const cleanup = useCallback(() => {
    // No-op: SoundBank.unloadAll() se llama desde el ciclo de vida global de la app.
  }, []);

  return {
    playSound,
    loadSounds,
    cleanup,
  };
}
