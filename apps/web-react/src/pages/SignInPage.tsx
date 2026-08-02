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
    <main className="page">
      <h1>React shell</h1>
      <p className="muted">Mock AuthPort — same demo credentials as Angular demo.</p>
      <form className="card" onSubmit={onSubmit}>
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
        <button type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
