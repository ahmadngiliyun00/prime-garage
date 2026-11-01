import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * PrimeGarage app config. Package name is final (PRD section 10): my.id.ngiliyun.primegarage.
 * Public env vars (EXPO_PUBLIC_*) are embedded at build time; never put secrets here.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PrimeGarage',
  slug: 'prime-garage',
  scheme: 'primegarage',
  version: '1.0.0',
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'my.id.ngiliyun.primegarage',
    supportsTablet: true,
  },
  android: {
    package: 'my.id.ngiliyun.primegarage',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#0f172a',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: ['android.permission.POST_NOTIFICATIONS'],
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'single',
    bundler: 'metro',
    favicon: './assets/favicon.png',
    name: 'PrimeGarage',
    shortName: 'PrimeGarage',
    themeColor: '#dc2626',
    backgroundColor: '#0f172a',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-asset',
    'expo-font',
    'expo-web-browser',
    [
      'expo-splash-screen',
      { image: './assets/splash-icon.png', imageWidth: 180, resizeMode: 'contain', backgroundColor: '#0f172a' },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#dc2626',
        defaultChannel: 'reminders',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'PrimeGarage memerlukan akses foto untuk melampirkan foto nota servis dan foto kendaraan.',
        cameraPermission: 'PrimeGarage memerlukan kamera untuk memotret nota servis dan kendaraan.',
      },
    ],
    process.env.GOOGLE_IOS_URL_SCHEME
      ? ['@react-native-google-signin/google-signin', { iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME }]
      : '@react-native-google-signin/google-signin',
  ],
  extra: {
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
});
