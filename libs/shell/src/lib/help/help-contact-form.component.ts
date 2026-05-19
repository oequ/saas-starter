import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SUPPORT_PORT, type SupportImpact } from '@oequ/ports';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTextarea } from '@spartan-ng/helm/textarea';

const IMPACT_OPTIONS: readonly {
  readonly value: SupportImpact;
  readonly label: string;
}[] = [
  { value: 'low', label: 'Low — question or guidance' },
  { value: 'medium', label: 'Medium — blocking a task' },
  { value: 'high', label: 'High — production issue' },
  { value: 'critical', label: 'Outage — service unavailable' },
];

@Component({
  selector: 'oequ-help-contact-form',
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmInput,
    HlmTextarea,
    HlmSelectImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
      <div class="w-full min-w-0">
        <label for="help-subject" class="mb-1.5 block text-sm font-medium">
          Subject
        </label>
        <input
          id="help-subject"
          hlmInput
          type="text"
          maxlength="120"
          autocomplete="off"
          class="w-full shadow-none"
          formControlName="subject"
          placeholder="Summary of your request"
        />
        @if (submitAttempted() && form.controls.subject.invalid) {
          <p class="text-destructive mt-1.5 text-sm">Subject is required.</p>
        }
      </div>

      <div class="w-full min-w-0">
        <label for="help-message" class="mb-1.5 block text-sm font-medium">
          Message
        </label>
        <textarea
          id="help-message"
          hlmTextarea
          rows="5"
          class="w-full shadow-none"
          formControlName="message"
          placeholder="Describe your issue in detail"
        ></textarea>
        @if (submitAttempted() && form.controls.message.invalid) {
          <p class="text-destructive mt-1.5 text-sm">
            Message must be at least 20 characters.
          </p>
        }
      </div>

      <div class="w-full min-w-0">
        <label
          for="help-impact-trigger"
          class="mb-1.5 block text-sm font-medium"
        >
          What&apos;s the current impact?
        </label>
        <hlm-select
          class="block w-full"
          [value]="form.controls.impact.value"
          (valueChange)="onImpactChange($event)"
        >
          <hlm-select-trigger
            buttonId="help-impact-trigger"
            class="border-input h-9 w-full shadow-none"
          >
            <span hlmSelectValue placeholder="Select impact level"></span>
          </hlm-select-trigger>
          <hlm-select-content
            *hlmSelectPortal
            class="w-[var(--brn-select-width)]"
          >
            @for (option of impactOptions; track option.value) {
              <hlm-select-item [value]="option.value">
                {{ option.label }}
              </hlm-select-item>
            }
          </hlm-select-content>
        </hlm-select>
      </div>

      @if (errorMessage(); as message) {
        <p class="text-destructive text-sm" role="alert">{{ message }}</p>
      }

      <div class="flex justify-end gap-2 pt-2">
        <button
          hlmBtn
          type="button"
          variant="secondary"
          (click)="cancelled.emit()"
        >
          Cancel
        </button>
        <button hlmBtn type="submit" [disabled]="submitting()">
          {{ submitting() ? 'Sending…' : 'Send' }}
        </button>
      </div>
    </form>
  `,
})
export class HelpContactFormComponent {
  private readonly supportPort = inject(SUPPORT_PORT);

  readonly cancelled = output<void>();
  readonly submitted = output<void>();

  protected readonly impactOptions = IMPACT_OPTIONS;
  protected readonly submitting = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup({
    subject: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(20)],
    }),
    impact: new FormControl<SupportImpact>('medium', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected onImpactChange(value: string | string[] | null | undefined): void {
    if (typeof value !== 'string') {
      return;
    }
    this.form.controls.impact.setValue(value as SupportImpact);
  }

  protected async submit(): Promise<void> {
    this.submitAttempted.set(true);
    if (this.form.invalid) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const result = await this.supportPort.submitTicket(this.form.getRawValue());
    this.submitting.set(false);

    if (!result.ok) {
      this.errorMessage.set(result.error.message);
      return;
    }

    toast.success(`Ticket #${result.data.ticketId} received. We'll reply by email.`);
    this.form.reset({ impact: 'medium' });
    this.submitAttempted.set(false);
    this.submitted.emit();
  }
}
