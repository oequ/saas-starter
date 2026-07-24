import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../src/auth/auth-context';
import { isPendingConfirm } from '../src/auth/auth-types';
import {
  Button,
  Checkbox,
  InlineError,
  Screen,
  Text,
  TextField,
} from '../src/ui';
import { supabaseConfigErrorMessage } from '../src/lib/supabase';

export default function RegisterScreen() {
  const { signUp, configured } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const emailError =
    attempted && !email.trim() ? 'Email is required.' : undefined;
  const passwordError =
    attempted && password.length < 8
      ? 'Password must be at least 8 characters.'
      : undefined;
  const confirmError =
    attempted && password !== confirmPassword
      ? 'Passwords do not match.'
      : undefined;
  const termsError =
    attempted && !acceptTerms ? 'Required to create an account.' : undefined;
  const privacyError =
    attempted && !acceptPrivacy ? 'Required to create an account.' : undefined;

  async function onSubmit() {
    setAttempted(true);
    setError('');
    if (
      !email.trim() ||
      password.length < 8 ||
      password !== confirmPassword ||
      !acceptTerms ||
      !acceptPrivacy
    ) {
      return;
    }
    if (!configured) {
      setError(supabaseConfigErrorMessage());
      return;
    }

    setBusy(true);
    const result = await signUp({
      email,
      password,
      confirmPassword,
      acceptTerms,
      acceptPrivacy,
    });
    setBusy(false);

    if (isPendingConfirm(result)) {
      router.replace({
        pathname: '/confirm-email',
        params: { email: result.email },
      });
      return;
    }
    if (!result.ok) {
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
        <Text variant="title">Create account</Text>
        <Text variant="body" tone="muted">
          Create an account to use the companion.
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
        onChangeText={setEmail}
        error={emailError}
        editable={!busy}
      />
      <TextField
        label="Password"
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
        error={passwordError}
        editable={!busy}
      />
      <TextField
        label="Confirm password"
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={confirmError}
        editable={!busy}
      />

      <Checkbox
        label="I accept the Terms of Service (same policy as the web app)."
        checked={acceptTerms}
        onChange={setAcceptTerms}
        error={termsError}
      />
      <Checkbox
        label="I accept the Privacy Policy."
        checked={acceptPrivacy}
        onChange={setAcceptPrivacy}
        error={privacyError}
      />

      <InlineError message={error} />

      <Button onPress={onSubmit} disabled={busy || !configured}>
        {busy ? 'Creating account…' : 'Create account'}
      </Button>

      <View className="mt-2 flex-row flex-wrap items-center gap-1">
        <Text variant="caption" tone="muted">
          Already have an account?
        </Text>
        <Link href="/login" asChild>
          <Pressable accessibilityRole="link" disabled={busy}>
            <Text variant="caption" style={{ textDecorationLine: 'underline' }}>
              Sign in
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
