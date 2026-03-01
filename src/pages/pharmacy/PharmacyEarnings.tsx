import { useEffect, useState } from "react";
import ProviderEarningsView from "@/components/provider/ProviderEarningsView";
import { supabase } from "@/integrations/supabase/client";

export default function PharmacyEarnings() {
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      const { data: pharmacy } = await supabase.from("pharmacies").select("id").eq("user_id", session.user.id).maybeSingle();
      if (pharmacy) setPharmacyId(pharmacy.id);
    };
    load();
  }, []);

  return <ProviderEarningsView providerType="pharmacy" providerId={pharmacyId} userId={userId} />;
}
