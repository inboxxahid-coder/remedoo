import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function checkRateLimit(
  userKey: string,
  endpoint: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
    _user_key: userKey,
    _endpoint: endpoint,
    _max_requests: maxRequests,
    _window_seconds: windowSeconds,
  });

  if (error) {
    console.error("[rate-limit] Error checking rate limit:", error.message);
    // Fail open to avoid blocking legitimate requests on DB errors
    return true;
  }

  return data === true;
}

export function rateLimitResponse(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
