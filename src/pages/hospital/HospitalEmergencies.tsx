import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { Siren, AlertTriangle, CheckCircle, Clock, Ambulance, MapPin } from "lucide-react";

export default function HospitalEmergencies() {
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [emerRes, ambRes] = await Promise.all([
      supabase.from("emergency_requests").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("ambulances").select("*"),
    ]);
    setEmergencies(emerRes.data || []);
    setAmbulances(ambRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = supabase.channel("hospital-emergencies")
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_requests" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ambulances" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const markResolved = async (id: string) => {
    const em = emergencies.find(e => e.id === id);
    const respTime = em ? Math.floor((Date.now() - new Date(em.created_at).getTime()) / 60000) : null;
    const { error } = await supabase.from("emergency_requests").update({ status: "resolved", response_time_minutes: respTime }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Emergency marked as resolved");
    logAuditAction({ action: "resolve_emergency", entityType: "emergency", entityId: id });
    load();
  };

  const reassignAmbulance = async (emergencyId: string, ambulanceId: string) => {
    const { error } = await supabase.from("emergency_requests").update({ assigned_ambulance_id: ambulanceId, status: "dispatched" }).eq("id", emergencyId);
    if (error) { toast.error(error.message); return; }
    await supabase.from("ambulances").update({ status: "dispatched", assigned_patient_id: emergencyId }).eq("id", ambulanceId);
    toast.success("Ambulance reassigned");
    logAuditAction({ action: "reassign_ambulance", entityType: "emergency", entityId: emergencyId, details: { ambulanceId } });
    load();
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case "pending": return <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />;
      case "dispatched": return <Clock className="w-4 h-4 text-amber-500" />;
      case "resolved": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default: return <Siren className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const active = emergencies.filter(e => e.status !== "resolved");
  const resolved = emergencies.filter(e => e.status === "resolved");
  const availableAmbulances = ambulances.filter(a => a.status === "available");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Siren className="w-6 h-6 text-destructive" /> Emergency Control
        </h1>
        <Badge variant={active.length > 0 ? "destructive" : "secondary"}>{active.length} active</Badge>
      </div>

      {/* Ambulance Status */}
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Ambulance className="w-4 h-4" /> Ambulance Fleet
        </h3>
        {ambulances.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ambulances registered</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ambulances.map(a => (
              <div key={a.id} className="p-3 rounded-lg border border-border">
                <p className="text-sm font-medium text-foreground">{a.vehicle_number}</p>
                <p className="text-xs text-muted-foreground">{a.driver_name || "No driver"}</p>
                <Badge variant={a.status === "available" ? "default" : "secondary"} className="mt-1 text-xs">{a.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Active Emergencies */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-destructive uppercase tracking-wider">Active Cases</h2>
          {active.map(e => (
            <Card key={e.id} className="p-4 border-destructive/30 bg-destructive/5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {statusIcon(e.status)}
                    <span className="font-semibold text-foreground">Emergency #{e.id.slice(0, 8)}</span>
                    <Badge variant="outline">{e.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Created: {new Date(e.created_at).toLocaleString()}</p>
                  {e.latitude && e.longitude && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {e.latitude.toFixed(4)}, {e.longitude.toFixed(4)}
                    </p>
                  )}
                  {e.assigned_ambulance_id && (
                    <p className="text-xs text-muted-foreground">
                      Ambulance: {ambulances.find(a => a.id === e.assigned_ambulance_id)?.vehicle_number || "Unknown"}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="destructive" onClick={() => markResolved(e.id)}>Mark Resolved</Button>
                  {availableAmbulances.length > 0 && (
                    <select
                      className="text-xs border rounded-md p-1 bg-background text-foreground"
                      onChange={(ev) => { if (ev.target.value) reassignAmbulance(e.id, ev.target.value); }}
                      defaultValue=""
                    >
                      <option value="" disabled>Assign Ambulance</option>
                      {availableAmbulances.map(a => (
                        <option key={a.id} value={a.id}>{a.vehicle_number} — {a.driver_name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Resolved ({resolved.length})</h2>
          {resolved.slice(0, 15).map(e => (
            <Card key={e.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {statusIcon(e.status)}
                    <span className="text-sm font-medium text-foreground">Emergency #{e.id.slice(0, 8)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                    {e.response_time_minutes && ` · Response: ${e.response_time_minutes} min`}
                  </p>
                </div>
                <Badge variant="secondary">Resolved</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {emergencies.length === 0 && (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No emergency cases</p></Card>
      )}
    </div>
  );
}
