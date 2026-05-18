import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { SETTINGS_DIALOG_CONTENT_CLASS } from '@oequ/shell';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

@Component({
  selector: 'oequ-api-key-secret-dialog',
  imports: [HlmButtonImports, HlmDialogImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          <hlm-dialog-header>
            <h3 hlmDialogTitle>API key created</h3>
            <p hlmDialogDescription>
              Copy your API key now. You will not be able to see it again.
            </p>
          </hlm-dialog-header>

          <div
            class="bg-muted/50 border-input flex items-center justify-between gap-3 rounded-md border px-3 py-2 font-mono text-sm"
          >
            <span class="min-w-0 truncate">{{ secret() }}</span>
            <button
              hlmBtn
              type="button"
              variant="secondary"
              size="sm"
              (click)="copySecret()"
            >
              Copy
            </button>
          </div>

          <hlm-dialog-footer>
            <button hlmBtn type="button" hlmDialogClose>Done</button>
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

  protected readonly dialogContentClass = SETTINGS_DIALOG_CONTENT_CLASS;

  protected readonly dialogState = computed(() =>
    this.open() ? 'open' : 'closed',
  );

  protected copySecret(): void {
    const value = this.secret();
    if (!value || typeof navigator === 'undefined' || !navigator.clipboard) {
      toast.error('Could not copy to clipboard.');
      return;
    }
    void navigator.clipboard.writeText(value).then(
      () => toast.success('API key copied to clipboard.'),
      () => toast.error('Could not copy to clipboard.'),
    );
  }

  protected onDialogClosed(): void {
    this.closed.emit();
  }
}
