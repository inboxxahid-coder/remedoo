import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { User, Phone, Mail } from "lucide-react";

export default function DriverProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle();
      setProfile(data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <User className="w-5 h-5 text-primary" /> Driver Profile
      </h1>
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{profile?.full_name || "Driver"}</p>
            <p className="text-sm text-muted-foreground">Ambulance Driver</p>
          </div>
        </div>
        {profile?.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" /> {profile.email}
          </div>
        )}
        {profile?.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" /> {profile.phone}
          </div>
        )}
      </Card>
    </div>
  );
}
