import { useEffect, useState } from 'react';
import type { AuthSession, Organization } from '@oequ/ports';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
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
    void org.listOrganizations();
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
    <div className="bg-background min-h-svh">
      <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Oequ</p>
            <p className="text-muted-foreground truncate text-xs">
              {session?.user.email ?? '—'}
              {session?.claims.org
                ? ` · org ${session.claims.org.organizationId} (${session.claims.org.role})`
                : ' · no org claim'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
        <p className="text-muted-foreground mt-2 mb-6 text-sm">
          Choose an organization to continue.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organizations</CardTitle>
            <CardDescription>
              Active:{' '}
              <span className="text-foreground font-medium">
                {active?.name ?? 'none'}
              </span>
              {active ? ` (${active.slug})` : ''}
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-2 p-4">
            {organizations.length === 0 ? (
              <p className="text-muted-foreground text-sm">No organizations.</p>
            ) : (
              <ul className="space-y-2">
                {organizations.map((item) => {
                  const isActive = active?.id === item.id;
                  return (
                    <li key={item.id}>
                      <Button
                        type="button"
                        variant={isActive ? 'secondary' : 'outline'}
                        className={cn(
                          'h-auto w-full flex-col items-start gap-0.5 px-3 py-3 whitespace-normal',
                          isActive && 'border-border border',
                        )}
                        disabled={busySlug === item.slug || isActive}
                        onClick={() => void selectOrg(item.slug)}
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground text-xs font-normal">
                          {isActive
                            ? 'Active workspace'
                            : busySlug === item.slug
                              ? 'Switching…'
                              : item.slug}
                        </span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
