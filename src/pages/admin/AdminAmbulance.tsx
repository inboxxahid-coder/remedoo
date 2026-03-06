import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Ambulance, Truck, MapPin, Clock, Activity, IndianRupee, BarChart3, Navigation } from "lucide-react";
import AmbulanceMap from "@/components/patient/AmbulanceMap";

export default function AdminAmbulance() {
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [hospitalConfigs, setHospitalConfigs] = useState<any[]>([]);
  const [labConfigs, setLabConfigs] = useState<any[]>([]);
  const [hospitalRanges, setHospitalRanges] = useState<any[]>([]);
  const [labRanges, setLabRanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [liveLocations, setLiveLocations] = useState<Record<string, { lat: number; lng: number }>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [ambRes, tripRes, emerRes, hCfgRes, lCfgRes, rangesRes] = await Promise.all([
        supabase.from("ambulances").select("*, hospitals(name)").order("created_at", { ascending: false }),
        supabase.from("ambulance_trips").select("*, hospitals(name)").order("created_at", { ascending: false }).limit(200),
        supabase.from("emergency_requests").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("hospital_ambulance_config").select("*, hospitals(name)"),
        supabase.from("lab_ambulance_config" as any).select("*, labs(name)"),
        supabase.from("ambulance_distance_ranges" as any).select("*, hospitals(name), labs(name)").order("sort_order", { ascending: true }),
      ]);
      setAmbulances(ambRes.data || []);
      setTrips(tripRes.data || []);
      setEmergencies(emerRes.data || []);
      setHospitalConfigs(hCfgRes.data || []);
      setLabConfigs((lCfgRes.data as any[]) || []);
      const allRanges = (rangesRes.data as any[]) || [];
      setHospitalRanges(allRanges.filter((r: any) => r.hospital_id));
      setLabRanges(allRanges.filter((r: any) => r.lab_id));

      // Load live locations for active trips
      const activeTrips = (tripRes.data || []).filter((t: any) => ["en_route", "arrived", "in_progress"].includes(t.status));
      const locMap: Record<string, { lat: number; lng: number }> = {};
      for (const t of activeTrips) {
        const { data: loc } = await supabase
          .from("driver_locations")
          .select("latitude, longitude")
          .eq("trip_id", t.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (loc && loc.length > 0) locMap[t.id] = { lat: loc[0].latitude, lng: loc[0].longitude };
      }
      setLiveLocations(locMap);
      setLoading(false);
    };
    load();
  }, []);

  // Realtime for live locations
  useEffect(() => {
    const channel = supabase
      .channel("admin-driver-tracking")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "driver_locations" }, (payload) => {
        const loc = payload.new as any;
        setLiveLocations(prev => ({ ...prev, [loc.trip_id]: { lat: loc.latitude, lng: loc.longitude } }));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ambulance_trips" }, (payload) => {
        const updated = payload.new as any;
        setTrips(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const statusColor = (s: string) => {
    const map: Record<string, string> = { available: "default", on_duty: "secondary", maintenance: "destructive", pending: "secondary", dispatched: "default", resolved: "default", completed: "default" };
    return (map[s] || "outline") as any;
  };

  const completedTrips = trips.filter(t => t.status === "completed");
  const activeTrips = trips.filter(t => ["assigned", "en_route", "arrived", "in_progress"].includes(t.status));
  const totalRevenue = completedTrips.reduce((s, t) => s + (t.total_fare || 0), 0);
  const avgResponse = completedTrips.filter(t => t.response_time_minutes).reduce((s, t, _, a) => s + (t.response_time_minutes || 0) / a.length, 0);

  const stats = {
    totalFleet: ambulances.length,
    available: ambulances.filter(a => a.status === "available").length,
    onDuty: ambulances.filter(a => a.status === "on_duty").length,
    totalTrips: trips.length,
    activeEmergencies: emergencies.filter(e => e.status === "pending" || e.status === "dispatched").length,
    completedTrips: completedTrips.length,
    activeTrips: activeTrips.length,
    totalRevenue,
    avgResponse: avgResponse ? avgResponse.toFixed(1) : "—",
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Ambulance className="w-6 h-6 text-destructive" /> Ambulance Management</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Fleet", value: stats.totalFleet, icon: Truck },
          { label: "Available", value: stats.available, icon: Activity },
          { label: "Active Trips", value: stats.activeTrips, icon: Navigation },
          { label: "Active Emergencies", value: stats.activeEmergencies, icon: Ambulance },
          { label: "Total Trips", value: stats.totalTrips, icon: Clock },
          { label: "Completed Trips", value: stats.completedTrips, icon: BarChart3 },
          { label: "Total Revenue", value: `₹${stats.totalRevenue}`, icon: IndianRupee },
          { label: "Avg Response", value: `${stats.avgResponse} min`, icon: Clock },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <s.icon className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue={activeTrips.length > 0 ? "live" : "fleet"}>
        <TabsList className="flex-wrap">
          {activeTrips.length > 0 && <TabsTrigger value="live">🔴 Live Tracking ({activeTrips.length})</TabsTrigger>}
          <TabsTrigger value="fleet">Fleet ({ambulances.length})</TabsTrigger>
          <TabsTrigger value="trips">Trip Logs ({trips.length})</TabsTrigger>
          <TabsTrigger value="emergencies">Emergencies ({emergencies.length})</TabsTrigger>
          <TabsTrigger value="hospital_pricing">Hospital Pricing</TabsTrigger>
          <TabsTrigger value="lab_pricing">Lab Pricing</TabsTrigger>
        </TabsList>

        {/* Live Tracking Tab */}
        {activeTrips.length > 0 && (
          <TabsContent value="live" className="space-y-4 mt-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary animate-pulse" /> Active Ambulance Trips
            </h3>
            {activeTrips.map(trip => {
              const loc = liveLocations[trip.id];
              return (
                <Card key={trip.id} className="p-4 border-2 border-primary/30 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">Trip #{trip.id.slice(0, 8)}</span>
                      <Badge variant="secondary" className="capitalize">{trip.status.replace("_", " ")}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{(trip.hospitals as any)?.name || "—"}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Driver: {trip.driver_name || "—"} {trip.driver_phone ? `(${trip.driver_phone})` : ""} •
                    {trip.distance_km ? ` ${trip.distance_km} km` : ""} • ₹{trip.total_fare || 0}
                  </p>
                  {loc && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">📍 {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</p>
                      <AmbulanceMap
                        userLat={loc.lat}
                        userLng={loc.lng}
                        ambulanceLat={loc.lat}
                        ambulanceLng={loc.lng}
                        ambulanceInfo={`🚑 ${trip.driver_name || "Driver"}`}
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </TabsContent>
        )}

        {/* Fleet Tab */}
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
                    <span className="font-bold text-foreground">{a.vehicle_number}</span>
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

        {/* Trips Tab */}
        <TabsContent value="trips" className="space-y-3 mt-4">
          {trips.map(t => (
            <Card key={t.id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">Trip #{t.id.slice(0, 8)}</span>
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

        {/* Emergencies Tab */}
        <TabsContent value="emergencies" className="space-y-3 mt-4">
          {emergencies.map(e => (
            <Card key={e.id} className="p-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">Emergency #{e.id.slice(0, 8)}</span>
                <Badge variant={statusColor(e.status)} className="capitalize">{e.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {e.latitude && e.longitude ? `📍 ${e.latitude.toFixed(4)}, ${e.longitude.toFixed(4)}` : "No location"}
                {e.response_time_minutes ? ` • Response: ${e.response_time_minutes}min` : ""}
              </p>
              <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
            </Card>
          ))}
          {emergencies.length === 0 && <Card className="p-12 text-center"><p className="text-muted-foreground">No emergency requests</p></Card>}
        </TabsContent>

        {/* Hospital Pricing Tab */}
        <TabsContent value="hospital_pricing" className="space-y-4 mt-4">
          <h3 className="font-semibold text-foreground">Hospital Ambulance Pricing Configurations</h3>
          {hospitalConfigs.length === 0 ? (
            <Card className="p-8 text-center"><p className="text-muted-foreground">No hospital ambulance configs found</p></Card>
          ) : hospitalConfigs.map((c: any) => (
            <Card key={c.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{(c.hospitals as any)?.name || "Unknown"}</span>
                <div className="flex gap-2">
                  <Badge variant={c.service_enabled ? "default" : "outline"}>{c.service_enabled ? "Enabled" : "Disabled"}</Badge>
                  <Badge variant="secondary" className="capitalize">{c.pricing_model || "per_km"}</Badge>
                </div>
              </div>
              <div className="text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-2">
                <span>Type: {c.service_type}</span>
                {c.pricing_model === "flat" && <span>Flat: ₹{c.flat_price}</span>}
                {c.pricing_model === "per_km" && <><span>Base: ₹{c.base_fare}</span><span>Per KM: ₹{c.per_km_charge}</span></>}
                {c.night_charge_enabled && <span>Night: ₹{c.night_charge_amount} ({c.night_charge_start}-{c.night_charge_end})</span>}
              </div>
              {c.pricing_model === "distance_range" && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-foreground mb-1">Distance Ranges:</p>
                  {hospitalRanges.filter(r => r.hospital_id === c.hospital_id).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No ranges defined</p>
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Min KM</TableHead><TableHead>Max KM</TableHead><TableHead>Price</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {hospitalRanges.filter(r => r.hospital_id === c.hospital_id).map(r => (
                          <TableRow key={r.id}><TableCell>{r.min_km}</TableCell><TableCell>{r.max_km}</TableCell><TableCell>₹{r.price}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* Lab Pricing Tab */}
        <TabsContent value="lab_pricing" className="space-y-4 mt-4">
          <h3 className="font-semibold text-foreground">Lab Ambulance Pricing Configurations</h3>
          {labConfigs.length === 0 ? (
            <Card className="p-8 text-center"><p className="text-muted-foreground">No lab ambulance configs found</p></Card>
          ) : labConfigs.map((c: any) => (
            <Card key={c.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{(c.labs as any)?.name || "Unknown"}</span>
                <div className="flex gap-2">
                  <Badge variant={c.service_enabled ? "default" : "outline"}>{c.service_enabled ? "Enabled" : "Disabled"}</Badge>
                  <Badge variant="secondary" className="capitalize">{c.pricing_model || "per_km"}</Badge>
                </div>
              </div>
              <div className="text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-2">
                <span>Type: {c.service_type}</span>
                {c.pricing_model === "flat" && <span>Flat: ₹{c.flat_price}</span>}
                {c.pricing_model === "per_km" && <><span>Base: ₹{c.base_fare}</span><span>Per KM: ₹{c.per_km_charge}</span></>}
                {c.night_charge_enabled && <span>Night: ₹{c.night_charge_amount} ({c.night_charge_start}-{c.night_charge_end})</span>}
              </div>
              {c.pricing_model === "distance_range" && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-foreground mb-1">Distance Ranges:</p>
                  {labRanges.filter(r => r.lab_id === c.lab_id).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No ranges defined</p>
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Min KM</TableHead><TableHead>Max KM</TableHead><TableHead>Price</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {labRanges.filter(r => r.lab_id === c.lab_id).map(r => (
                          <TableRow key={r.id}><TableCell>{r.min_km}</TableCell><TableCell>{r.max_km}</TableCell><TableCell>₹{r.price}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
