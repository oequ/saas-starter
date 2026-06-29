/** Structured log line for public-v1 Edge handlers. */
export function publicApiLog(
  event: string,
  fields: Record<string, unknown>,
): void {
  console.log(JSON.stringify({ event, ...fields }));
}
