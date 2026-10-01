import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const toRad = (v: number) => (v * Math.PI) / 180;
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const withDistance = <T extends { latitude?: number | null; longitude?: number | null }>(
  rows: T[],
  lat?: number | null,
  lng?: number | null,
) =>
  rows
    .map((r) => ({
      ...r,
      distance_km:
        lat != null && lng != null && r.latitude != null && r.longitude != null
          ? Math.round(distanceKm(lat, lng, r.latitude, r.longitude) * 10) / 10
          : null,
    }))
    .sort((a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI is not configured." }, 500);

    const body = await req.json().catch(() => ({}));
    const symptoms = String(body?.symptoms ?? "").trim().slice(0, 1500);
    if (symptoms.length < 3) return json({ error: "Please describe your symptoms." }, 400);

    const prefs = body?.preferences ?? {};
    const careType = ["any", "doctor", "hospital", "lab"].includes(prefs?.careType) ? prefs.careType : "any";
    const budget = typeof prefs?.budget === "number" ? prefs.budget : null;
    const maxDistance = typeof prefs?.maxDistanceKm === "number" ? prefs.maxDistanceKm : null;
    const urgency = ["routine", "soon", "urgent"].includes(prefs?.urgency) ? prefs.urgency : "routine";
    const notes = String(prefs?.notes ?? "").trim().slice(0, 500);
    const lat = typeof body?.latitude === "number" ? body.latitude : null;
    const lng = typeof body?.longitude === "number" ? body.longitude : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const [docRes, hospRes, labRes] = await Promise.all([
      careType === "any" || careType === "doctor"
        ? supabase.from("doctors_public").select("id, name, specialization, rating, consultation_fee, experience_years, hospital_id, hospitals(name, latitude, longitude)")
        : Promise.resolve({ data: [] as any[] }),
      careType === "any" || careType === "hospital"
        ? supabase.from("hospitals").select("id, name, location, rating, latitude, longitude, icu_available, emergency_available, available_beds")
        : Promise.resolve({ data: [] as any[] }),
      careType === "any" || careType === "lab"
        ? supabase.from("labs").select("id, name, location, rating, latitude, longitude, home_collection")
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const doctors = withDistance(
      ((docRes.data as any[]) ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        specialization: d.specialization,
        rating: d.rating,
        consultation_fee: d.consultation_fee,
        experience_years: d.experience_years,
        hospital_name: d.hospitals?.name ?? null,
        latitude: d.hospitals?.latitude ?? null,
        longitude: d.hospitals?.longitude ?? null,
      })),
      lat,
      lng,
    ).slice(0, 30);

    const hospitals = withDistance(((hospRes.data as any[]) ?? []), lat, lng).slice(0, 20);
    const labs = withDistance(((labRes.data as any[]) ?? []), lat, lng).slice(0, 20);

    if (!doctors.length && !hospitals.length && !labs.length) {
      return json({ error: "No providers are available to match right now." }, 200);
    }

    const prompt = `Patient symptoms: ${symptoms}
Care preferences:
- Preferred provider type: ${careType}
- Urgency: ${urgency}
- Budget limit (INR): ${budget ?? "no limit"}
- Maximum travel distance (km): ${maxDistance ?? "no limit"}
- Other notes: ${notes || "none"}

Available doctors (JSON): ${JSON.stringify(doctors)}
Available hospitals (JSON): ${JSON.stringify(hospitals)}
Available labs (JSON): ${JSON.stringify(labs)}

Choose at most 5 providers from the lists above that best fit the symptoms and preferences.
Respond with ONLY a JSON object, no markdown fence, in this exact shape:
{"assessment":"one or two plain-language sentences about the likely type of care needed","specialization":"most relevant medical specialization or empty string","emergency":true or false,"recommendations":[{"id":"provider id copied exactly from the lists","type":"doctor|hospital|lab","match_score":0-100,"reason":"one short sentence citing specialization, fee, rating or distance"}]}
Only use ids present in the lists. Never diagnose; describe likely care needs instead. Set emergency true for red-flag symptoms such as chest pain, stroke signs, heavy bleeding, or breathing difficulty.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      signal: req.signal,
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        input: [
          {
            role: "system",
            content:
              "You are Remedoo's care matching assistant for Jammu & Kashmir, India. You never diagnose. You match patients to the most suitable listed providers and always return valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok || !aiRes.body) {
      const status = aiRes.status;
      const detail = await aiRes.text().catch(() => "");
      console.error("AI gateway error:", status, detail);
      if (status === 429) return json({ error: "Too many requests right now. Please try again in a moment." }, 429);
      if (status === 402) return json({ error: "AI credits are exhausted. Please try again later." }, 402);
      if (status === 403) return json({ error: "AI access is not available for this request." }, 403);
      return json({ error: "The matching service is unavailable right now." }, 500);
    }

    // Consume the SSE stream and accumulate the text output.
    const reader = aiRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") text += evt.delta;
          if (evt.type === "error") console.error("AI stream error:", evt);
        } catch { /* ignore partial frames */ }
      }
    }

    const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: any = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) { try { parsed = JSON.parse(match[0]); } catch { /* noop */ } }
    }
    if (!parsed) {
      console.error("Unparseable AI output:", cleaned.slice(0, 500));
      return json({ error: "Could not read the matching result. Please try again." }, 500);
    }

    const byId: Record<string, any> = {};
    doctors.forEach((d: any) => (byId[`doctor:${d.id}`] = d));
    hospitals.forEach((h: any) => (byId[`hospital:${h.id}`] = h));
    labs.forEach((l: any) => (byId[`lab:${l.id}`] = l));

    const recommendations = (Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
      .map((r: any) => {
        const provider = byId[`${r.type}:${r.id}`];
        if (!provider) return null;
        return {
          id: r.id,
          type: r.type,
          match_score: Math.max(0, Math.min(100, Math.round(Number(r.match_score) || 0))),
          reason: String(r.reason ?? "").slice(0, 200),
          provider,
        };
      })
      .filter(Boolean)
      .slice(0, 5);

    return json({
      assessment: String(parsed.assessment ?? "").slice(0, 400),
      specialization: String(parsed.specialization ?? "").slice(0, 80),
      emergency: Boolean(parsed.emergency),
      recommendations,
    });
  } catch (error) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    console.error("ai-care-match failure:", error);
    return json({ error: "Something went wrong while matching. Please try again." }, 500);
  }
});
