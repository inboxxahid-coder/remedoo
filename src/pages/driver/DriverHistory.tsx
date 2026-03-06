import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { History, Truck } from "lucide-react";

export default function DriverHistory() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("ambulance_trips")
        .select("*")
        .eq("driver_user_id", session.user.id)
        .order("created_at", { ascending: false });
      setTrips(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <History className="w-5 h-5 text-primary" /> Trip History
      </h1>
      {trips.length === 0 ? (
        <Card className="p-12 text-center">
          <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No trips yet</p>
        </Card>
      ) : (
        trips.map(t => (
          <Card key={t.id} className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-foreground text-sm">#{t.id.slice(0, 8)}</span>
              <Badge variant={t.status === "completed" ? "default" : t.status === "cancelled" ? "destructive" : "secondary"} className="capitalize">
                {t.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(t.created_at).toLocaleDateString()} • {t.distance_km ? `${t.distance_km} km` : ""} • {t.is_free ? "Free" : `₹${t.total_fare || 0}`}
            </p>
            {t.completed_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Completed: {new Date(t.completed_at).toLocaleString()}
              </p>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
