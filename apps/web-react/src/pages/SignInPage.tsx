import { FormEvent, useState } from 'react';
import { DEMO_AUTH_EMAIL, DEMO_AUTH_PASSWORD } from '@oequ/ports';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePorts } from '../PortsContext';
import { resolvePortsMode } from '../ports/create-web-ports';

type Props = {
  onSignedIn: () => void;
};

export function SignInPage({ onSignedIn }: Props) {
  const { auth } = usePorts();
  const portsMode = resolvePortsMode();
  const [email, setEmail] = useState(DEMO_AUTH_EMAIL);
  const [password, setPassword] = useState(DEMO_AUTH_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await auth.signInWithPassword({ email, password });
    setPending(false);
    if (!result.ok) {
      setError(result.error.code);
      return;
    }
    onSignedIn();
  }

  return (
    <main className="bg-muted/30 flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col">
        <h1 className="mb-2 text-center text-xl font-semibold tracking-tight">
          Sign in
        </h1>
        <p className="text-muted-foreground mb-8 text-center text-sm leading-6">
          {portsMode === 'supabase'
            ? 'Supabase AuthPort — local or hosted project via VITE_SUPABASE_*.'
            : 'Mock AuthPort — same demo credentials as the Angular shell.'}
        </p>

        <Card className="gap-0 overflow-hidden py-0">
          <CardContent className="p-6">
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-input bg-background h-9 shadow-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-input bg-background h-9 shadow-none"
                />
              </div>

              {error ? (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                className="h-9 w-full shadow-none"
                disabled={pending}
              >
                {pending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
