import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Ambulance, Truck, User, MapPin, Clock, Activity } from "lucide-react";

export default function AdminAmbulance() {
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [ambRes, tripRes, emerRes] = await Promise.all([
        supabase.from("ambulances").select("*, hospitals(name)").order("created_at", { ascending: false }),
        supabase.from("ambulance_trips").select("*, hospitals(name)").order("created_at", { ascending: false }).limit(100),
        supabase.from("emergency_requests").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      setAmbulances(ambRes.data || []);
      setTrips(tripRes.data || []);
      setEmergencies(emerRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const statusColor = (s: string) => {
    const map: Record<string, string> = { available: "default", on_duty: "secondary", maintenance: "destructive", pending: "secondary", dispatched: "default", resolved: "default", completed: "default" };
    return (map[s] || "outline") as any;
  };

  const stats = {
    totalFleet: ambulances.length,
    available: ambulances.filter(a => a.status === "available").length,
    onDuty: ambulances.filter(a => a.status === "on_duty").length,
    totalTrips: trips.length,
    activeEmergencies: emergencies.filter(e => e.status === "pending" || e.status === "dispatched").length,
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Ambulance className="w-6 h-6 text-destructive" /> Ambulance Management</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Fleet", value: stats.totalFleet, icon: Truck },
          { label: "Available", value: stats.available, icon: Activity },
          { label: "On Duty", value: stats.onDuty, icon: MapPin },
          { label: "Total Trips", value: stats.totalTrips, icon: Clock },
          { label: "Active Emergencies", value: stats.activeEmergencies, icon: Ambulance },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <s.icon className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="fleet">
        <TabsList>
          <TabsTrigger value="fleet">Fleet ({ambulances.length})</TabsTrigger>
          <TabsTrigger value="trips">Trip Logs ({trips.length})</TabsTrigger>
          <TabsTrigger value="emergencies">Emergency Requests ({emergencies.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="space-y-3 mt-4">
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="on_duty">On Duty</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {ambulances.filter(a => statusFilter === "all" || a.status === statusFilter).map(a => (
            <Card key={a.id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{a.vehicle_number}</span>
                    <Badge variant={statusColor(a.status)} className="capitalize">{a.status.replace("_", " ")}</Badge>
                    <Badge variant="outline">{a.vehicle_type || "BLS"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Hospital: {(a.hospitals as any)?.name || "—"} • Driver: {a.driver_name || "Unassigned"} {a.driver_phone ? `(${a.driver_phone})` : ""}
                  </p>
                </div>
              </div>
            </Card>
          ))}
          {ambulances.length === 0 && <Card className="p-12 text-center"><p className="text-muted-foreground">No ambulances registered</p></Card>}
        </TabsContent>

        <TabsContent value="trips" className="space-y-3 mt-4">
          {trips.map(t => (
            <Card key={t.id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Trip #{t.id.slice(0, 8)}</span>
                    <Badge variant={statusColor(t.status)} className="capitalize">{t.status}</Badge>
                    {t.is_free && <Badge variant="secondary">Free</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hospital: {(t.hospitals as any)?.name || "—"} • Driver: {t.driver_name || "—"} • 
                    {t.distance_km ? ` ${t.distance_km}km` : ""} • Total: ₹{t.total_fare || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                </div>
              </div>
            </Card>
          ))}
          {trips.length === 0 && <Card className="p-12 text-center"><p className="text-muted-foreground">No trips recorded</p></Card>}
        </TabsContent>

        <TabsContent value="emergencies" className="space-y-3 mt-4">
          {emergencies.map(e => (
            <Card key={e.id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Emergency #{e.id.slice(0, 8)}</span>
                    <Badge variant={statusColor(e.status)} className="capitalize">{e.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {e.latitude && e.longitude ? `📍 ${e.latitude.toFixed(4)}, ${e.longitude.toFixed(4)}` : "No location"}
                    {e.response_time_minutes ? ` • Response: ${e.response_time_minutes}min` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                </div>
              </div>
            </Card>
          ))}
          {emergencies.length === 0 && <Card className="p-12 text-center"><p className="text-muted-foreground">No emergency requests</p></Card>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
