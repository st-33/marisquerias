/**
 * Mock manual de react-native para entorno Jest.
 * Solo expone los símbolos que los módulos de dominio usan directamente.
 * Los tests de UI que necesiten más pueden extenderlo con jest.mock().
 */
module.exports = {
  Platform: {
    OS: 'ios',
    select: (options) => options.ios ?? options.default,
  },
  AppState: {
    addEventListener: () => ({ remove: () => {} }),
    currentState: 'active',
  },
  NativeModules: {
    RNCNetInfo: {
      getCurrentState: jest.fn ? jest.fn().mockResolvedValue({ isConnected: true }) : () => Promise.resolve({ isConnected: true }),
      addListener: () => {},
      removeListeners: () => {},
    },
  },
  StyleSheet: {
    create: (styles) => styles,
  },
};
