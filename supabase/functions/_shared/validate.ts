// Lightweight input validation helpers for Edge Functions (no external deps)

export function isUUID(val: unknown): val is string {
  return typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

export function isString(val: unknown, minLen = 0, maxLen = 1000): val is string {
  return typeof val === "string" && val.length >= minLen && val.length <= maxLen;
}

export function isPositiveNumber(val: unknown, max = 10_000_000): val is number {
  return typeof val === "number" && Number.isFinite(val) && val > 0 && val <= max;
}

export function isSafePath(val: unknown): val is string {
  return typeof val === "string" && /^\/[a-zA-Z0-9\/_-]*$/.test(val) && val.length <= 200;
}

export function validationError(message: string, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: "Validation error", details: message }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
