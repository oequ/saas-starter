export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

export type AuthSession = {
  user: AuthUser;
};

export type AuthOk = { ok: true; session: AuthSession };
export type AuthFail = { ok: false; message: string; code?: string };
export type AuthResult = AuthOk | AuthFail;

/** Sign-up succeeded but email OTP confirmation is required (no session yet). */
export type SignUpPendingConfirm = {
  ok: false;
  code: 'emailConfirmationRequired';
  message: string;
  email: string;
};

export type SignUpResult = AuthOk | AuthFail | SignUpPendingConfirm;

export function isPendingConfirm(
  result: SignUpResult,
): result is SignUpPendingConfirm {
  return !result.ok && result.code === 'emailConfirmationRequired';
}
