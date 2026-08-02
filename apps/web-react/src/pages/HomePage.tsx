import { useEffect, useState } from 'react';
import type { AuthSession, Organization } from '@oequ/ports';
import { usePorts } from '../PortsContext';

type Props = {
  onSignedOut: () => void;
};

export function HomePage({ onSignedOut }: Props) {
  const { auth, org } = usePorts();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [organizations, setOrganizations] = useState<readonly Organization[]>(
    [],
  );
  const [active, setActive] = useState<Organization | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  useEffect(() => {
    const sub = auth.session$.subscribe(setSession);
    return () => sub.unsubscribe();
  }, [auth]);

  useEffect(() => {
    const orgsSub = org.organizations$.subscribe(setOrganizations);
    const activeSub = org.activeOrganization$.subscribe(setActive);
    return () => {
      orgsSub.unsubscribe();
      activeSub.unsubscribe();
    };
  }, [org]);

  async function selectOrg(slug: string) {
    setBusySlug(slug);
    await org.selectOrganization(slug);
    setBusySlug(null);
  }

  async function signOut() {
    await auth.signOut();
    onSignedOut();
  }

  return (
    <main className="page">
      <header className="row">
        <div>
          <h1>Workspace</h1>
          <p className="muted">
            Session: {session?.user.email ?? '—'}
            {session?.claims.org
              ? ` · org ${session.claims.org.organizationId} (${session.claims.org.role})`
              : ' · no org claim'}
          </p>
        </div>
        <button type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>

      <section className="card">
        <h2>Organizations</h2>
        <p className="muted">
          Active: <strong>{active?.name ?? 'none'}</strong>
          {active ? ` (${active.slug})` : ''}
        </p>
        <ul className="org-list">
          {organizations.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={busySlug === item.slug || active?.id === item.id}
                onClick={() => void selectOrg(item.slug)}
              >
                {item.name}
                {active?.id === item.id ? ' · active' : ''}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
