export type SoundKey =
  | 'orderToKitchen'
  | 'orderReady'
  | 'sessionExit'
  | 'buttonClick'
  | 'roleSelect'
  | 'addButtonA'
  | 'addButtonB';

export const SOUND_MAP: Record<SoundKey, number> = {
  orderToKitchen: require('../../assets/sounds/ding.wav'),
  orderReady: require('../../assets/sounds/huge.wav'),
  sessionExit: require('../../assets/sounds/huge.wav'),
  buttonClick: require('../../assets/sounds/ding.wav'),
  roleSelect: require('../../assets/sounds/ocean-AL SELECCIONAR UN ROL.mp3'),
  addButtonA: require('../../assets/sounds/BOTON_AGREGAR.mp3'),
  addButtonB: require('../../assets/sounds/AGREGAR.2.mp3'),
};
