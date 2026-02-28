import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Ambulance, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EmergencyRequest {
  id: string;
  patient_id: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  assigned_ambulance_id: string | null;
  response_time_minutes: number | null;
  created_at: string;
  updated_at: string;
}

interface AmbulanceInfo {
  id: string;
  vehicle_number: string;
  driver_name: string | null;
  driver_phone: string | null;
  status: string;
}

export default function AdminEmergencies() {
  const [emergencies, setEmergencies] = useState<EmergencyRequest[]>([]);
  const [ambulances, setAmbulances] = useState<Record<string, AmbulanceInfo>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const [emergRes, ambRes] = await Promise.all([
      supabase.from("emergency_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("ambulances").select("*"),
    ]);
    setEmergencies((emergRes.data || []) as EmergencyRequest[]);
    const ambMap: Record<string, AmbulanceInfo> = {};
    (ambRes.data || []).forEach((a: any) => { ambMap[a.id] = a; });
    setAmbulances(ambMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel("admin-emergencies")
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_requests" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "ambulances" }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Pending</Badge>;
      case "dispatched": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Dispatched</Badge>;
      case "en_route": return <Badge className="bg-violet-500/10 text-violet-600 border-violet-200">En Route</Badge>;
      case "resolved": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Resolved</Badge>;
      case "cancelled": return <Badge className="bg-red-500/10 text-red-600 border-red-200">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const active = emergencies.filter(e => !["resolved", "cancelled"].includes(e.status));
  const past = emergencies.filter(e => ["resolved", "cancelled"].includes(e.status));

  const renderCard = (e: EmergencyRequest) => {
    const amb = e.assigned_ambulance_id ? ambulances[e.assigned_ambulance_id] : null;
    const isActive = !["resolved", "cancelled"].includes(e.status);

    return (
      <div key={e.id} className={`rounded-xl border p-4 space-y-3 ${isActive ? "bg-red-500/5 border-red-200/50" : "bg-card border-border"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${isActive ? "text-red-500" : "text-muted-foreground"}`} />
            <div>
              <p className="text-sm font-medium text-foreground">Emergency #{e.id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
            </div>
          </div>
          {statusBadge(e.status)}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {e.latitude && e.longitude && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs">{e.latitude.toFixed(4)}, {e.longitude.toFixed(4)}</span>
            </div>
          )}
          {e.response_time_minutes != null && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">{e.response_time_minutes} min response</span>
            </div>
          )}
        </div>

        {amb && (
          <div className="bg-background rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Ambulance className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Assigned Ambulance</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Vehicle: {amb.vehicle_number}</p>
              {amb.driver_name && <p>Driver: {amb.driver_name}</p>}
              {amb.driver_phone && <p>Phone: {amb.driver_phone}</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold text-foreground mb-5">Emergency Monitoring</h1>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : emergencies.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No emergency requests found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Active Emergencies ({active.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {active.map(renderCard)}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Past Emergencies ({past.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {past.map(renderCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
