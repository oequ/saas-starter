import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  AUTH_PORT,
  isValidOrganizationSlug,
  ORG_PORT,
  slugifyOrganizationName,
} from '@oequ/ports';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';

type OnboardingStep = 'profile' | 'workspace' | 'invite';

@Component({
  selector: 'oequ-onboarding-page',
  imports: [ReactiveFormsModule, HlmCardImports, HlmButtonImports, HlmInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-muted/30 flex min-h-svh flex-col items-center justify-center px-4 py-12"
    >
      <div class="w-full max-w-md">
        <div class="mb-8 text-center">
          <p class="text-primary text-sm font-medium tracking-wide uppercase">
            Welcome
          </p>
          <h1 class="mt-2 text-2xl font-semibold tracking-tight">
            Set up your workspace
          </h1>
          <p class="text-muted-foreground mt-2 text-sm leading-6">
            @switch (step()) {
              @case ('profile') {
                Tell us your name, then create your first workspace.
              }
              @case ('workspace') {
                Choose a name for your team workspace.
              }
              @case ('invite') {
                Invite teammates now, or skip and do it later.
              }
            }
          </p>
        </div>

        <section hlmCard class="gap-0 overflow-hidden py-0">
          <div hlmCardContent class="!p-6">
            @if (step() === 'profile') {
              <form
                class="space-y-4"
                [formGroup]="profileForm"
                (ngSubmit)="continueFromProfile()"
              >
                <div>
                  <label
                    for="display-name"
                    class="mb-1.5 block text-sm font-medium"
                  >
                    Your name
                  </label>
                  <input
                    id="display-name"
                    hlmInput
                    type="text"
                    class="border-input bg-background h-9 w-full rounded-[5px] shadow-none"
                    formControlName="displayName"
                    autocomplete="name"
                  />
                </div>
                @if (errorMessage(); as message) {
                  <p class="text-destructive text-sm" role="alert">{{ message }}</p>
                }
                <div class="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    hlmBtn
                    type="button"
                    variant="secondary"
                    (click)="skipProfile()"
                  >
                    Skip
                  </button>
                  <button hlmBtn type="submit" [disabled]="saving()">
                    {{ saving() ? 'Saving…' : 'Continue' }}
                  </button>
                </div>
              </form>
            }

            @if (step() === 'workspace') {
              <form
                class="space-y-4"
                [formGroup]="workspaceForm"
                (ngSubmit)="continueFromWorkspace()"
              >
                <div>
                  <label
                    for="workspace-name"
                    class="mb-1.5 block text-sm font-medium"
                  >
                    Workspace name
                  </label>
                  <input
                    id="workspace-name"
                    hlmInput
                    type="text"
                    class="border-input bg-background h-9 w-full rounded-[5px] shadow-none"
                    formControlName="name"
                    autocomplete="organization"
                  />
                  @if (
                    workspaceForm.controls.name.invalid &&
                    workspaceForm.controls.name.touched
                  ) {
                    <p class="text-destructive mt-1.5 text-sm">
                      Enter between 2 and 64 characters.
                    </p>
                  }
                </div>
                @if (errorMessage(); as message) {
                  <p class="text-destructive text-sm" role="alert">{{ message }}</p>
                }
                <div class="flex justify-end pt-2">
                  <button
                    hlmBtn
                    type="submit"
                    [disabled]="workspaceForm.invalid || creating()"
                  >
                    {{ creating() ? 'Creating…' : 'Continue' }}
                  </button>
                </div>
              </form>
            }

            @if (step() === 'invite') {
              <div class="space-y-4">
                <p class="text-muted-foreground text-sm leading-6">
                  You can invite teammates later from workspace settings → Members.
                </p>
                <div class="flex flex-wrap justify-end gap-2 pt-2">
                  <button hlmBtn type="button" variant="secondary" (click)="finish()">
                    Skip for now
                  </button>
                  <button hlmBtn type="button" [disabled]="finishing()" (click)="finish()">
                    {{ finishing() ? 'Opening workspace…' : 'Go to workspace' }}
                  </button>
                </div>
              </div>
            }
          </div>
        </section>

        <p class="text-muted-foreground mt-6 text-center text-xs">
          Step {{ stepIndex() }} of 3
        </p>
      </div>
    </div>
  `,
})
export class OnboardingPageComponent {
  private readonly authPort = inject(AUTH_PORT);
  private readonly orgPort = inject(ORG_PORT);
  private readonly router = inject(Router);

  protected readonly step = signal<OnboardingStep>('profile');
  protected readonly saving = signal(false);
  protected readonly creating = signal(false);
  protected readonly finishing = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private createdWorkspaceSlug: string | null = null;

  protected readonly profileForm = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(64)],
    }),
  });

  protected readonly workspaceForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(64),
      ],
    }),
  });

  protected stepIndex(): number {
    switch (this.step()) {
      case 'profile':
        return 1;
      case 'workspace':
        return 2;
      case 'invite':
        return 3;
    }
  }

  protected skipProfile(): void {
    this.errorMessage.set(null);
    this.step.set('workspace');
  }

  protected async continueFromProfile(): Promise<void> {
    const name = this.profileForm.controls.displayName.value.trim();
    if (!name) {
      this.step.set('workspace');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    const result = await this.authPort.updateProfile({ displayName: name });
    this.saving.set(false);

    if (!result.ok) {
      this.errorMessage.set(result.error.message);
      return;
    }

    this.step.set('workspace');
  }

  protected async continueFromWorkspace(): Promise<void> {
    this.workspaceForm.markAllAsTouched();
    if (this.workspaceForm.invalid) {
      return;
    }

    const name = this.workspaceForm.controls.name.value.trim();
    const slug = slugifyOrganizationName(name);

    if (!isValidOrganizationSlug(slug)) {
      this.errorMessage.set(
        'Choose a workspace name with at least one letter or number.',
      );
      return;
    }

    this.creating.set(true);
    this.errorMessage.set(null);

    const result = await this.orgPort.createOrganization({ name, slug });
    this.creating.set(false);

    if (!result.ok) {
      this.errorMessage.set(result.error.message);
      return;
    }

    const selectResult = await this.orgPort.selectOrganization(result.data.slug);
    if (!selectResult.ok) {
      this.errorMessage.set(selectResult.error.message);
      return;
    }

    this.createdWorkspaceSlug = result.data.slug;
    this.step.set('invite');
  }

  protected async finish(): Promise<void> {
    this.finishing.set(true);
    if (this.createdWorkspaceSlug) {
      await this.orgPort.selectOrganization(this.createdWorkspaceSlug);
    }
    await this.router.navigate(['/workspace']);
    this.finishing.set(false);
  }
}
