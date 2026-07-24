import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  mapSession,
  resendEmailConfirmation,
  restoreSession,
  signInWithPassword,
  signOut as clientSignOut,
  signUpWithPassword,
  verifyEmailOtp,
} from './auth-client';
import type { AuthSession, AuthResult, SignUpResult } from './auth-types';
import { getSupabase, supabaseConfigured } from '../lib/supabase';

type AuthContextValue = {
  session: AuthSession | null;
  ready: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: {
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
    acceptPrivacy: boolean;
  }) => Promise<SignUpResult>;
  confirmEmail: (email: string, token: string) => Promise<AuthResult>;
  resendConfirmation: (
    email: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const restored = await restoreSession();
      if (!cancelled) {
        setSession(restored);
        setReady(true);
      }
    })();

    const client = getSupabase();
    const { data: sub } = client
      ? client.auth.onAuthStateChange((_event, next) => {
          setSession(next ? mapSession(next) : null);
        })
      : { data: { subscription: { unsubscribe: () => undefined } } };

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await signInWithPassword(email, password);
    if (result.ok) {
      setSession(result.session);
    }
    return result;
  }, []);

  const signUp = useCallback(
    async (input: {
      email: string;
      password: string;
      confirmPassword: string;
      acceptTerms: boolean;
      acceptPrivacy: boolean;
    }) => {
      const result = await signUpWithPassword(input);
      if (result.ok) {
        setSession(result.session);
      }
      return result;
    },
    [],
  );

  const confirmEmail = useCallback(async (email: string, token: string) => {
    const result = await verifyEmailOtp(email, token);
    if (result.ok) {
      setSession(result.session);
    }
    return result;
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    return resendEmailConfirmation(email);
  }, []);

  const signOut = useCallback(async () => {
    await clientSignOut();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      ready,
      configured: supabaseConfigured,
      signIn,
      signUp,
      confirmEmail,
      resendConfirmation,
      signOut,
    }),
    [
      session,
      ready,
      signIn,
      signUp,
      confirmEmail,
      resendConfirmation,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
