import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAuth } from '../src/auth/auth-context';
import { Button, Screen, Sheet, Text, type SheetHandle } from '../src/ui';
import { tokens } from '../src/ui/tokens';

export default function HomeScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const sheetRef = useRef<SheetHandle>(null);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: tokens.motion.enterMs });
    translateY.value = withTiming(0, { duration: tokens.motion.enterMs });
  }, [opacity, translateY]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!session) {
    return null;
  }

  return (
    <Screen>
      <Animated.View style={[styles.block, enterStyle]}>
        <Text variant="caption" tone="muted">
          Signed in
        </Text>
        <Text variant="title">Hello, {session.user.displayName}</Text>
        <Text variant="body" tone="muted">
          {session.user.email}
        </Text>
        <Text variant="body" tone="muted" style={styles.note}>
          You are signed in. More companion features come next.
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <Button variant="secondary" onPress={() => sheetRef.current?.present()}>
          Sign out
        </Button>
      </View>

      <Sheet
        ref={sheetRef}
        title="Sign out?"
        primaryLabel="Sign out"
        secondaryLabel="Stay signed in"
        primaryDestructive
        onPrimary={() => {
          void signOut().then(() => router.replace('/login'));
        }}
      >
        <Text variant="body" tone="muted">
          You can sign in again with the same account on web or this app.
        </Text>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: tokens.space.sm,
    marginTop: tokens.space.xl,
  },
  note: {
    marginTop: tokens.space.md,
  },
  footer: {
    marginTop: 'auto' as const,
    paddingBottom: tokens.space.md,
    gap: tokens.space.sm,
  },
});
