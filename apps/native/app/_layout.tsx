import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  useFonts,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/auth/auth-context';
import { tokens } from '../src/ui/tokens';

const AUTH_ROUTES = new Set(['login', 'register', 'confirm-email']);

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) {
      return;
    }
    const root = segments[0];
    const onAuthRoute = typeof root === 'string' && AUTH_ROUTES.has(root);

    if (!session && !onAuthRoute) {
      router.replace('/login');
    } else if (session && onAuthRoute) {
      router.replace('/home');
    }
  }, [session, ready, segments, router]);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={tokens.color.foreground} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={tokens.color.foreground} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <BottomSheetModalProvider>
        <AuthProvider>
          <AuthGate>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
          </AuthGate>
        </AuthProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.background,
  },
});
