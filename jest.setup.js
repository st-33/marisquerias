// jest.setup.js
jest.mock(
  'react-native',
  () => ({
    Platform: {
      OS: 'web',
      select: (objs) => (objs ? objs.web || objs.default : undefined),
    },
    NativeModules: {
      RNCNetInfo: {
        getCurrentState: jest.fn().mockResolvedValue({ isConnected: true }),
        addListener: jest.fn(),
        removeListeners: jest.fn(),
      },
    },
  }),
  { virtual: true }
);

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = {};
  return {
    getItem: jest.fn(async (key) => store[key] || null),
    setItem: jest.fn(async (key, value) => {
      store[key] = value;
    }),
    removeItem: jest.fn(async (key) => {
      delete store[key];
    }),
    multiRemove: jest.fn(async (keys) => {
      keys.forEach((key) => delete store[key]);
    }),
    clear: jest.fn(async () => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
});
