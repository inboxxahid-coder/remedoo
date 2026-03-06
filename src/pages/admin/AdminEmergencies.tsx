import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Ambulance, Clock, MapPin, BarChart3, Activity, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  hospital_id: string | null;
}

export default function AdminEmergencies() {
  const [emergencies, setEmergencies] = useState<EmergencyRequest[]>([]);
  const [ambulances, setAmbulances] = useState<Record<string, AmbulanceInfo>>({});
  const [hospitals, setHospitals] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const [emergRes, ambRes, hospRes] = await Promise.all([
      supabase.from("emergency_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("ambulances").select("*"),
      supabase.from("hospitals").select("id, name"),
    ]);
    setEmergencies((emergRes.data || []) as EmergencyRequest[]);
    const ambMap: Record<string, AmbulanceInfo> = {};
    (ambRes.data || []).forEach((a: any) => { ambMap[a.id] = a; });
    setAmbulances(ambMap);
    const hospMap: Record<string, string> = {};
    (hospRes.data || []).forEach((h: any) => { hospMap[h.id] = h.name; });
    setHospitals(hospMap);
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

  // Stats
  const total = emergencies.length;
  const resolved = emergencies.filter(e => e.status === "resolved");
  const pending = emergencies.filter(e => e.status === "pending");
  const dispatched = emergencies.filter(e => e.status === "dispatched" || e.status === "en_route");
  const cancelled = emergencies.filter(e => e.status === "cancelled");
  const withResponse = emergencies.filter(e => e.response_time_minutes != null && e.response_time_minutes > 0);
  const avgResponse = withResponse.length > 0 ? (withResponse.reduce((s, e) => s + (e.response_time_minutes || 0), 0) / withResponse.length) : 0;
  const missedOrSlow = emergencies.filter(e => e.status === "resolved" && (e.response_time_minutes == null || e.response_time_minutes > 15));

  // Hospital performance
  const hospitalPerf: Record<string, { total: number; avgResponse: number; responses: number[] }> = {};
  emergencies.forEach(e => {
    if (!e.assigned_ambulance_id) return;
    const amb = ambulances[e.assigned_ambulance_id];
    if (!amb?.hospital_id) return;
    const hid = amb.hospital_id;
    if (!hospitalPerf[hid]) hospitalPerf[hid] = { total: 0, avgResponse: 0, responses: [] };
    hospitalPerf[hid].total++;
    if (e.response_time_minutes) hospitalPerf[hid].responses.push(e.response_time_minutes);
  });
  Object.keys(hospitalPerf).forEach(hid => {
    const r = hospitalPerf[hid].responses;
    hospitalPerf[hid].avgResponse = r.length > 0 ? r.reduce((a, b) => a + b, 0) / r.length : 0;
  });

  const active = emergencies.filter(e => !["resolved", "cancelled"].includes(e.status));
  const past = emergencies.filter(e => ["resolved", "cancelled"].includes(e.status));

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

  const renderCard = (e: EmergencyRequest) => {
    const amb = e.assigned_ambulance_id ? ambulances[e.assigned_ambulance_id] : null;
    const isActive = !["resolved", "cancelled"].includes(e.status);
    return (
      <div key={e.id} className={`rounded-xl border p-4 space-y-3 ${isActive ? "bg-destructive/5 border-destructive/30" : "bg-card border-border"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${isActive ? "text-destructive" : "text-muted-foreground"}`} />
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
              {amb.hospital_id && <p>Hospital: {hospitals[amb.hospital_id] || "—"}</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-foreground mb-2">Emergency System Monitoring</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Requests", value: total, icon: AlertTriangle },
          { label: "Active Now", value: active.length, icon: Activity },
          { label: "Avg Response", value: avgResponse ? `${avgResponse.toFixed(1)} min` : "—", icon: Clock },
          { label: "Resolved", value: resolved.length, icon: BarChart3 },
          { label: "Pending", value: pending.length, icon: Clock },
          { label: "Dispatched", value: dispatched.length, icon: Ambulance },
          { label: "Cancelled", value: cancelled.length, icon: AlertTriangle },
          { label: "Slow/Missed", value: missedOrSlow.length, icon: TrendingDown },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <s.icon className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          <TabsTrigger value="performance">Hospital Performance</TabsTrigger>
          <TabsTrigger value="delayed">Delayed Responses ({missedOrSlow.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {active.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No active emergencies</p></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{active.map(renderCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {past.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No past emergencies</p></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{past.map(renderCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">Hospital response performance based on assigned ambulances.</p>
          {Object.keys(hospitalPerf).length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No hospital data available</p></Card>
          ) : (
            Object.entries(hospitalPerf)
              .sort((a, b) => b[1].avgResponse - a[1].avgResponse)
              .map(([hid, data]) => (
                <Card key={hid} className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{hospitals[hid] || "Unknown Hospital"}</p>
                      <p className="text-xs text-muted-foreground">{data.total} emergencies handled</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${data.avgResponse > 15 ? "text-destructive" : data.avgResponse > 10 ? "text-warning" : "text-emerald-600"}`}>
                        {data.avgResponse > 0 ? `${data.avgResponse.toFixed(1)} min` : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Response Time</p>
                    </div>
                  </div>
                  {data.avgResponse > 15 && (
                    <Badge className="mt-2 bg-destructive/10 text-destructive border-destructive/30">⚠️ Poor response time — investigate</Badge>
                  )}
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="delayed" className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">Emergencies where response took &gt;15 minutes or was not recorded.</p>
          {missedOrSlow.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No delayed responses</p></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{missedOrSlow.map(renderCard)}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
