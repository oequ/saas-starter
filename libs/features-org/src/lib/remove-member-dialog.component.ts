import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  SETTINGS_DIALOG_CONTENT_CLASS,
} from '@oequ/shell';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

@Component({
  selector: 'oequ-remove-member-dialog',
  imports: [HlmButtonImports, HlmDialogImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          <hlm-dialog-header>
            <h3 hlmDialogTitle class="text-destructive">Remove member</h3>
            <p hlmDialogDescription>
              Remove <strong>{{ memberLabel() }}</strong> from this workspace?
              They will lose access immediately.
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
              [disabled]="removing()"
              (click)="confirm()"
            >
              {{ removing() ? 'Removing…' : 'Remove member' }}
            </button>
          </hlm-dialog-footer>
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>
  `,
})
export class RemoveMemberDialogComponent {
  readonly open = input(false);
  readonly memberLabel = input.required<string>();
  readonly removing = input(false);

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
