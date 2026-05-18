import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  isValidOrganizationSlug,
  ORG_PORT,
  slugifyOrganizationName,
} from '@oequ/ports';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';

@Component({
  selector: 'oequ-onboarding-create-workspace',
  imports: [ReactiveFormsModule, HlmCardImports, HlmButtonImports, HlmInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-lg">
      <div class="mb-8">
        <p class="text-primary text-sm font-medium tracking-wide uppercase">
          Welcome
        </p>
        <h1 class="mt-2 text-2xl font-semibold tracking-tight">
          Create your workspace
        </h1>
        <p class="text-muted-foreground mt-2 text-sm leading-6">
          Choose a name for your team. You will complete activation next.
        </p>
      </div>

      <section hlmCard class="gap-0 overflow-hidden py-0">
        <div hlmCardContent class="!p-6">
          <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
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
              @if (submitAttempted() && form.controls.name.invalid) {
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
                [disabled]="creating()"
              >
                {{ creating() ? 'Creating…' : 'Create workspace' }}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  `,
})
export class OnboardingCreateWorkspaceComponent {
  private readonly orgPort = inject(ORG_PORT);

  protected readonly creating = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(64),
      ],
    }),
  });

  protected async submit(): Promise<void> {
    this.submitAttempted.set(true);
    if (this.form.invalid || this.creating()) {
      return;
    }

    const name = this.form.controls.name.value.trim();
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
    if (!result.ok) {
      this.creating.set(false);
      this.errorMessage.set(result.error.message);
      return;
    }

    const selectResult = await this.orgPort.selectOrganization(result.data.slug);
    this.creating.set(false);

    if (!selectResult.ok) {
      this.errorMessage.set(selectResult.error.message);
    }
  }
}
