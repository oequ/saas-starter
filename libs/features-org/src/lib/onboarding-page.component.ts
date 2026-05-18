import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ORG_PORT } from '@oequ/ports';

import { OnboardingActivationComponent } from './onboarding/onboarding-activation.component';
import { OnboardingCreateWorkspaceComponent } from './onboarding/onboarding-create-workspace.component';

@Component({
  selector: 'oequ-onboarding-page',
  imports: [OnboardingCreateWorkspaceComponent, OnboardingActivationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasOrganizations()) {
      <oequ-onboarding-activation />
    } @else {
      <oequ-onboarding-create-workspace />
    }
  `,
})
export class OnboardingPageComponent {
  private readonly orgPort = inject(ORG_PORT);

  private readonly organizations = toSignal(this.orgPort.organizations$, {
    initialValue: [],
  });

  protected readonly hasOrganizations = () =>
    (this.organizations()?.length ?? 0) > 0;
}
