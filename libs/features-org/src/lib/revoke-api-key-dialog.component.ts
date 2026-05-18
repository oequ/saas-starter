import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { SETTINGS_DIALOG_CONTENT_CLASS } from '@oequ/shell';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

@Component({
  selector: 'oequ-revoke-api-key-dialog',
  imports: [HlmButtonImports, HlmDialogImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          <hlm-dialog-header>
            <h3 hlmDialogTitle class="text-destructive">Revoke API key</h3>
            <p hlmDialogDescription>
              Revoke <strong>{{ keyName() }}</strong>? Requests using this key
              will stop working immediately.
            </p>
          </hlm-dialog-header>

          <hlm-dialog-footer>
            <button hlmBtn type="button" variant="secondary" hlmDialogClose>
              Cancel
            </button>
            <button
              hlmBtn
              type="button"
              class="!border-destructive !bg-destructive !text-white shadow-xs hover:!bg-destructive/90"
              [disabled]="revoking()"
              (click)="confirm()"
            >
              {{ revoking() ? 'Revoking…' : 'Revoke key' }}
            </button>
          </hlm-dialog-footer>
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>
  `,
})
export class RevokeApiKeyDialogComponent {
  readonly open = input(false);
  readonly keyName = input.required<string>();
  readonly revoking = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly dialogContentClass = SETTINGS_DIALOG_CONTENT_CLASS;

  protected readonly dialogState = computed(() =>
    this.open() ? 'open' : 'closed',
  );

  private confirming = false;

  protected confirm(): void {
    this.confirming = true;
    this.confirmed.emit();
  }

  protected onDialogClosed(): void {
    if (this.confirming) {
      this.confirming = false;
      return;
    }
    this.cancelled.emit();
  }
}
