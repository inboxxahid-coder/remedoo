import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/exportCsv";
import { logAuditAction } from "@/lib/auditLog";
import { Route, IndianRupee, Download, Filter, Clock, Truck, MapPin, Navigation } from "lucide-react";
import AmbulanceMap from "@/components/patient/AmbulanceMap";

export default function HospitalAmbulanceTrips() {
  const [hospital, setHospital] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [liveLocations, setLiveLocations] = useState<Record<string, { lat: number; lng: number }>>({});

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: hosp } = await supabase.from("hospitals").select("id, latitude, longitude").eq("user_id", session.user.id).maybeSingle();
      if (!hosp) { setLoading(false); return; }
      setHospital(hosp);

      const { data } = await supabase.from("ambulance_trips").select("*").eq("hospital_id", hosp.id).order("created_at", { ascending: false });
      setTrips(data || []);

      // Fetch latest locations for active trips
      const activeTrips = (data || []).filter(t => ["en_route", "arrived", "in_progress"].includes(t.status));
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

  // Realtime driver location updates
  useEffect(() => {
    if (!hospital) return;
    const channel = supabase
      .channel("hospital-driver-tracking")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "driver_locations" }, (payload) => {
        const loc = payload.new as any;
        setLiveLocations(prev => ({ ...prev, [loc.trip_id]: { lat: loc.latitude, lng: loc.longitude } }));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ambulance_trips" }, (payload) => {
        const updated = payload.new as any;
        if (updated.hospital_id === hospital.id) {
          setTrips(prev => prev.map(t => t.id === updated.id ? updated : t));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hospital?.id]);

  const activeTrips = trips.filter(t => ["assigned", "en_route", "arrived", "in_progress"].includes(t.status));
  const filtered = trips.filter(t => {
    const d = t.created_at.split("T")[0];
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchDate = (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
    return matchStatus && matchDate;
  });

  const totalTrips = filtered.length;
  const freeTrips = filtered.filter(t => t.is_free).length;
  const paidTrips = totalTrips - freeTrips;
  const totalRevenue = filtered.filter(t => !t.is_free).reduce((s, t) => s + Number(t.total_fare || 0), 0);
  const avgResponseTime = filtered.filter(t => t.response_time_minutes).length > 0
    ? Math.round(filtered.filter(t => t.response_time_minutes).reduce((s, t) => s + Number(t.response_time_minutes), 0) / filtered.filter(t => t.response_time_minutes).length)
    : 0;

  const handleExport = () => {
    exportToCsv("ambulance_trips", filtered.map(t => ({
      Date: new Date(t.created_at).toLocaleDateString(),
      Status: t.status, Driver: t.driver_name || "", Distance: `${t.distance_km} km`,
      Fare: t.is_free ? "FREE" : `₹${t.total_fare}`, Payment: t.payment_status,
      ResponseTime: t.response_time_minutes ? `${t.response_time_minutes} min` : "—",
    })));
    logAuditAction({ action: "export_ambulance_trips", entityType: "ambulance_trips" });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": return "default";
      case "assigned": case "en_route": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Route className="w-6 h-6 text-primary" /> Ambulance Trips & Revenue
        </h1>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-1" /> Export
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <Truck className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{totalTrips}</p>
          <p className="text-xs text-muted-foreground">Total Trips</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-[hsl(152,55%,40%)]">{freeTrips}</p>
          <p className="text-xs text-muted-foreground">Free Trips</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-[hsl(30,80%,50%)]">{paidTrips}</p>
          <p className="text-xs text-muted-foreground">Paid Trips</p>
        </Card>
        <Card className="p-4 text-center">
          <IndianRupee className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Revenue</p>
        </Card>
        <Card className="p-4 text-center">
          <Clock className="w-5 h-5 text-[hsl(205,65%,45%)] mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{avgResponseTime} min</p>
          <p className="text-xs text-muted-foreground">Avg Response</p>
        </Card>
      </div>

      <Tabs defaultValue={activeTrips.length > 0 ? "live" : "all"}>
        <TabsList>
          {activeTrips.length > 0 && <TabsTrigger value="live">🔴 Live ({activeTrips.length})</TabsTrigger>}
          <TabsTrigger value="all">All Trips ({trips.length})</TabsTrigger>
        </TabsList>

        {/* Live Tracking Tab */}
        {activeTrips.length > 0 && (
          <TabsContent value="live" className="space-y-4 mt-4">
            {activeTrips.map(trip => {
              const loc = liveLocations[trip.id];
              return (
                <Card key={trip.id} className="p-4 border-2 border-primary/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-primary animate-pulse" />
                      <span className="font-bold text-foreground">Trip #{trip.id.slice(0, 8)}</span>
                      <Badge variant="secondary" className="capitalize">{trip.status.replace("_", " ")}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Driver: {trip.driver_name || "—"} {trip.driver_phone ? `(${trip.driver_phone})` : ""} •
                    {trip.distance_km ? ` ${trip.distance_km} km` : ""} • ₹{trip.total_fare || 0}
                  </p>
                  {loc && hospital?.latitude && (
                    <AmbulanceMap
                      userLat={hospital.latitude}
                      userLng={hospital.longitude}
                      ambulanceLat={loc.lat}
                      ambulanceLng={loc.lng}
                      ambulanceInfo={`🚑 ${trip.driver_name || "Driver"}`}
                    />
                  )}
                </Card>
              );
            })}
          </TabsContent>
        )}

        {/* All Trips Tab */}
        <TabsContent value="all" className="space-y-4 mt-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3"><Filter className="w-4 h-4 text-muted-foreground" /><p className="text-sm font-medium text-foreground">Filters</p></div>
            <div className="flex flex-wrap gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="en_route">En Route</SelectItem>
                  <SelectItem value="arrived">Arrived</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" className="w-[150px]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <Input type="date" className="w-[150px]" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              {(dateFrom || dateTo || statusFilter !== "all") && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilter("all"); }}>Clear</Button>
              )}
            </div>
          </Card>

          {filtered.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No ambulance trips recorded yet</p></Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(trip => (
                <Card key={trip.id} className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Trip #{trip.id.slice(0, 8)}</span>
                        <Badge variant={statusColor(trip.status)}>{trip.status.replace("_", " ")}</Badge>
                        {trip.is_free && <Badge variant="outline" className="text-[hsl(152,55%,40%)] border-[hsl(152,55%,40%)]">FREE</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(trip.created_at).toLocaleString()}
                        {trip.driver_name && ` · Driver: ${trip.driver_name}`}
                        {trip.distance_km > 0 && ` · ${trip.distance_km} km`}
                      </p>
                      {trip.response_time_minutes && (
                        <p className="text-xs text-muted-foreground">Response: {trip.response_time_minutes} min</p>
                      )}
                    </div>
                    <div className="text-right">
                      {trip.is_free ? (
                        <p className="font-semibold text-[hsl(152,55%,40%)]">Free Service</p>
                      ) : (
                        <>
                          <p className="font-semibold text-primary">₹{Number(trip.total_fare).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{trip.payment_status}</p>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
