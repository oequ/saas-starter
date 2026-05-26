export const CONFIRM_EMAIL_RESEND_COOLDOWN_SECONDS = 60;

export function confirmEmailResendStorageKey(email: string): string {
  return `oequ-confirm-email-resend-until:${email.trim().toLowerCase()}`;
}

/** Persist cooldown; returns timestamp (ms) when resend is allowed again. */
export function markConfirmEmailResendCooldown(
  email: string,
  seconds = CONFIRM_EMAIL_RESEND_COOLDOWN_SECONDS,
): number {
  const until = Date.now() + seconds * 1000;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(confirmEmailResendStorageKey(email), String(until));
  }
  return until;
}

export function readConfirmEmailResendUntil(email: string): number | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  const raw = sessionStorage.getItem(confirmEmailResendStorageKey(email));
  if (!raw) {
    return null;
  }
  const until = Number(raw);
  return Number.isFinite(until) ? until : null;
}

export function confirmEmailResendCooldownRemainingSeconds(
  email: string,
): number {
  const until = readConfirmEmailResendUntil(email);
  if (!until) {
    return 0;
  }
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}
