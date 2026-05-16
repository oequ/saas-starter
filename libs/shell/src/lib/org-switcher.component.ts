import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ORG_PORT } from '@oequ/ports';
import { HlmSelectImports } from '@spartan-ng/helm/select';

@Component({
  selector: 'oequ-org-switcher',
  imports: [HlmSelectImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-select
      class="min-w-[12rem]"
      [value]="selectedSlug()"
      [disabled]="organizations().length === 0"
      (valueChange)="onValueChange($event)"
    >
      <hlm-select-trigger aria-label="Organization">
        <hlm-select-value placeholder="Organization" />
      </hlm-select-trigger>
      <hlm-select-content *hlmSelectPortal>
        @for (org of organizations(); track org.id) {
          <hlm-select-item [value]="org.slug">{{ org.name }}</hlm-select-item>
        }
      </hlm-select-content>
    </hlm-select>
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

  protected readonly selectedSlug = computed(
    () => this.activeOrganization()?.slug ?? null,
  );

  protected onValueChange(slug: string | null): void {
    if (!slug || slug === this.selectedSlug()) {
      return;
    }
    void this.orgPort.selectOrganization(slug);
  }
}
