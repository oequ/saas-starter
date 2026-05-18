import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { AUTH_PORT, type AuthSessionDevice } from '@oequ/ports';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  selector: 'oequ-account-sessions-page',
  imports: [HlmCardImports, HlmButtonImports, HlmBadgeImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8">
      <section hlmCard class="gap-0 overflow-hidden py-0">
        <div hlmCardContent class="!p-6">
          <h2 class="text-xl leading-8 font-semibold tracking-tight">
            Active sessions
          </h2>
          <p class="text-muted-foreground my-3 text-sm leading-6">
            Devices and browsers signed in to your account. Revoke any session
            you do not recognize.
          </p>

          <div class="border-input overflow-hidden rounded-[5px] border">
            <table class="w-full text-left text-sm">
              <thead
                class="bg-muted/50 text-muted-foreground border-b text-xs font-medium"
              >
                <tr>
                  <th class="px-4 py-2.5 font-medium">Device</th>
                  <th class="hidden px-4 py-2.5 font-medium md:table-cell">
                    Location
                  </th>
                  <th class="hidden px-4 py-2.5 font-medium lg:table-cell">
                    Last active
                  </th>
                  <th class="px-4 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody class="divide-border divide-y">
                @if (loading()) {
                  <tr>
                    <td
                      colspan="4"
                      class="text-muted-foreground px-4 py-8 text-center"
                    >
                      Loading sessions…
                    </td>
                  </tr>
                } @else if (sessions().length === 0) {
                  <tr>
                    <td
                      colspan="4"
                      class="text-muted-foreground px-4 py-8 text-center"
                    >
                      No active sessions.
                    </td>
                  </tr>
                } @else {
                  @for (session of sessions(); track session.id) {
                    <tr class="hover:bg-muted/30">
                      <td class="px-4 py-3">
                        <p class="font-medium">
                          {{ session.deviceLabel }}
                          @if (session.current) {
                            <span
                              hlmBadge
                              variant="outline"
                              class="border-primary/25 bg-primary/10 text-primary ms-2"
                              >Current</span
                            >
                          }
                        </p>
                        <p class="text-muted-foreground text-xs">
                          {{ session.browser }}
                        </p>
                      </td>
                      <td
                        class="text-muted-foreground hidden px-4 py-3 md:table-cell"
                      >
                        {{ session.location }}
                      </td>
                      <td
                        class="text-muted-foreground hidden px-4 py-3 lg:table-cell"
                      >
                        {{ formatLastActive(session.lastActiveAt) }}
                      </td>
                      <td class="px-4 py-3 text-right">
                        <button
                          hlmBtn
                          type="button"
                          variant="secondary"
                          class="h-8"
                          [disabled]="session.current || revokingId() === session.id"
                          (click)="revokeSession(session.id)"
                        >
                          {{
                            revokingId() === session.id ? 'Revoking…' : 'Revoke'
                          }}
                        </button>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>

        <div
          hlmCardFooter
          class="border-border bg-muted/50 text-foreground flex min-h-[57px] flex-wrap items-center justify-between gap-4 border-t !py-3 text-sm leading-relaxed"
        >
          @if (statusMessage(); as message) {
            <p role="status" class="min-w-0 flex-1">{{ message }}</p>
          } @else {
            <p class="text-muted-foreground min-w-0 flex-1">
              Sign out of all other devices while keeping this session active.
            </p>
          }
          <button
            hlmBtn
            type="button"
            variant="secondary"
            [disabled]="revokingAll() || otherSessionCount() === 0"
            (click)="revokeAllOthers()"
          >
            {{ revokingAll() ? 'Signing out…' : 'Sign out other sessions' }}
          </button>
        </div>
      </section>
    </div>
  `,
})
export class AccountSessionsPageComponent {
  private readonly authPort = inject(AUTH_PORT);

  protected readonly sessions = signal<readonly AuthSessionDevice[]>([]);
  protected readonly loading = signal(true);
  protected readonly revokingId = signal<string | null>(null);
  protected readonly revokingAll = signal(false);
  protected readonly statusMessage = signal<string | null>(null);

  constructor() {
    void this.loadSessions();
  }

  protected otherSessionCount(): number {
    return this.sessions().filter((s) => !s.current).length;
  }

  protected formatLastActive(iso: string): string {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  }

  protected async revokeSession(sessionId: string): Promise<void> {
    this.revokingId.set(sessionId);
    this.statusMessage.set(null);

    try {
      const result = await this.authPort.revokeSession(sessionId);
      if (result.ok) {
        await this.loadSessions();
        this.statusMessage.set('Session revoked.');
      } else {
        this.statusMessage.set(result.error.message);
      }
    } catch {
      this.statusMessage.set('Something went wrong. Please try again.');
    } finally {
      this.revokingId.set(null);
    }
  }

  protected async revokeAllOthers(): Promise<void> {
    this.revokingAll.set(true);
    this.statusMessage.set(null);

    try {
      const result = await this.authPort.revokeAllOtherSessions();
      if (result.ok) {
        await this.loadSessions();
        this.statusMessage.set('Signed out of all other sessions.');
      } else {
        this.statusMessage.set(result.error.message);
      }
    } catch {
      this.statusMessage.set('Something went wrong. Please try again.');
    } finally {
      this.revokingAll.set(false);
    }
  }

  private async loadSessions(): Promise<void> {
    this.loading.set(true);
    const result = await this.authPort.listActiveSessions();
    this.sessions.set(result.ok ? result.data : []);
    this.loading.set(false);
  }
}
