import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ORG_PORT } from '@oequ/ports';
@Component({
  selector: 'oequ-org-switcher',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <select
      class="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 min-w-[10rem] rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
      aria-label="Workspace"
      [value]="activeOrganization()?.slug ?? ''"
      (change)="onSelect($event)"
    >
      @for (org of organizations(); track org.id) {
        <option [value]="org.slug">{{ org.name }}</option>
      }
    </select>
  `,
})
export class OrgSwitcherComponent {
  private readonly orgPort = inject(ORG_PORT);

  protected readonly organizations = toSignal(this.orgPort.organizations$, {
    initialValue: [],
  });

  protected readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  protected onSelect(event: Event): void {
    const slug = (event.target as HTMLSelectElement).value;
    void this.orgPort.selectOrganization(slug);
  }
}
