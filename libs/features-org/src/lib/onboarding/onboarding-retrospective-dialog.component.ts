import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
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
import {
  type RetrospectiveSendPeriod,
} from '@oequ/ports';
import { SETTINGS_DIALOG_CONTENT_CLASS } from '@oequ/shell';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';

export interface OnboardingRetrospectiveConfirm {
  readonly count: number;
  readonly period: RetrospectiveSendPeriod;
}

const PERIOD_OPTIONS: readonly RetrospectiveSendPeriod[] = [
  'today',
  '7d',
  '30d',
];

const PERIOD_LABEL_KEYS: Record<RetrospectiveSendPeriod, string> = {
  today: 'onboarding.retroDialog.periodToday',
  '7d': 'onboarding.retroDialog.period7d',
  '30d': 'onboarding.retroDialog.period30d',
};

@Component({
  selector: 'oequ-onboarding-retrospective-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmDialogImports,
    HlmInput,
    HlmSelectImports,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          <hlm-dialog-header>
            <h3 hlmDialogTitle>
              {{ 'onboarding.retroDialog.title' | transloco }}
            </h3>
            <p hlmDialogDescription>
              {{ 'onboarding.retroDialog.description' | transloco }}
            </p>
          </hlm-dialog-header>

          <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
            <div class="w-full min-w-0">
              <label for="retro-count" class="mb-1.5 block text-sm font-medium">
                {{ 'onboarding.retroDialog.emailCount' | transloco }}
              </label>
              <input
                hlmInput
                id="retro-count"
                type="number"
                min="1"
                max="10000"
                step="1"
                formControlName="count"
                class="w-full"
              />
              @if (submitAttempted() && form.controls.count.invalid) {
                <p class="text-destructive mt-1 text-xs">
                  {{ 'onboarding.retroDialog.emailCountInvalid' | transloco }}
                </p>
              }
            </div>

            <div class="w-full min-w-0">
              <span class="mb-1.5 block text-sm font-medium">
                {{ 'onboarding.retroDialog.timePeriod' | transloco }}
              </span>
              <hlm-select
                class="w-full"
                [value]="form.controls.period.value"
                (valueChange)="onPeriodChange($event)"
              >
                <hlm-select-trigger
                  class="border-input h-9 w-full rounded-lg shadow-none"
                >
                  <span class="truncate">{{
                    periodLabel(form.controls.period.value)
                  }}</span>
                </hlm-select-trigger>
                <hlm-select-content
                  *hlmSelectPortal
                  class="w-[var(--brn-select-width)]"
                >
                  @for (option of periodOptions; track option) {
                    <hlm-select-item [value]="option">{{
                      periodLabel(option)
                    }}</hlm-select-item>
                  }
                </hlm-select-content>
              </hlm-select>
            </div>

            <hlm-dialog-footer>
              <button hlmBtn type="button" variant="secondary" hlmDialogClose>
                {{ 'common.cancel' | transloco }}
              </button>
              <button hlmBtn type="submit" [disabled]="submitting()">
                {{
                  submitting()
                    ? ('onboarding.retroDialog.starting' | transloco)
                    : ('onboarding.retroDialog.runSimulation' | transloco)
                }}
              </button>
            </hlm-dialog-footer>
          </form>
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>
  `,
})
export class OnboardingRetrospectiveDialogComponent {
  private readonly transloco = inject(TranslocoService);

  readonly open = input(false);
  readonly submitting = input(false);

  readonly confirmed = output<OnboardingRetrospectiveConfirm>();
  readonly cancelled = output<void>();

  protected readonly dialogContentClass = SETTINGS_DIALOG_CONTENT_CLASS;
  protected readonly periodOptions = PERIOD_OPTIONS;
  protected readonly submitAttempted = signal(false);

  protected readonly dialogState = computed(() =>
    this.open() ? 'open' : 'closed',
  );

  protected readonly form = new FormGroup({
    count: new FormControl(420, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(1),
        Validators.max(10_000),
      ],
    }),
    period: new FormControl<RetrospectiveSendPeriod>('7d', {
      nonNullable: true,
    }),
  });

  protected periodLabel(period: RetrospectiveSendPeriod): string {
    return this.transloco.translate(PERIOD_LABEL_KEYS[period]);
  }

  protected onPeriodChange(
    value: string | string[] | null | undefined,
  ): void {
    const next = Array.isArray(value) ? value[0] : value;
    if (
      next === 'today' ||
      next === '7d' ||
      next === '30d'
    ) {
      this.form.controls.period.setValue(next);
    }
  }

  protected submit(): void {
    this.submitAttempted.set(true);
    if (this.form.invalid) {
      return;
    }
    this.confirmed.emit({
      count: this.form.controls.count.value,
      period: this.form.controls.period.value,
    });
  }

  protected onDialogClosed(): void {
    this.submitAttempted.set(false);
    this.cancelled.emit();
  }
}
