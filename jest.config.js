// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx', '**/pruebas/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true,
  setupFiles: ['<rootDir>/src/__mocks__/jest.setup.js', '<rootDir>/jest.setup.js'],
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
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@temas/(.*)$': '<rootDir>/src/compartido/temas/$1',
    '^@temas$': '<rootDir>/src/compartido/temas',
    '^@compartido/(.*)$': '<rootDir>/src/compartido/$1',
    '^@components/(.*)$': '<rootDir>/src/compartido/componentes/$1',
    '^@hooks/(.*)$': '<rootDir>/src/compartido/hooks/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    // react-native — mock ligero para acceso a Platform, AppState, etc. desde código de dominio
    '^react-native$': '<rootDir>/src/__mocks__/react-native.js',
    // @sentry/react-native usa ESM puro — incompatible con Jest sin transpilación nativa.
    '^@sentry/react-native$': '<rootDir>/src/sistema/monitoreo/__mocks__/sentry.mock.ts',
  },
};
