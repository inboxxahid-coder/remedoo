import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PharmacyMode = "partner" | "remedoo";

export function usePharmacyMode() {
  const [mode, setMode] = useState<PharmacyMode>("partner");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "pharmacy_mode")
        .maybeSingle();
      if (data?.value === "remedoo") setMode("remedoo");
      else setMode("partner");
      setLoading(false);
    };
    fetch();
  }, []);

  return { mode, loading };
}
