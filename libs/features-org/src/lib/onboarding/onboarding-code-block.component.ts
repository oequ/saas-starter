import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCopy } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';

import {
  tokenizeJavaScript,
  type JsTokenKind,
} from './highlight-javascript';

@Component({
  selector: 'oequ-onboarding-code-block',
  imports: [NgIcon, HlmButtonImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideCopy, lucideCheck })],
  template: `
    <div
      class="border-input/80 ring-border/40 mt-4 overflow-hidden rounded-lg border ring-1"
    >
      <div
        class="border-border/60 bg-muted/25 flex items-center justify-between gap-3 border-b px-3 py-2"
      >
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex shrink-0 gap-1.5" aria-hidden="true">
            <span class="size-2.5 rounded-full bg-[#ff5f57]"></span>
            <span class="size-2.5 rounded-full bg-[#febc2e]"></span>
            <span class="size-2.5 rounded-full bg-[#28c840]"></span>
          </div>
          <span class="text-muted-foreground truncate text-xs font-medium">
            {{ languageLabel() }}
          </span>
        </div>
        <button
          hlmBtn
          type="button"
          variant="ghost"
          size="sm"
          class="text-muted-foreground hover:text-foreground h-7 shrink-0 px-2 text-xs"
          (click)="copyCode()"
        >
          <ng-icon
            [name]="copied() ? 'lucideCheck' : 'lucideCopy'"
            class="me-1.5 size-3.5"
            aria-hidden="true"
          />
          {{ copied() ? 'Copied' : 'Copy' }}
        </button>
      </div>
      <pre
        class="bg-[#0a0a0b] overflow-x-auto p-4 font-mono text-[13px] leading-[1.65] dark:bg-[#0a0a0b]"
      ><code class="block whitespace-pre">@for (token of tokens(); track $index) {<span [class]="tokenClass(token.kind)">{{ token.text }}</span>}</code></pre>
    </div>
  `,
})
export class OnboardingCodeBlockComponent {
  readonly code = input.required<string>();
  readonly languageLabel = input('Code');

  protected readonly copied = signal(false);

  protected readonly tokens = computed(() => tokenizeJavaScript(this.code()));

  protected tokenClass(kind: JsTokenKind): string {
    switch (kind) {
      case 'keyword':
        return 'text-[#c792ea]';
      case 'string':
        return 'text-[#ecc48d]';
      case 'punctuation':
        return 'text-[#565656]';
      default:
        return 'text-[#d4d4d8]';
    }
  }

  protected async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code());
      this.copied.set(true);
      toast.success('Copied to clipboard');
      window.setTimeout(() => this.copied.set(false), 2000);
    } catch {
      toast.error('Could not copy snippet');
    }
  }
}
