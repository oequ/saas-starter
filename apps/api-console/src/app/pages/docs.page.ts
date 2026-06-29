import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';

import { apiConsoleSupabaseSettings } from '../supabase.settings';

interface ApiSnippets {
  readonly curl: string;
  readonly typescript: string;
  readonly python: string;
}

@Component({
  selector: 'ac-docs-page',
  imports: [RouterLink, HlmCardImports],
  templateUrl: './docs.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsPageComponent {
  protected readonly openApiPath = 'openapi/public-v1.yaml';

  protected readonly baseUrl = (() => {
    const root = apiConsoleSupabaseSettings.url.replace(/\/$/, '');
    return `${root}/functions/v1/public-v1/v1`;
  })();

  protected readonly accountSnippets: ApiSnippets = {
    curl: [
      `curl -X GET "${this.baseUrl}/account" \\`,
      `  -H "apikey: <anon-key>" \\`,
      `  -H "Authorization: Bearer oeq_<your-key>"`,
    ].join('\n'),
    typescript: [
      `const res = await fetch("${this.baseUrl}/account", {`,
      `  headers: {`,
      `    apikey: ANON_KEY,`,
      `    Authorization: \`Bearer \${API_KEY}\`,`,
      `  },`,
      `});`,
      `const data = await res.json();`,
      `// data.usage_units`,
    ].join('\n'),
    python: [
      `import requests`,
      ``,
      `r = requests.get(`,
      `    "${this.baseUrl}/account",`,
      `    headers={`,
      `        "apikey": ANON_KEY,`,
      `        "Authorization": f"Bearer {API_KEY}",`,
      `    },`,
      `)`,
      `data = r.json()`,
      `# data["usage_units"]`,
    ].join('\n'),
  };

  protected readonly demoRunSnippets: ApiSnippets = {
    curl: [
      `curl -X POST "${this.baseUrl}/demo-runs" \\`,
      `  -H "apikey: <anon-key>" \\`,
      `  -H "Authorization: Bearer oeq_<your-key>" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '{"message":"hello"}'`,
    ].join('\n'),
    typescript: [
      `const res = await fetch("${this.baseUrl}/demo-runs", {`,
      `  method: "POST",`,
      `  headers: {`,
      `    apikey: ANON_KEY,`,
      `    Authorization: \`Bearer \${API_KEY}\`,`,
      `    "Content-Type": "application/json",`,
      `  },`,
      `  body: JSON.stringify({ message: "hello" }),`,
      `});`,
      `const data = await res.json();`,
      `// Costs 1 usage unit`,
    ].join('\n'),
    python: [
      `import requests`,
      ``,
      `r = requests.post(`,
      `    "${this.baseUrl}/demo-runs",`,
      `    headers={`,
      `        "apikey": ANON_KEY,`,
      `        "Authorization": f"Bearer {API_KEY}",`,
      `    },`,
      `    json={"message": "hello"},`,
      `)`,
      `data = r.json()`,
      `# Costs 1 usage unit`,
    ].join('\n'),
  };
}
