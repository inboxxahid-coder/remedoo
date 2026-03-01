import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type ProviderRole = "doctor" | "hospital_admin" | "lab_admin" | "pharmacy_admin";

export function useProviderAuth(expectedRole: ProviderRole) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login", { replace: true });
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", expectedRole)
        .maybeSingle();

      if (!roleData) {
        navigate("/login", { replace: true });
        return;
      }

      // Get linked provider record
      let providerRecord: { id: string } | null = null;
      if (expectedRole === "doctor") {
        const { data } = await supabase.from("doctors").select("id").eq("user_id", session.user.id).maybeSingle();
        providerRecord = data;
      } else if (expectedRole === "hospital_admin") {
        const { data } = await supabase.from("hospitals").select("id").eq("user_id", session.user.id).maybeSingle();
        providerRecord = data;
      } else if (expectedRole === "lab_admin") {
        const { data } = await supabase.from("labs").select("id").eq("user_id", session.user.id).maybeSingle();
        providerRecord = data;
      } else if (expectedRole === "pharmacy_admin") {
        const { data } = await supabase.from("pharmacies").select("id").eq("user_id", session.user.id).maybeSingle();
        providerRecord = data;
      }

      setProviderId(providerRecord?.id ?? null);
      setIsAuthorized(true);
      setLoading(false);
    };
    check();
  }, [navigate, expectedRole]);

  return { loading, isAuthorized, providerId };
}
