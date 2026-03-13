import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const formData = await req.formData();
    const userId = formData.get("user_id") as string;
    const providerType = formData.get("provider_type") as string;
    const providerDataJson = formData.get("provider_data") as string;

    if (!userId || !providerType || !providerDataJson) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const providerData = JSON.parse(providerDataJson);

    const tableMap: Record<string, string> = {
      doctor: "doctors",
      hospital: "hospitals",
      lab: "labs",
      pharmacy: "pharmacies",
    };
    const roleMap: Record<string, string> = {
      doctor: "doctor",
      hospital: "hospital_admin",
      lab: "lab_admin",
      pharmacy: "pharmacy_admin",
    };

    if (!tableMap[providerType]) {
      return new Response(
        JSON.stringify({ error: "Invalid provider type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload files using service role (bypasses RLS)
    const fileFields = ["license", "gst", "certificate", "photo"];
    const uploadedUrls: Record<string, string> = {};

    for (const field of fileFields) {
      const file = formData.get(`file_${field}`) as File | null;
      if (file && file.size > 0) {
        const ext = file.name.split(".").pop();
        const path = `${userId}/${field}_${Date.now()}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();
        const { error } = await supabaseAdmin.storage
          .from("certificates")
          .upload(path, arrayBuffer, {
            contentType: file.type,
            upsert: false,
          });
        if (!error) {
          if (field === "license") uploadedUrls["license_url"] = path;
          else if (field === "gst") uploadedUrls["gst_url"] = path;
          else if (field === "certificate") uploadedUrls["certificate_url"] = path;
          else if (field === "photo") uploadedUrls["image_url"] = path;
        } else {
          console.error(`Upload error (${field}):`, error);
          if (field === "license") {
            return new Response(
              JSON.stringify({ error: "Failed to upload license document" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }

    // Upload additional docs
    const additionalUrls: string[] = [];
    for (let i = 0; i < 3; i++) {
      const file = formData.get(`file_additional_${i}`) as File | null;
      if (file && file.size > 0) {
        const ext = file.name.split(".").pop();
        const path = `${userId}/doc_${i}_${Date.now()}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();
        const { error } = await supabaseAdmin.storage
          .from("certificates")
          .upload(path, arrayBuffer, {
            contentType: file.type,
            upsert: false,
          });
        if (!error) additionalUrls.push(path);
      }
    }

    // Build the provider record
    const record: Record<string, any> = {
      ...providerData,
      user_id: userId,
      approval_status: "pending",
      ...uploadedUrls,
    };
    if (additionalUrls.length > 0) {
      record.additional_docs_urls = additionalUrls;
    }

    // Insert provider record using service role
    const { error: providerError } = await supabaseAdmin
      .from(tableMap[providerType])
      .insert(record);

    if (providerError) {
      console.error("Provider insert error:", providerError);
      return new Response(
        JSON.stringify({ error: "Failed to create provider profile: " + providerError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign role using service role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: roleMap[providerType] });

    if (roleError) {
      console.error("Role insert error:", roleError);
      // Non-fatal — provider record is created
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("register-provider error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
