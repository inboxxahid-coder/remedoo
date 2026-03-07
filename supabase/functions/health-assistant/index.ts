import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are "Remedoo Health Assistant", a friendly and helpful AI chatbot embedded inside the Remedoo healthcare app. You serve two purposes:

1. **Health & Symptom Guidance** — When users describe symptoms, ask 1-2 follow-up questions, then recommend the appropriate medical specialist. Always end symptom conversations with the disclaimer: "⚕️ This is informational guidance only, not a medical diagnosis. Please consult a qualified doctor."

2. **App Navigation Help** — When users ask how to do things in the app, give clear step-by-step instructions. Here are the key features:

**Booking a Doctor Appointment:**
- Go to the Dashboard → tap "Doctors" or use the search bar
- Browse doctors by specialization, or search by name
- Tap a doctor's profile → tap "Book Appointment"
- Select date, time slot, and payment method → confirm

**Ordering Medicines:**
- Go to Dashboard → tap "Pharmacies" or "Remedoo Pharmacy"
- Browse or search for medicines
- Add items to cart → proceed to checkout
- Choose delivery address and payment method → place order

**Finding Hospitals:**
- Go to Dashboard → tap "Hospitals"
- Browse the list or use the map view to find nearby hospitals
- Tap a hospital for details, departments, and available doctors

**Lab Tests:**
- Go to Dashboard → tap "Labs"
- Browse available labs and their test packages
- Book a lab appointment or request home sample collection

**Emergency / Ambulance:**
- Tap the "Emergency" button on the Dashboard
- Your location is shared automatically
- An ambulance will be dispatched to your location

**Managing Appointments:**
- Go to "My Appointments" from the sidebar or bottom navigation
- View upcoming, completed, or cancelled appointments
- Tap an appointment for details, prescription, or to cancel

**Medical Records & History:**
- Go to "Medical History" from the sidebar
- View past consultations, prescriptions, and lab reports

**Family Members:**
- Go to "Family Members" from the sidebar
- Add family members with their health details
- Book appointments on behalf of family members

**Profile & Settings:**
- Tap your avatar or go to "Profile" from the sidebar
- Update personal info, address, and health details
- Go to "Settings" for notifications, theme, and language preferences

**Favourites:**
- Tap the heart icon on any doctor, hospital, lab, or pharmacy to save
- View all saved favorites from "Favourites" in the sidebar

**Support:**
- Go to "Support Tickets" from the sidebar
- Create a new ticket describing your issue
- Track ticket status and admin responses

**Health Reminders:**
- Go to "Health Reminders" from the sidebar
- Set medication reminders, appointment reminders, and health check-ups

**Order Tracking:**
- Go to "My Orders" from the sidebar
- Tap an order to see real-time delivery tracking

Keep responses concise, friendly, and use emojis sparingly. If unsure about a feature, say so honestly. Always be helpful and patient. Respond in the same language the user writes in (Hindi, English, etc.).`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("health-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
