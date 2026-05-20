import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import {
  type RetrospectiveSendPeriod,
  retrospectiveSendPeriodLabel,
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

@Component({
  selector: 'oequ-onboarding-retrospective-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmDialogImports,
    HlmInput,
    HlmSelectImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          <hlm-dialog-header>
            <h3 hlmDialogTitle>Simulate send history</h3>
            <p hlmDialogDescription>
              Choose how many emails to backfill and the time window. After
              confirming, Metrics loads and replays volume over about 2 seconds.
              Sends respect your plan limits.
            </p>
          </hlm-dialog-header>

          <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
            <div class="w-full min-w-0">
              <label for="retro-count" class="mb-1.5 block text-sm font-medium">
                Email count
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
                  Enter a number between 1 and 10,000.
                </p>
              }
            </div>

            <div class="w-full min-w-0">
              <label class="mb-1.5 block text-sm font-medium">
                Time period
              </label>
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
                Cancel
              </button>
              <button hlmBtn type="submit" [disabled]="submitting()">
                {{ submitting() ? 'Starting…' : 'Run simulation' }}
              </button>
            </hlm-dialog-footer>
          </form>
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>
  `,
})
export class OnboardingRetrospectiveDialogComponent {
  readonly open = input(false);
  readonly submitting = input(false);

  readonly confirmed = output<OnboardingRetrospectiveConfirm>();
  readonly cancelled = output<void>();

  protected readonly dialogContentClass = SETTINGS_DIALOG_CONTENT_CLASS;
  protected readonly periodOptions = PERIOD_OPTIONS;
  protected readonly periodLabel = retrospectiveSendPeriodLabel;
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
