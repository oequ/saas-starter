import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';

import { apiConsoleSupabaseSettings } from '../supabase.settings';

const STORAGE_KEY = 'api-console.playground.apiSecret';
const DEMO_RUN_ID_STORAGE_KEY = 'api-console.playground.demoRunId';

interface PlaygroundPreset {
  readonly id: string;
  readonly label: string;
  readonly method: 'GET' | 'POST';
  readonly path: string;
  readonly sampleBody?: string;
  readonly needsRunId?: boolean;
}

const OSS_PRESETS: readonly PlaygroundPreset[] = [
  { id: 'account', label: 'GET /account', method: 'GET', path: '/account' },
  {
    id: 'demo-runs',
    label: 'POST /demo-runs',
    method: 'POST',
    path: '/demo-runs',
    sampleBody: JSON.stringify({ message: 'hello from playground' }, null, 2),
  },
  {
    id: 'demo-run-get',
    label: 'GET /demo-runs/{id}',
    method: 'GET',
    path: '/demo-runs/{id}',
    needsRunId: true,
  },
];

@Component({
  selector: 'ac-playground-page',
  imports: [
    FormsModule,
    RouterLink,
    HlmCardImports,
    HlmButtonImports,
    HlmInput,
    HlmSelectImports,
    HlmTextareaImports,
  ],
  templateUrl: './playground.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaygroundPageComponent implements OnInit {
  private readonly settings = apiConsoleSupabaseSettings;

  protected readonly presets = OSS_PRESETS;

  protected readonly baseUrl = computed(() => {
    const root = this.settings.url.replace(/\/$/, '');
    return `${root}/functions/v1/public-v1/v1`;
  });

  protected readonly presetId = signal(OSS_PRESETS[0].id);
  protected readonly apiSecret = signal('');
  protected readonly runId = signal('');
  protected readonly requestBody = signal(OSS_PRESETS[1].sampleBody ?? '');
  protected readonly responseText = signal<string | null>(null);
  protected readonly responseStatus = signal<number | null>(null);
  protected readonly running = signal(false);
  protected readonly copyHint = signal('');

  protected readonly activePreset = computed(() => {
    const id = this.presetId();
    return OSS_PRESETS.find((p) => p.id === id) ?? OSS_PRESETS[0];
  });

  protected readonly requestUrl = computed(() => {
    const preset = this.activePreset();
    if (preset.needsRunId) {
      const id = encodeURIComponent(this.runId().trim());
      return `${this.baseUrl()}/demo-runs/${id}`;
    }
    return `${this.baseUrl()}${preset.path}`;
  });

  protected readonly showRunIdField = computed(
    () => this.activePreset().needsRunId === true,
  );

  ngOnInit(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      this.apiSecret.set(stored);
    }
    const lastDemoId = sessionStorage.getItem(DEMO_RUN_ID_STORAGE_KEY);
    if (lastDemoId) {
      this.runId.set(lastDemoId);
    }
  }

  protected onPresetChange(value: string | string[] | null | undefined): void {
    const id = Array.isArray(value) ? value[0] : value;
    if (!id) {
      return;
    }
    this.presetId.set(id);
    const preset = OSS_PRESETS.find((p) => p.id === id);
    if (preset?.sampleBody) {
      this.requestBody.set(preset.sampleBody);
    }
    this.responseText.set(null);
    this.responseStatus.set(null);
  }

  protected onSecretInput(value: string): void {
    this.apiSecret.set(value);
    if (typeof sessionStorage !== 'undefined') {
      if (value.trim()) {
        sessionStorage.setItem(STORAGE_KEY, value.trim());
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  protected onRunIdInput(value: string): void {
    this.runId.set(value);
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      sessionStorage.removeItem(DEMO_RUN_ID_STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(DEMO_RUN_ID_STORAGE_KEY, trimmed);
  }

  protected curlCommand(): string {
    const secret = this.apiSecret().trim();
    const preset = this.activePreset();
    const url = this.requestUrl();
    const anon = this.settings.anonKey;
    const auth = secret || '<your-oeq-key>';

    if (preset.method === 'POST') {
      const bodyFile = 'playground-body.json';
      return [
        '# Windows: save the JSON below as playground-body.json, then run:',
        `curl.exe -X POST "${url}" -H "apikey: ${anon}" -H "Authorization: Bearer ${auth}" -H "Content-Type: application/json" --data-binary @${bodyFile}`,
        '',
        '# JSON body (playground-body.json):',
        this.requestBody(),
      ].join('\r\n');
    }

    return [
      `curl.exe -X ${preset.method} "${url}"`,
      `-H "apikey: ${anon}"`,
      `-H "Authorization: Bearer ${auth}"`,
    ].join(' ');
  }

  protected async copyCurl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.curlCommand());
      this.copyHint.set('Copied');
    } catch {
      this.copyHint.set('Copy failed');
    }
    setTimeout(() => this.copyHint.set(''), 2000);
  }

  protected async sendRequest(): Promise<void> {
    const secret = this.apiSecret().trim();
    if (!secret) {
      this.responseText.set('Paste your API key.');
      this.responseStatus.set(null);
      return;
    }

    const preset = this.activePreset();
    if (preset.needsRunId && !this.runId().trim()) {
      this.responseText.set('Enter a resource id.');
      this.responseStatus.set(null);
      return;
    }

    this.running.set(true);
    this.responseText.set(null);
    this.responseStatus.set(null);

    try {
      const headers: Record<string, string> = {
        apikey: this.settings.anonKey,
        Authorization: `Bearer ${secret}`,
      };
      let body: string | undefined;
      if (preset.method === 'POST') {
        headers['Content-Type'] = 'application/json';
        body = this.requestBody();
      }
      const res = await fetch(this.requestUrl(), {
        method: preset.method,
        headers,
        body,
      });
      this.responseStatus.set(res.status);
      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : null;
        this.responseText.set(JSON.stringify(parsed, null, 2));
      } catch {
        this.responseText.set(text || '(empty body)');
      }

      if (res.ok && parsed && typeof parsed === 'object' && preset.id === 'demo-runs') {
        const runId = extractTopLevelId(parsed as Record<string, unknown>);
        if (runId) {
          this.runId.set(runId);
          this.onRunIdInput(runId);
        }
      }
    } catch (err) {
      this.responseText.set(
        err instanceof Error ? err.message : 'Request failed',
      );
      this.responseStatus.set(null);
    } finally {
      this.running.set(false);
    }
  }
}

function extractTopLevelId(body: Record<string, unknown>): string | null {
  const top = body['id'];
  if (typeof top === 'string' && top.trim()) {
    return top.trim();
  }
  const nested = body['run'];
  if (nested && typeof nested === 'object') {
    const id = (nested as Record<string, unknown>)['id'];
    if (typeof id === 'string' && id.trim()) {
      return id.trim();
    }
  }
  return null;
}
