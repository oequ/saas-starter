import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCodeXml } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';

import { OnboardingCodeBlockComponent } from './onboarding/onboarding-code-block.component';

const AUTHENTICATION_SNIPPET = `curl https://api.example.com/v1/emails \\
  -H "Authorization: Bearer oeq_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "hello@your-domain.com",
    "to": "you@example.com",
    "subject": "Hello from Parcel",
    "html": "<p>Sent with your workspace API key.</p>"
  }'`;

const NODE_SNIPPET = `import { EmailClient } from '@your-app/sdk';

const client = new EmailClient({
  apiKey: process.env.OEQU_API_KEY,
});

await client.send({
  from: 'hello@your-domain.com',
  to: 'you@example.com',
  subject: 'Hello from Parcel',
  html: '<p>Sent with your workspace API key.</p>',
});`;

@Component({
  selector: 'oequ-api-keys-docs-sheet',
  imports: [
    NgIcon,
    HlmButtonImports,
    HlmSheetImports,
    OnboardingCodeBlockComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideCodeXml })],
  template: `
    <hlm-sheet side="right">
      <button
        hlmBtn
        hlmSheetTrigger
        type="button"
        variant="outline"
        size="icon"
        class="size-9 shrink-0"
        aria-label="View API documentation"
      >
        <ng-icon name="lucideCodeXml" class="size-4" aria-hidden="true" />
      </button>

      <hlm-sheet-content
        *hlmSheetPortal="let ctx"
        class="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl"
      >
        <hlm-sheet-header class="text-start">
          <h2 hlmSheetTitle>API documentation</h2>
          <p hlmSheetDescription>
            Authenticate requests with a workspace API key. Keys are scoped to
            this organization and can be revoked at any time.
          </p>
        </hlm-sheet-header>

        <div class="flex flex-1 flex-col gap-6 px-4 pb-4">
          <section class="space-y-2">
            <h3 class="text-sm font-medium">Authentication</h3>
            <p class="text-muted-foreground text-sm leading-6">
              Pass your secret key in the
              <code class="bg-muted rounded px-1 py-0.5 font-mono text-xs"
                >Authorization</code
              >
              header as a Bearer token. Never expose keys in client-side code or
              public repositories.
            </p>
          </section>

          <section class="space-y-2">
            <h3 class="text-sm font-medium">Send an email</h3>
            <p class="text-muted-foreground text-sm leading-6">
              Example request using an API key with sending access.
            </p>
            <oequ-onboarding-code-block
              languageLabel="cURL"
              [code]="authSnippet"
            />
          </section>

          <section class="space-y-2">
            <h3 class="text-sm font-medium">Node.js SDK</h3>
            <p class="text-muted-foreground text-sm leading-6">
              Use the official SDK in server-side applications.
            </p>
            <oequ-onboarding-code-block
              languageLabel="Node.js"
              [code]="nodeSnippet"
            />
          </section>
        </div>

        <hlm-sheet-footer class="flex-row justify-end border-t">
          <button hlmBtn type="button" variant="secondary" hlmSheetClose>
            Close
          </button>
        </hlm-sheet-footer>
      </hlm-sheet-content>
    </hlm-sheet>
  `,
})
export class ApiKeysDocsSheetComponent {
  protected readonly authSnippet = AUTHENTICATION_SNIPPET;
  protected readonly nodeSnippet = NODE_SNIPPET;
}
