// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  prettierConfig,
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        console: 'readonly',
        URL: 'readonly',
      },
    },
  },
  {
    files: [
      'jest.setup.js',
      'src/__mocks__/**/*.{js,ts}',
      '**/__tests__/**/*.{js,ts,tsx}',
      '**/pruebas/**/*.{js,ts,tsx}',
    ],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  {
    ignores: ['dist/*', '.expo/*', 'Evidencia/**/*', 'android/**/*', 'ios/**/*', 'backups/**/*'],
  },
]);
