process.env.EXPO_ROUTER_APP_ROOT = process.env.EXPO_ROUTER_APP_ROOT || 'app';

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          'react-compiler': true,
        },
      ],
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@assets': './assets',
            '@compartido': './src/compartido',
            '@temas': './src/compartido/temas',
            '@components': './src/compartido/componentes',
            '@hooks': './src/compartido/hooks',
            '@lib': './lib',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.wav', '.mp3', '.png', '.jpg', '.jpeg'],
        },
      ],
      'transform-import-meta',
      'react-native-reanimated/plugin',
    ],
  };
};
