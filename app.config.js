module.exports = () => {
  const target = process.env.APP_TARGET || 'default';

  const config = {
    name: 'marisquerias',
    slug: 'marisquerias',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon_custom.png',
    scheme: 'miecosistemaadi',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSBluetoothAlwaysUsageDescription:
          'Esta app utiliza Bluetooth para conectar con tu impresora Post Mini.',
        NSBluetoothPeripheralUsageDescription:
          'Se requiere Bluetooth para imprimir en tu impresora Post Mini.',
      },
      bundleIdentifier: 'com.anonymous.miecosistemaadi',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/icon_custom.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.anonymous.miecosistemaadi',
      permissions: [
        'BLUETOOTH',
        'BLUETOOTH_ADMIN',
        'BLUETOOTH_CONNECT',
        'BLUETOOTH_SCAN',
        'BLUETOOTH_ADVERTISE',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
      ],
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
      bundler: 'metro',
    },
    assetBundlePatterns: ['**/*'],
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/icon_custom.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      'expo-asset',
      '@sentry/react-native',
      'expo-audio',
      'expo-build-properties',
      'expo-font',
      'expo-image',
      'expo-sqlite',
      'expo-status-bar',
      'expo-web-browser',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '7eadd8c1-b45a-481f-b24b-328c7b83055d',
      },
    },
    owner: 'miclovin',
  };

  // 🟦 Mutación Dinámica Basada en el Target
  if (target === 'marisqueria') {
    config.name = 'ADI Mariscos';
    config.android.package = 'com.mayap.adi_marisqueria';
    config.ios.bundleIdentifier = 'com.mayap.adi_marisqueria';

    // Permisos estrictos de hardware (Bluetooth local para ticketera, eliminando audio/micro que son de otras apps)
    config.android.permissions = [
      'BLUETOOTH',
      'BLUETOOTH_ADMIN',
      'BLUETOOTH_CONNECT',
      'BLUETOOTH_SCAN',
      'BLUETOOTH_ADVERTISE',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
    ];
  }

  return { expo: config };
};
