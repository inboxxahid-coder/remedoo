import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { isString, isUUID, validationError } from "../_shared/validate.ts";

const MSG91_API = "https://control.msg91.com/api/v5";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      const allowed = await checkRateLimit(authenticatedUserId, "send-sms", 20, 3600);
      if (!allowed) return rateLimitResponse(corsHeaders);
    }

    let body: unknown;
    try { body = await req.json(); } catch { return validationError("Invalid JSON body", corsHeaders); }

    const { phone, template_id, variables, message } = body as Record<string, unknown>;

    if (!isString(phone, 10, 15)) return validationError("phone is required (10-15 chars)", corsHeaders);

    const msg91AuthKey = Deno.env.get("MSG91_AUTH_KEY");
    if (!msg91AuthKey) {
      return new Response(JSON.stringify({ error: "MSG91_AUTH_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let response: Response;

    if (template_id && isString(template_id, 1, 100)) {
      // Send via MSG91 template (OTP / transactional)
      const sendBody: Record<string, unknown> = {
        template_id: template_id as string,
        short_url: "0",
        recipients: [
          {
            mobiles: (phone as string).replace(/^\+/, ""),
            ...(variables && typeof variables === "object" ? variables : {}),
          },
        ],
      };

      response = await fetch(`${MSG91_API}/flow/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: msg91AuthKey,
        },
        body: JSON.stringify(sendBody),
      });
    } else if (isString(message, 1, 500)) {
      // Send quick SMS (non-template)
      const senderId = Deno.env.get("MSG91_SENDER_ID") || "RMDOO";
      const route = Deno.env.get("MSG91_ROUTE") || "4"; // transactional

      response = await fetch(`${MSG91_API}/flow/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: msg91AuthKey,
        },
        body: JSON.stringify({
          sender: senderId,
          route,
          country: "91",
          sms: [
            {
              message: message as string,
              to: [(phone as string).replace(/^\+91/, "")],
            },
          ],
        }),
      });
    } else {
      return validationError("Either template_id or message is required", corsHeaders);
    }

    const result = await response.json();

    // Log SMS to audit
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
    await supabaseAdmin.from("audit_logs").insert({
      user_id: authenticatedUserId || "system",
      action: "sms_sent",
      entity_type: "sms",
      details: { phone: (phone as string).slice(0, 6) + "****", template_id, success: response.ok },
    });

    return new Response(JSON.stringify({ success: response.ok, data: result }), {
      status: response.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
