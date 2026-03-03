import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { isUUID, isString, isSafePath, validationError } from "../_shared/validate.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalSecret = req.headers.get("x-internal-secret");
    const storedInternalSecret = Deno.env.get("INTERNAL_PUSH_SECRET");

    const isInternalCall = storedInternalSecret && internalSecret === storedInternalSecret;
    const isServiceRole = token === serviceRoleKey;

    let authenticatedUserId: string | null = null;

    if (!isInternalCall && !isServiceRole) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: claimsData, error: authError } = await supabaseAuth.auth.getClaims(token);
      if (authError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authenticatedUserId = claimsData.claims.sub as string;

      const allowed = await checkRateLimit(authenticatedUserId, "send-push-notification", 100, 3600);
      if (!allowed) {
        return rateLimitResponse(corsHeaders);
      }
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return validationError("Invalid JSON body", corsHeaders);
    }

    const { user_id: requestedUserId, title, message, path } = body as Record<string, unknown>;

    // Validate inputs
    if (requestedUserId !== undefined && !isUUID(requestedUserId)) {
      return validationError("user_id must be a valid UUID", corsHeaders);
    }
    if (!isString(title, 1, 200)) {
      return validationError("title is required and must be 1-200 characters", corsHeaders);
    }
    if (message !== undefined && message !== null && !isString(message, 0, 1000)) {
      return validationError("message must be under 1000 characters", corsHeaders);
    }
    if (path !== undefined && path !== null && !isSafePath(path)) {
      return validationError("path must be a valid URL path", corsHeaders);
    }

    const user_id = (isInternalCall || isServiceRole)
      ? requestedUserId as string
      : authenticatedUserId;

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subError || !subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title: title as string,
      body: (message as string) || "",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: { path: (path as string) || "/" },
    });

    let sent = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            TTL: "86400",
          },
          body: payload,
        });

        if (response.ok || response.status === 201) {
          sent++;
        } else if (response.status === 410) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        } else {
          errors.push(`Status ${response.status} for ${sub.endpoint.slice(0, 50)}`);
        }
      } catch (e) {
        errors.push(e.message);
      }
    }

    return new Response(
      JSON.stringify({ sent, total: subscriptions.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
