import { FormEvent, useState } from 'react';
import { DEMO_AUTH_EMAIL, DEMO_AUTH_PASSWORD } from '@oequ/ports';
import { usePorts } from '../PortsContext';

type Props = {
  onSignedIn: () => void;
};

export function SignInPage({ onSignedIn }: Props) {
  const { auth } = usePorts();
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
    <main className="shell-signin">
      <div className="shell-signin__inner">
        <p className="brand" aria-label="Oequ">
          Oe<span>qu</span>
        </p>
        <h1>Sign in</h1>
        <p className="lede">
          Mock AuthPort — same demo credentials as the Angular shell.
        </p>
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn--primary" type="submit" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
