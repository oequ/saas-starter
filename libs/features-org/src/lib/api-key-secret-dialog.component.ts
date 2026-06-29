import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@oequ/i18n';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

@Component({
  selector: 'oequ-api-key-secret-dialog',
  imports: [HlmButtonImports, HlmDialogImports, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          <hlm-dialog-header>
            <h3 hlmDialogTitle>{{ 'org.apiKeys.secretDialog.title' | transloco }}</h3>
            <p hlmDialogDescription>
              {{ 'org.apiKeys.secretDialog.description' | transloco }}
            </p>
          </hlm-dialog-header>

          <div
            class="bg-muted/50 border-input max-h-28 overflow-x-auto rounded-md border px-3 py-2 font-mono text-xs break-all"
          >
            {{ secret() }}
          </div>

          <hlm-dialog-footer class="gap-2 sm:justify-end">
            <button
              hlmBtn
              type="button"
              variant="outline"
              (click)="copySecret()"
            >
              {{ 'org.apiKeys.secretDialog.copy' | transloco }}
            </button>
            <button hlmBtn type="button" hlmDialogClose>
              {{ 'org.apiKeys.secretDialog.done' | transloco }}
            </button>
          </hlm-dialog-footer>
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>
  `,
})
export class ApiKeySecretDialogComponent {
  readonly open = input(false);
  readonly secret = input.required<string>();

  readonly closed = output<void>();

  private readonly transloco = inject(TranslocoService);

  protected readonly dialogContentClass =
    'w-[calc(100%-2rem)] sm:!max-w-md overflow-hidden';

  protected readonly dialogState = computed(() =>
    this.open() ? 'open' : 'closed',
  );

  protected copySecret(): void {
    const value = this.secret();
    if (!value || typeof navigator === 'undefined' || !navigator.clipboard) {
      toast.error(
        this.transloco.translate('org.apiKeys.secretDialog.copyFailed'),
      );
      return;
    }
    void navigator.clipboard.writeText(value).then(
      () =>
        toast.success(
          this.transloco.translate('org.apiKeys.secretDialog.copySuccess'),
        ),
      () =>
        toast.error(
          this.transloco.translate('org.apiKeys.secretDialog.copyFailed'),
        ),
    );
  }

  protected onDialogClosed(): void {
    this.closed.emit();
  }
}
