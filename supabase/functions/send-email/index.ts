import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { isString, validationError } from "../_shared/validate.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

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
      const allowed = await checkRateLimit(authenticatedUserId, "send-email", 30, 3600);
      if (!allowed) return rateLimitResponse(corsHeaders);
    }

    let body: unknown;
    try { body = await req.json(); } catch { return validationError("Invalid JSON body", corsHeaders); }

    const { to, subject, html, text } = body as Record<string, unknown>;

    if (!isString(to, 5, 320)) return validationError("to email is required", corsHeaders);
    if (!isString(subject, 1, 500)) return validationError("subject is required", corsHeaders);
    if (!isString(html, 1, 50000) && !isString(text, 1, 50000)) {
      return validationError("html or text body is required", corsHeaders);
    }

    // Get Gmail SMTP config from platform_settings or secrets
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("key, value")
      .in("key", ["gmail_sender_email", "gmail_app_password", "gmail_sender_name"]);

    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    const senderEmail = settingsMap.gmail_sender_email || Deno.env.get("GMAIL_SENDER_EMAIL");
    const appPassword = settingsMap.gmail_app_password || Deno.env.get("GMAIL_APP_PASSWORD");
    const senderName = settingsMap.gmail_sender_name || "Remedoo";

    if (!senderEmail || !appPassword) {
      return new Response(JSON.stringify({ error: "Gmail SMTP not configured. Set gmail_sender_email and gmail_app_password in platform settings." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new SmtpClient();

    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: senderEmail,
      password: appPassword,
    });

    await client.send({
      from: `${senderName} <${senderEmail}>`,
      to: to as string,
      subject: subject as string,
      content: (text as string) || "",
      html: (html as string) || undefined,
    });

    await client.close();

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      user_id: authenticatedUserId || "system",
      action: "email_sent",
      entity_type: "email",
      details: { to: (to as string).slice(0, 3) + "***", subject, success: true },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Email send error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
