import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { forkJoin, map, Observable } from 'rxjs';

const SCOPES = [
  'common',
  'shell',
  'auth',
  'onboarding',
  'account',
  'org-members',
  'cookie',
  'org-billing',
  'paywall',
  'org-usage',
  'org-metrics',
  'org-emails',
  'org-api-keys',
  'org-integrations',
  'org-general',
  'help',
  'legal',
] as const;

function orgScopeSegment(scope: string): string | null {
  if (!scope.startsWith('org-')) {
    return null;
  }
  return scope
    .slice(4)
    .split('-')
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join('');
}

function wrapScope(scope: string, data: Record<string, unknown>): Translation {
  const orgSegment = orgScopeSegment(scope);
  if (orgSegment) {
    return { org: { [orgSegment]: data } };
  }
  return { [scope]: data };
}

function deepMerge(target: Translation, source: Translation): Translation {
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];
    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      deepMerge(targetValue as Translation, sourceValue as Translation);
    } else {
      target[key] = sourceValue;
    }
  }
  return target;
}

@Injectable({ providedIn: 'root' })
export class OequTranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string): Observable<Translation> {
    const requests = SCOPES.map((scope) =>
      this.http
        .get<Record<string, unknown>>(`/i18n/${lang}/${scope}.json`)
        .pipe(map((data) => wrapScope(scope, data))),
    );
    return forkJoin(requests).pipe(
      map((parts) =>
        parts.reduce((acc, part) => deepMerge(acc, part), {} as Translation),
      ),
    );
  }
}
