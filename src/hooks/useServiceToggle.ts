import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SERVICE_KEYS = [
  "service_doctors_enabled",
  "service_labs_enabled",
  "service_pharmacy_enabled",
  "service_ambulance_enabled",
] as const;

type ServiceKey = typeof SERVICE_KEYS[number];

export function useServiceToggle() {
  const [services, setServices] = useState<Record<ServiceKey, boolean>>({
    service_doctors_enabled: true,
    service_labs_enabled: true,
    service_pharmacy_enabled: true,
    service_ambulance_enabled: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", [...SERVICE_KEYS]);
      if (data) {
        const updated = { ...services };
        data.forEach((s) => {
          if (SERVICE_KEYS.includes(s.key as ServiceKey)) {
            updated[s.key as ServiceKey] = s.value === "true";
          }
        });
        setServices(updated);
      }
      setLoading(false);
    };
    load();
  }, []);

  return { services, loading };
}
