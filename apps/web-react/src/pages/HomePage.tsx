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
    <div className="shell-workspace">
      <header className="shell-workspace__bar">
        <div>
          <p className="shell-workspace__brand" aria-label="Oequ">
            Oe<span>qu</span>
          </p>
          <p className="shell-workspace__meta">
            {session?.user.email ?? '—'}
            {session?.claims.org
              ? ` · org ${session.claims.org.organizationId} (${session.claims.org.role})`
              : ' · no org claim'}
          </p>
        </div>
        <button
          className="btn btn--ghost"
          type="button"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </header>

      <main className="shell-workspace__main">
        <h1>Workspace</h1>
        <p className="muted">Choose an organization to continue.</p>

        <section className="org-panel" aria-labelledby="orgs-heading">
          <h2 id="orgs-heading">Organizations</h2>
          <p className="org-active">
            Active: <strong>{active?.name ?? 'none'}</strong>
            {active ? ` (${active.slug})` : ''}
          </p>
          <ul className="org-list">
            {organizations.map((item) => {
              const isActive = active?.id === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={isActive ? 'is-active' : undefined}
                    disabled={busySlug === item.slug || isActive}
                    onClick={() => void selectOrg(item.slug)}
                  >
                    {item.name}
                    <span className="org-hint">
                      {isActive
                        ? 'Active workspace'
                        : busySlug === item.slug
                          ? 'Switching…'
                          : item.slug}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
