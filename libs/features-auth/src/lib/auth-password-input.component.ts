import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';

import { AUTH_INPUT_CLASS } from './auth-form.tokens';

@Component({
  selector: 'oequ-auth-password-input',
  imports: [ReactiveFormsModule, NgIcon, HlmInput, HlmButtonImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideEye, lucideEyeOff })],
  template: `
    <div class="relative">
      <input
        [id]="inputId()"
        hlmInput
        [type]="visible() ? 'text' : 'password'"
        [autocomplete]="autocomplete()"
        [placeholder]="placeholder()"
        [class]="inputClass"
        class="pe-10"
        [formControl]="control()"
      />
      <button
        type="button"
        hlmBtn
        variant="ghost"
        size="icon"
        class="text-muted-foreground hover:text-foreground absolute top-0 right-0 size-9 shrink-0 shadow-none"
        [attr.aria-label]="visible() ? 'Hide password visibility' : 'Show password visibility'"
        [attr.aria-pressed]="visible()"
        (click)="toggleVisible()"
      >
        <ng-icon
          [name]="visible() ? 'lucideEyeOff' : 'lucideEye'"
          class="size-4"
          aria-hidden="true"
        />
      </button>
    </div>
  `,
})
export class AuthPasswordInputComponent {
  readonly inputId = input.required<string>();
  readonly control = input.required<FormControl<string>>();
  readonly autocomplete = input('current-password');
  readonly placeholder = input('');

  protected readonly inputClass = AUTH_INPUT_CLASS;
  protected readonly visible = signal(false);

  protected toggleVisible(): void {
    this.visible.update((value) => !value);
  }
}
