import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { TranslocoPipe, TranslocoService } from '@oequ/i18n';
import { SUPPORT_PORT, type SupportImpact } from '@oequ/ports';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTextarea } from '@spartan-ng/helm/textarea';

const IMPACT_VALUES: readonly SupportImpact[] = [
  'low',
  'medium',
  'high',
  'critical',
];

@Component({
  selector: 'oequ-help-contact-form',
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmInput,
    HlmTextarea,
    HlmSelectImports,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
      <div class="w-full min-w-0">
        <label for="help-subject" class="mb-1.5 block text-sm font-medium">
          {{ 'help.contact.subjectLabel' | transloco }}
        </label>
        <input
          id="help-subject"
          hlmInput
          type="text"
          maxlength="120"
          autocomplete="off"
          class="w-full shadow-none"
          formControlName="subject"
          [placeholder]="'help.contact.subjectPlaceholder' | transloco"
        />
        @if (submitAttempted() && form.controls.subject.invalid) {
          <p class="text-destructive mt-1.5 text-sm">
            {{ 'help.contact.subjectRequired' | transloco }}
          </p>
        }
      </div>

      <div class="w-full min-w-0">
        <label for="help-message" class="mb-1.5 block text-sm font-medium">
          {{ 'help.contact.messageLabel' | transloco }}
        </label>
        <textarea
          id="help-message"
          hlmTextarea
          rows="5"
          class="w-full shadow-none"
          formControlName="message"
          [placeholder]="'help.contact.messagePlaceholder' | transloco"
        ></textarea>
        @if (submitAttempted() && form.controls.message.invalid) {
          <p class="text-destructive mt-1.5 text-sm">
            {{ 'help.contact.messageMinLength' | transloco }}
          </p>
        }
      </div>

      <div class="w-full min-w-0">
        <label
          for="help-impact-trigger"
          class="mb-1.5 block text-sm font-medium"
        >
          {{ 'help.contact.impactLabel' | transloco }}
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
            <span class="truncate">{{ impactLabel() }}</span>
          </hlm-select-trigger>
          <hlm-select-content
            *hlmSelectPortal
            class="w-[var(--brn-select-width)]"
          >
            @for (value of impactValues; track value) {
              <hlm-select-item [value]="value">
                {{ impactLabelFor(value) }}
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
          {{ 'common.cancel' | transloco }}
        </button>
        <button hlmBtn type="submit" [disabled]="submitting()">
          {{
            submitting()
              ? ('help.contact.sending' | transloco)
              : ('help.contact.send' | transloco)
          }}
        </button>
      </div>
    </form>
  `,
})
export class HelpContactFormComponent {
  private readonly supportPort = inject(SUPPORT_PORT);
  private readonly transloco = inject(TranslocoService);

  readonly cancelled = output<void>();
  readonly submitted = output<void>();

  protected readonly impactValues = IMPACT_VALUES;
  protected readonly submitting = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly impactLabel = computed(() =>
    this.impactLabelFor(this.form.controls.impact.value),
  );

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

  protected impactLabelFor(value: SupportImpact): string {
    return this.transloco.translate(`help.contact.impact.${value}`);
  }

  protected onImpactChange(value: string | string[] | null | undefined): void {
    if (typeof value !== 'string') {
      return;
    }
    if (
      value === 'low' ||
      value === 'medium' ||
      value === 'high' ||
      value === 'critical'
    ) {
      this.form.controls.impact.setValue(value);
    }
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

    toast.success(
      this.transloco.translate('help.contact.toast', {
        ticketId: result.data.ticketId,
      }),
    );
    this.form.reset({ impact: 'medium' });
    this.submitAttempted.set(false);
    this.submitted.emit();
  }
}
