import { ApolloProvider } from '@apollo/client';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { initApolloCache } from '../src/apollo/cache-persist';
import { buildMobileCache, createMobileApolloClient } from '../src/apollo/client';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { PlatformProvider } from '../src/context/PlatformContext';
import { colors } from '../src/design/tokens';
import '../global.css';

SplashScreen.preventAutoHideAsync();

function RoleRouter() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inClientGroup = segments[0] === '(client)';
    const inWorkerGroup = segments[0] === '(worker)';
    const inCompanyGroup = segments[0] === '(company)';
    // Public booking wizard — accessible without authentication
    const inBookingFlow = segments[0] === 'new-booking';

    if (!user) {
      if (!inAuthGroup && !inBookingFlow) router.replace('/(auth)/welcome');
      return;
    }

    // Route authenticated users to their designated portal
    if (user.role === 'CLIENT' && !inClientGroup) {
      router.replace('/(client)');
    } else if (user.role === 'WORKER' && !inWorkerGroup) {
      router.replace('/(worker)');
    } else if (user.role === 'COMPANY_ADMIN' && !inCompanyGroup) {
      router.replace('/(company)');
    } else if (user.role === 'GLOBAL_ADMIN') {
      // Admin portal is web-only — show a friendly redirect screen
      if (!inAuthGroup) router.replace('/(auth)/admin-web');
    }
  }, [user, loading, segments]);

  // While auth state is being determined, show a blank loading screen.
  // This prevents any flash of the wrong portal before the redirect fires.
  if (loading) {
    return (
      <View style={routerStyles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="new-booking" />
      <Stack.Screen name="(client)" options={{ animation: 'none' }} />
      <Stack.Screen name="(worker)" options={{ animation: 'none' }} />
      <Stack.Screen name="(company)" options={{ animation: 'none' }} />
    </Stack>
  );
}

const routerStyles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function RootLayout() {
  const apiUrl =
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    'https://api.go2fix.ro/graphql';
  const stripeKey =
    (Constants.expoConfig?.extra?.stripePublishableKey as string | undefined) ?? '';

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Cache built separately so it can be passed to persistence setup
  const cache = useMemo(() => buildMobileCache(), []);
  const apolloClient = useMemo(
    () => createMobileApolloClient(apiUrl, undefined, cache),
    [apiUrl, cache],
  );

  // Hydrate Apollo cache from disk — non-blocking, best-effort
  useEffect(() => {
    void initApolloCache(cache);
  }, [cache]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ApolloProvider client={apolloClient}>
      <StripeProvider
        publishableKey={stripeKey}
        merchantIdentifier="merchant.ro.go2fix.app"
      >
        <PlatformProvider>
          <AuthProvider>
            <RoleRouter />
          </AuthProvider>
        </PlatformProvider>
      </StripeProvider>
    </ApolloProvider>
  );
}
