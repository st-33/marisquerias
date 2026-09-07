// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx', '**/pruebas/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true,
  // Define globals de RN antes de cargar cualquier módulo
  setupFiles: ['<rootDir>/src/__mocks__/jest.setup.js'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  globals: {
    __DEV__: true,
  },
  // react-native y sus dependencias son ESM — deben ser transpilados por ts-jest.
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-async-storage|@react-native-community|react-native-gesture-handler|react-native-reanimated|expo|expo-router|@expo)/)',
  ],
  moduleNameMapper: {
    // react-native — mock ligero para acceso a Platform, AppState, etc. desde código de dominio
    '^react-native$': '<rootDir>/src/__mocks__/react-native.js',
    // @sentry/react-native usa ESM puro — incompatible con Jest sin transpilación nativa.
    '^@sentry/react-native$': '<rootDir>/src/__mocks__/@sentry/react-native.js',
  },
};
