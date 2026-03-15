module.exports = ({ config }) => ({
  ...config,
  name: 'Go2Fix',
  slug: 'go2fix',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FAFBFC',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'ro.go2fix.app',
    buildNumber: '1',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Go2Fix uses your location to verify job start and completion.',
      NSCameraUsageDescription: 'Go2Fix uses your camera to upload job photos.',
      NSPhotoLibraryUsageDescription: 'Go2Fix accesses your photos to upload job photos.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FAFBFC',
    },
    package: 'ro.go2fix.app',
    versionCode: 1,
    permissions: ['ACCESS_FINE_LOCATION', 'CAMERA', 'READ_EXTERNAL_STORAGE'],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    ['expo-notifications', { icon: './assets/notification-icon.png', color: '#2563EB' }],
    ['expo-camera', { cameraPermission: 'Go2Fix needs camera access to upload job photos.' }],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Go2Fix needs location to verify job completion.',
      },
    ],
  ],
  extra: {
    apiUrl: process.env.API_URL ?? 'https://api.go2fix.ro/graphql',
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
    googleClientIdIos: process.env.GOOGLE_CLIENT_ID_IOS ?? '',
    googleClientIdAndroid: process.env.GOOGLE_CLIENT_ID_ANDROID ?? '',
    eas: { projectId: process.env.EAS_PROJECT_ID ?? '' },
  },
  scheme: 'go2fix',
  experiments: { typedRoutes: true },
});
