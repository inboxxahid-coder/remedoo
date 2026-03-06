import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Truck, MapPin, Clock, CheckCircle, AlertTriangle, Navigation } from "lucide-react";
import { toast } from "sonner";

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [assignedTrips, setAssignedTrips] = useState<any[]>([]);
  const [stats, setStats] = useState({ completed: 0, total: 0, totalEarnings: 0 });
  const [driverStatus, setDriverStatus] = useState<"available" | "on_trip" | "offline">("available");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      const { data: trips } = await supabase
        .from("ambulance_trips")
        .select("*")
        .eq("driver_user_id", session.user.id)
        .order("created_at", { ascending: false });

      const allTrips = trips || [];
      const active = allTrips.find(t => ["assigned", "en_route", "arrived", "in_progress"].includes(t.status));
      const assigned = allTrips.filter(t => t.status === "assigned");
      const completed = allTrips.filter(t => t.status === "completed");

      setActiveTrip(active || null);
      setAssignedTrips(assigned);
      setStats({
        completed: completed.length,
        total: allTrips.length,
        totalEarnings: completed.reduce((s, t) => s + Number(t.total_fare || 0), 0),
      });

      if (active) setDriverStatus("on_trip");
      setLoading(false);
    };
    load();
  }, []);

  // Realtime subscription for new trip assignments
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("driver-trips")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "ambulance_trips",
        filter: `driver_user_id=eq.${userId}`,
      }, (payload) => {
        const trip = payload.new as any;
        if (payload.eventType === "INSERT" && trip.status === "assigned") {
          toast.info("New trip assigned!", { description: "Check your dashboard." });
          setAssignedTrips(prev => [trip, ...prev]);
        }
        if (["en_route", "arrived", "in_progress"].includes(trip.status)) {
          setActiveTrip(trip);
        }
        if (trip.status === "completed" || trip.status === "cancelled") {
          setActiveTrip(null);
          setAssignedTrips(prev => prev.filter(t => t.id !== trip.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const acceptTrip = async (tripId: string) => {
    const { error } = await supabase.from("ambulance_trips").update({ status: "en_route" }).eq("id", tripId);
    if (!error) {
      toast.success("Trip accepted! Navigation started.");
      setDriverStatus("on_trip");
      const trip = assignedTrips.find(t => t.id === tripId);
      if (trip) setActiveTrip({ ...trip, status: "en_route" });
      setAssignedTrips(prev => prev.filter(t => t.id !== tripId));
      navigate("/driver/active-trip");
    }
  };

  const rejectTrip = async (tripId: string) => {
    await supabase.from("ambulance_trips").update({ status: "cancelled" }).eq("id", tripId);
    setAssignedTrips(prev => prev.filter(t => t.id !== tripId));
    toast.info("Trip rejected");
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Truck className="w-6 h-6 text-primary" /> Driver Dashboard
      </h1>

      {/* Status Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Your Status</p>
            <p className="text-xs text-muted-foreground">Hospitals can see your availability</p>
          </div>
          <div className="flex gap-2">
            {(["available", "on_trip", "offline"] as const).map(s => (
              <Badge
                key={s}
                variant={driverStatus === s ? "default" : "outline"}
                className={`cursor-pointer capitalize ${driverStatus === s ? "" : "opacity-60"}`}
                onClick={() => !activeTrip && setDriverStatus(s)}
              >
                {s.replace("_", " ")}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <CheckCircle className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{stats.completed}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </Card>
        <Card className="p-4 text-center">
          <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Trips</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-foreground">₹{stats.totalEarnings.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Earnings</p>
        </Card>
      </div>

      {/* Active Trip */}
      {activeTrip && (
        <Card className="p-4 border-2 border-primary">
          <div className="flex items-center gap-2 mb-3">
            <Navigation className="w-5 h-5 text-primary animate-pulse" />
            <h2 className="font-bold text-foreground">Active Trip</h2>
            <Badge variant="secondary" className="capitalize">{activeTrip.status.replace("_", " ")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">Trip #{activeTrip.id.slice(0, 8)}</p>
          {activeTrip.distance_km && <p className="text-xs text-muted-foreground">Distance: {activeTrip.distance_km} km • Fare: ₹{activeTrip.total_fare || 0}</p>}
          <Button className="w-full mt-3" onClick={() => navigate("/driver/active-trip")}>
            <MapPin className="w-4 h-4 mr-1" /> Open Tracking
          </Button>
        </Card>
      )}

      {/* Assigned Trips (pending acceptance) */}
      {assignedTrips.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" /> New Trip Requests
          </h2>
          <div className="space-y-3">
            {assignedTrips.map(trip => (
              <Card key={trip.id} className="p-4 border-2 border-warning/50">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Trip #{trip.id.slice(0, 8)}</span>
                    <Badge variant="secondary">New</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {trip.distance_km ? `${trip.distance_km} km` : "Distance TBD"} • ₹{trip.total_fare || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(trip.created_at).toLocaleString()}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="flex-1" onClick={() => acceptTrip(trip.id)}>Accept</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => rejectTrip(trip.id)}>Reject</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!activeTrip && assignedTrips.length === 0 && (
        <Card className="p-12 text-center">
          <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No active trips. Waiting for assignments...</p>
        </Card>
      )}
    </div>
  );
}
