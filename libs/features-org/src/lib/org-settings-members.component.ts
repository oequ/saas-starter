import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ORG_PORT } from '@oequ/ports';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { switchMap } from 'rxjs';

@Component({
  selector: 'oequ-org-settings-members',
  imports: [HlmCardImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section hlmCard class="gap-0 overflow-hidden py-0">
      <div hlmCardContent class="!p-6">
        <h2 class="text-xl leading-8 font-semibold tracking-tight">Members</h2>
        <p class="text-muted-foreground my-3 text-sm leading-6">
          People who have access to this organization.
        </p>
        <div>
        @if (members().length === 0) {
          <p class="text-muted-foreground text-sm">No members yet.</p>
        } @else {
          <ul class="divide-border divide-y">
            @for (member of members(); track member.userId) {
              <li class="flex items-center justify-between py-3 text-sm">
                <div>
                  <p class="font-medium">
                    {{ member.displayName ?? member.email }}
                  </p>
                  <p class="text-muted-foreground">{{ member.email }}</p>
                </div>
                <span
                  class="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs capitalize"
                >
                  {{ member.role }}
                </span>
              </li>
            }
          </ul>
        }
        </div>
      </div>
    </section>
  `,
})
export class OrgSettingsMembersComponent {
  readonly organizationId = input.required<string>();

  private readonly orgPort = inject(ORG_PORT);

  private readonly membersResult = toSignal(
    toObservable(this.organizationId).pipe(
      switchMap((id) => this.orgPort.getMembers(id)),
    ),
    { initialValue: null },
  );

  protected readonly members = computed(() => {
    const result = this.membersResult();
    return result?.ok ? result.data : [];
  });
}
