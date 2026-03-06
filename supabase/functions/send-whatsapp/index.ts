import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { isString, validationError } from "../_shared/validate.ts";

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
      const allowed = await checkRateLimit(authenticatedUserId, "send-whatsapp", 20, 3600);
      if (!allowed) return rateLimitResponse(corsHeaders);
    }

    let body: unknown;
    try { body = await req.json(); } catch { return validationError("Invalid JSON body", corsHeaders); }

    const { phone, template_name, language_code, components, text_message } = body as Record<string, unknown>;

    if (!isString(phone, 10, 15)) return validationError("phone is required (10-15 chars)", corsHeaders);

    const waToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const waPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!waToken || !waPhoneId) {
      return new Response(JSON.stringify({ error: "WhatsApp API not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const graphUrl = `https://graph.facebook.com/v21.0/${waPhoneId}/messages`;
    let waBody: Record<string, unknown>;

    if (template_name && isString(template_name, 1, 100)) {
      // Template message
      waBody = {
        messaging_product: "whatsapp",
        to: phone as string,
        type: "template",
        template: {
          name: template_name as string,
          language: { code: (language_code as string) || "en" },
          ...(Array.isArray(components) ? { components } : {}),
        },
      };
    } else if (isString(text_message, 1, 4096)) {
      // Plain text message
      waBody = {
        messaging_product: "whatsapp",
        to: phone as string,
        type: "text",
        text: { body: text_message as string },
      };
    } else {
      return validationError("Either template_name or text_message is required", corsHeaders);
    }

    const response = await fetch(graphUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${waToken}`,
      },
      body: JSON.stringify(waBody),
    });

    const result = await response.json();

    // Audit log
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
    await supabaseAdmin.from("audit_logs").insert({
      user_id: authenticatedUserId || "system",
      action: "whatsapp_sent",
      entity_type: "whatsapp",
      details: { phone: (phone as string).slice(0, 6) + "****", template_name, success: response.ok },
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
