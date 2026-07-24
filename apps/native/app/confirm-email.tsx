import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../src/auth/auth-context';
import {
  Button,
  InlineError,
  Screen,
  Text,
  TextField,
} from '../src/ui';

const RESEND_COOLDOWN_SEC = 60;

export default function ConfirmEmailScreen() {
  const { confirmEmail, resendConfirmation } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function onSubmit() {
    setError('');
    setInfo('');
    if (!email) {
      setError('Missing email. Go back and register again.');
      return;
    }
    setBusy(true);
    const result = await confirmEmail(email, otp);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.replace('/home');
  }

  async function onResend() {
    setError('');
    setInfo('');
    if (!email || cooldown > 0) {
      return;
    }
    setBusy(true);
    const result = await resendConfirmation(email);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCooldown(RESEND_COOLDOWN_SEC);
    setInfo('A new code was sent. Check your inbox.');
  }

  return (
    <Screen scroll>
      <View className="mb-4 mt-8 gap-2">
        <Text variant="caption" tone="muted">
          Oequ companion
        </Text>
        <Text variant="title">Confirm email</Text>
        <Text variant="body" tone="muted">
          {email
            ? `Enter the 6-digit code sent to ${email}.`
            : 'Enter the 6-digit code from your signup email.'}
        </Text>
      </View>

      <TextField
        label="Confirmation code"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
        editable={!busy}
        onSubmitEditing={onSubmit}
      />
      <InlineError message={error} />
      {info ? (
        <Text variant="caption" tone="muted">
          {info}
        </Text>
      ) : null}

      <Button onPress={onSubmit} disabled={busy || otp.trim().length !== 6}>
        {busy ? 'Verifying…' : 'Verify and continue'}
      </Button>

      <Button
        variant="secondary"
        onPress={onResend}
        disabled={busy || cooldown > 0 || !email}
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
      </Button>

      <View className="mt-2 flex-row flex-wrap items-center gap-1">
        <Link href="/login" asChild>
          <Pressable accessibilityRole="link" disabled={busy}>
            <Text variant="caption" style={{ textDecorationLine: 'underline' }}>
              Back to sign in
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
