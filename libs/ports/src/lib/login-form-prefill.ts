/**
 * Optional login form defaults. Provided only by demo/mock wiring
 * (`provideDemoAdapters`). Production apps (web, api-console) omit this token
 * so the form stays empty.
 */
export interface LoginFormPrefill {
  readonly email: string;
  readonly password: string;
}

