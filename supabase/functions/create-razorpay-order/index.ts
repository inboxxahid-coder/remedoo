import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { isString, isPositiveNumber, validationError } from "../_shared/validate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const allowed = await checkRateLimit(userId, "create-razorpay-order", 10, 600);
    if (!allowed) {
      return rateLimitResponse(corsHeaders);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return validationError("Invalid JSON body", corsHeaders);
    }

    const { order_id, amount } = body as Record<string, unknown>;

    // Validate inputs
    if (!isString(order_id, 1, 100)) {
      return validationError("order_id is required and must be 1-100 characters", corsHeaders);
    }
    if (!isPositiveNumber(amount, 500000)) {
      return validationError("amount must be a positive number up to ₹5,00,000", corsHeaders);
    }

    // Create Razorpay order
    const amountInPaise = Math.round(amount * 100);
    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: order_id,
        notes: { order_id },
      }),
    });

    const razorpayOrder = await razorpayRes.json();
    if (!razorpayRes.ok) {
      throw new Error(`Razorpay error [${razorpayRes.status}]: ${JSON.stringify(razorpayOrder)}`);
    }

    return new Response(
      JSON.stringify({
        razorpay_order_id: razorpayOrder.id,
        amount: amountInPaise,
        currency: "INR",
        key_id: RAZORPAY_KEY_ID,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating Razorpay order:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
