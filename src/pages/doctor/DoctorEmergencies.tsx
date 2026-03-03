import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { AlertTriangle, CheckCircle, Clock, Ambulance } from "lucide-react";

export default function DoctorEmergencies() {
  const [loading, setLoading] = useState(true);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [doctor, setDoctor] = useState<any>(null);
  const [noteText, setNoteText] = useState<Record<string, string>>({});

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data: doc } = await supabase
      .from("doctors")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!doc) { setLoading(false); return; }
    setDoctor(doc);

    if (!doc.hospital_id) { setLoading(false); return; }

    const { data } = await supabase
      .from("emergency_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    setEmergencies(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Set up realtime
  useEffect(() => {
    const channel = supabase
      .channel("emergency-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_requests" }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const markAttended = async (id: string) => {
    const { error } = await supabase.from("emergency_requests").update({
      status: "resolved",
      response_time_minutes: Math.floor((Date.now() - new Date(emergencies.find(e => e.id === id)?.created_at).getTime()) / 60000),
    }).eq("id", id);

    if (error) { toast.error(error.message); return; }
    toast.success("Emergency marked as attended");
    logAuditAction({ action: "attend_emergency", entityType: "emergency", entityId: id });
    load();
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "pending": return <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />;
      case "dispatched": return <Clock className="w-4 h-4 text-amber-500" />;
      case "resolved": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default: return <Ambulance className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-48 h-8 rounded" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }

  if (!doctor?.hospital_id) {
    return (
      <div className="text-center py-12">
        <Ambulance className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Emergency alerts are only available for hospital-attached doctors</p>
      </div>
    );
  }

  if (!(doctor as any).emergency_available) {
    return (
      <div className="text-center py-12">
        <Ambulance className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Emergency availability is disabled. Enable it in Schedule settings.</p>
      </div>
    );
  }

  const active = emergencies.filter(e => e.status !== "resolved");
  const resolved = emergencies.filter(e => e.status === "resolved");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Ambulance className="w-6 h-6 text-destructive" /> Emergency Alerts
        </h1>
        <Badge variant={active.length > 0 ? "destructive" : "secondary"}>
          {active.length} active
        </Badge>
      </div>

      {/* Active Emergencies */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-destructive uppercase tracking-wider">Active</h2>
          {active.map(e => (
            <Card key={e.id} className="p-4 border-destructive/30 bg-destructive/5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {statusIcon(e.status)}
                    <span className="font-semibold text-foreground">Emergency #{e.id.slice(0, 8)}</span>
                    <Badge variant="outline">{e.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(e.created_at).toLocaleString()}
                  </p>
                  {e.latitude && e.longitude && (
                    <p className="text-xs text-muted-foreground">📍 {e.latitude.toFixed(4)}, {e.longitude.toFixed(4)}</p>
                  )}
                </div>
                <Button size="sm" variant="destructive" onClick={() => markAttended(e.id)}>
                  Mark Attended
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Resolved</h2>
          {resolved.slice(0, 10).map(e => (
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
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No emergency alerts</p>
        </Card>
      )}
    </div>
  );
}
