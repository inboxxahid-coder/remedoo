import { useEffect, useState } from "react";
import ProviderEarningsView from "@/components/provider/ProviderEarningsView";
import { supabase } from "@/integrations/supabase/client";

export default function LabEarnings() {
  const [labId, setLabId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      const { data: lab } = await supabase.from("labs").select("id").eq("user_id", session.user.id).maybeSingle();
      if (lab) setLabId(lab.id);
    };
    load();
  }, []);

  return <ProviderEarningsView providerType="lab" providerId={labId} userId={userId} />;
}
