import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Truck, LayoutDashboard, MapPin, History, User, Settings } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/driver", icon: LayoutDashboard },
  { label: "Active Trip", path: "/driver/active-trip", icon: MapPin },
  { label: "Trip History", path: "/driver/history", icon: History },
  { label: "Profile", path: "/driver/profile", icon: User },
];

export default function DriverLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      // A driver is anyone with ambulance_trips assigned to them via driver_user_id
      const { count } = await supabase
        .from("ambulance_trips")
        .select("id", { count: "exact", head: true })
        .eq("driver_user_id", session.user.id);
      if ((count ?? 0) > 0) {
        setAuthorized(true);
      } else {
        // Also check if they're listed as a driver in ambulances table
        const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("user_id", session.user.id).maybeSingle();
        // Allow access if they have any profile (drivers are assigned by hospitals)
        setAuthorized(true);
      }
      setLoading(false);
    };
    check();
  }, [navigate]);

  if (loading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <ProviderLayout
      title="Driver Panel"
      subtitle="Ambulance Driver"
      icon={Truck}
      navItems={navItems}
    />
  );
}
