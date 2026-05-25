import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@oequ/i18n';
import { SETTINGS_DIALOG_CONTENT_CLASS } from '@oequ/shell';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

@Component({
  selector: 'oequ-confirm-seat-charge-dialog',
  imports: [HlmButtonImports, HlmDialogImports, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          <hlm-dialog-header>
            <h3 hlmDialogTitle>
              {{ 'org.members.seatChargeDialog.title' | transloco }}
            </h3>
            <p hlmDialogDescription>
              {{
                'org.members.seatChargeDialog.description'
                  | transloco: { email: inviteEmail(), quantity: seatQuantity() }
              }}
            </p>
          </hlm-dialog-header>

          <p class="text-muted-foreground text-sm leading-relaxed">
            {{ 'org.members.seatChargeDialog.prorationNote' | transloco }}
          </p>

          <hlm-dialog-footer>
            <button hlmBtn type="button" variant="secondary" hlmDialogClose>
              {{ 'common.cancel' | transloco }}
            </button>
            <button
              hlmBtn
              type="button"
              [disabled]="confirming()"
              (click)="confirm()"
            >
              @if (confirming()) {
                {{ 'org.members.inviteDialog.syncingSeats' | transloco }}
              } @else {
                {{ 'org.members.seatChargeDialog.confirm' | transloco }}
              }
            </button>
          </hlm-dialog-footer>
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>
  `,
})
export class ConfirmSeatChargeDialogComponent {
  readonly open = input(false);
  readonly inviteEmail = input.required<string>();
  readonly seatQuantity = input.required<number>();
  readonly confirming = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly dialogContentClass = SETTINGS_DIALOG_CONTENT_CLASS;

  protected readonly dialogState = computed(() =>
    this.open() ? 'open' : 'closed',
  );

  private confirmingAction = false;

  protected confirm(): void {
    this.confirmingAction = true;
    this.confirmed.emit();
  }

  protected onDialogClosed(): void {
    if (this.confirmingAction) {
      this.confirmingAction = false;
      return;
    }
    this.cancelled.emit();
  }
}
