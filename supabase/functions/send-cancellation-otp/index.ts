import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { isUUID, validationError } from "../_shared/validate.ts";
import { hashOtp } from "../_shared/otp-hash.ts";

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Rate limit: 3 OTP requests per hour per user
    const allowed = await checkRateLimit(userId, "send-cancellation-otp", 3, 3600);
    if (!allowed) {
      return rateLimitResponse(corsHeaders);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return validationError("Invalid JSON body", corsHeaders);
    }

    const { appointment_id } = body as Record<string, unknown>;

    if (!isUUID(appointment_id)) {
      return validationError("appointment_id must be a valid UUID", corsHeaders);
    }

    // Verify appointment belongs to user and is confirmed
    const { data: apt } = await supabaseAdmin
      .from("appointments")
      .select("id, status, patient_id")
      .eq("id", appointment_id)
      .eq("patient_id", userId)
      .single();

    if (!apt) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (apt.status !== "confirmed") {
      return new Response(JSON.stringify({ error: "OTP not required for non-confirmed appointments" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OTP settings
    const { data: settings } = await supabaseAdmin
      .from("cancellation_otp_settings")
      .select("*")
      .limit(1)
      .single();

    if (!settings?.otp_required_for_confirmed) {
      return new Response(JSON.stringify({ otp_required: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Get user profile for contact info
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, phone, full_name")
      .eq("user_id", userId)
      .single();

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = profile?.email || authUser?.user?.email;
    const phone = profile?.phone;

    const channelsUsed: string[] = [];

    if (settings.email_enabled && email) {
      console.log(`[OTP] Email to ${email}: Your cancellation OTP is ${otp}`);
      channelsUsed.push("email");
    }

    if (settings.sms_enabled && phone) {
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

      if (twilioSid && twilioToken && twilioPhone) {
        try {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
          const smsBody = new URLSearchParams({
            To: phone,
            From: twilioPhone,
            Body: `Your appointment cancellation OTP is: ${otp}. Valid for 5 minutes.`,
          });

          await fetch(twilioUrl, {
            method: "POST",
            headers: {
              Authorization: "Basic " + btoa(`${twilioSid}:${twilioToken}`),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: smsBody,
          });
          channelsUsed.push("sms");
        } catch (e) {
          console.error("[OTP] SMS send failed:", e);
        }
      }
    }

    if (settings.whatsapp_enabled && phone) {
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioWhatsapp = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

      if (twilioSid && twilioToken && twilioWhatsapp) {
        try {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
          const waBody = new URLSearchParams({
            To: `whatsapp:${phone}`,
            From: `whatsapp:${twilioWhatsapp}`,
            Body: `Your appointment cancellation OTP is: ${otp}. Valid for 5 minutes.`,
          });

          await fetch(twilioUrl, {
            method: "POST",
            headers: {
              Authorization: "Basic " + btoa(`${twilioSid}:${twilioToken}`),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: waBody,
          });
          channelsUsed.push("whatsapp");
        } catch (e) {
          console.error("[OTP] WhatsApp send failed:", e);
        }
      }
    }

    // Store hashed OTP
    await supabaseAdmin.from("cancellation_otps").insert({
      appointment_id,
      user_id: userId,
      otp_code: otpHash,
      channels_used: channelsUsed,
      expires_at: expiresAt,
    });

    return new Response(
      JSON.stringify({
        otp_required: true,
        channels_used: channelsUsed,
        message: `OTP sent via ${channelsUsed.join(", ")}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-cancellation-otp] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
