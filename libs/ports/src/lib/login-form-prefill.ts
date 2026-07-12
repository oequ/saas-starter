import { InjectionToken } from '@angular/core';

/**
 * Optional login form defaults. Provided only by demo/mock wiring
 * (`provideDemoAdapters`). Production apps (web, api-console) omit this token
 * so the form stays empty.
 */
export interface LoginFormPrefill {
  readonly email: string;
  readonly password: string;
}

export const LOGIN_FORM_PREFILL = new InjectionToken<LoginFormPrefill>(
  'LOGIN_FORM_PREFILL',
);
