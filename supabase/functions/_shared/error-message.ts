/** Normalize Supabase/PostgREST/Deno errors for Edge handlers. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message: unknown }).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }
  return 'unknown error';
}
