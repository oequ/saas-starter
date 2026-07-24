import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../src/auth/auth-context';
import {
  Button,
  InlineError,
  Screen,
  Text,
  TextField,
} from '../src/ui';
import { supabaseConfigErrorMessage } from '../src/lib/supabase';

export default function LoginScreen() {
  const { signIn, configured } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setError('');
    const next: typeof fieldErrors = {};
    if (!email.trim()) {
      next.email = 'Email is required.';
    }
    if (!password) {
      next.password = 'Password is required.';
    }
    setFieldErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }
    if (!configured) {
      setError(supabaseConfigErrorMessage());
      return;
    }

    setBusy(true);
    const result = await signIn(email, password);
    setBusy(false);
    if (!result.ok) {
      if (result.code === 'emailNotConfirmed') {
        router.replace({
          pathname: '/confirm-email',
          params: { email: email.trim() },
        });
        return;
      }
      setError(result.message);
      return;
    }
    router.replace('/home');
  }

  return (
    <Screen scroll>
      <View className="mb-4 mt-8 gap-2">
        <Text variant="caption" tone="muted">
          Oequ companion
        </Text>
        <Text variant="title">Sign in</Text>
        <Text variant="body" tone="muted">
          Sign in with your Oequ account.
        </Text>
      </View>

      {!configured ? (
        <InlineError message={supabaseConfigErrorMessage()} />
      ) : null}

      <TextField
        label="Email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setFieldErrors((e) => ({ ...e, email: undefined }));
        }}
        error={fieldErrors.email}
        editable={!busy}
      />
      <TextField
        label="Password"
        secureTextEntry
        textContentType="password"
        autoComplete="password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setFieldErrors((e) => ({ ...e, password: undefined }));
        }}
        error={fieldErrors.password}
        editable={!busy}
        onSubmitEditing={onSubmit}
      />
      <InlineError message={error} />

      <Button onPress={onSubmit} disabled={busy || !configured}>
        {busy ? 'Signing in…' : 'Continue'}
      </Button>

      <View className="mt-2 flex-row flex-wrap items-center gap-1">
        <Text variant="caption" tone="muted">
          New here?
        </Text>
        <Link href="/register" asChild>
          <Pressable accessibilityRole="link" disabled={busy}>
            <Text variant="caption" style={{ textDecorationLine: 'underline' }}>
              Create an account
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
