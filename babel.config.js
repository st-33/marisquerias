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
            '@assets': './assets',
            '@compartido': './src/compartido',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.wav', '.mp3', '.png', '.jpg', '.jpeg'],
        },
      ],
      'transform-import-meta',
      'react-native-reanimated/plugin',
    ],
  };
};
