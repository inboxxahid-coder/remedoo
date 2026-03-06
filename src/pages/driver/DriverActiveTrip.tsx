import { useEffect, useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Navigation, Phone, MapPin, CheckCircle, Truck, Clock } from "lucide-react";
import { toast } from "sonner";
import AmbulanceMap from "@/components/patient/AmbulanceMap";

const TRIP_STAGES = [
  { key: "en_route", label: "En Route to Patient", next: "arrived", btnLabel: "Arrived at Pickup" },
  { key: "arrived", label: "Arrived at Pickup", next: "in_progress", btnLabel: "Start Transport" },
  { key: "in_progress", label: "Transporting Patient", next: "completed", btnLabel: "Complete Trip" },
];

export default function DriverActiveTrip() {
  const [userId, setUserId] = useState<string | null>(null);
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [updating, setUpdating] = useState(false);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      const { data } = await supabase
        .from("ambulance_trips")
        .select("*")
        .eq("driver_user_id", session.user.id)
        .in("status", ["assigned", "en_route", "arrived", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setTrip(data);
      setLoading(false);
    };
    load();
  }, []);

  // GPS tracking - send location every 8 seconds during active trip
  const sendLocation = useCallback(async () => {
    if (!trip || !userId) return;
    if (!["en_route", "arrived", "in_progress"].includes(trip.status)) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentLocation({ lat, lng });

        // Insert location update
        await supabase.from("driver_locations").insert({
          trip_id: trip.id,
          driver_user_id: userId,
          latitude: lat,
          longitude: lng,
        });

        // Also update ambulance position
        if (trip.ambulance_id) {
          await supabase.from("ambulances").update({
            current_latitude: lat,
            current_longitude: lng,
          }).eq("id", trip.ambulance_id);
        }
      },
      (err) => console.warn("GPS error:", err),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [trip, userId]);

  useEffect(() => {
    if (!trip || trip.status === "completed" || trip.status === "cancelled") {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
      return;
    }

    // Get initial location
    sendLocation();

    // Send every 8 seconds
    locationIntervalRef.current = setInterval(sendLocation, 8000);

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, [trip?.id, trip?.status, sendLocation]);

  const updateTripStatus = async (nextStatus: string) => {
    if (!trip) return;
    setUpdating(true);

    const updates: any = { status: nextStatus };
    if (nextStatus === "arrived") updates.reached_at = new Date().toISOString();
    if (nextStatus === "in_progress") updates.started_at = new Date().toISOString();
    if (nextStatus === "completed") updates.completed_at = new Date().toISOString();

    const { error } = await supabase.from("ambulance_trips").update(updates).eq("id", trip.id);
    if (!error) {
      setTrip({ ...trip, ...updates });
      toast.success(`Trip status: ${nextStatus.replace("_", " ")}`);
      if (nextStatus === "completed") {
        // Stop tracking
        if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      }
    }
    setUpdating(false);
  };

  const currentStage = TRIP_STAGES.find(s => s.key === trip?.status);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  if (!trip) {
    return (
      <Card className="p-12 text-center">
        <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">No active trip</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Navigation className="w-5 h-5 text-primary animate-pulse" /> Active Trip
      </h1>

      {/* Trip Stage Progress */}
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          {TRIP_STAGES.map((stage, i) => {
            const isPast = TRIP_STAGES.findIndex(s => s.key === trip.status) > i;
            const isCurrent = stage.key === trip.status;
            return (
              <div key={stage.key} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isPast ? "bg-primary text-primary-foreground" :
                  isCurrent ? "bg-primary/20 text-primary ring-2 ring-primary" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {isPast ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] hidden md:block ${isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {stage.label}
                </span>
                {i < TRIP_STAGES.length - 1 && <div className={`flex-1 h-0.5 ${isPast ? "bg-primary" : "bg-muted"}`} />}
              </div>
            );
          })}
        </div>

        <div className="text-center mb-3">
          <Badge variant="default" className="text-sm capitalize">{trip.status.replace("_", " ")}</Badge>
        </div>

        {/* Trip Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Trip ID</p>
            <p className="font-mono text-foreground">#{trip.id.slice(0, 8)}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Distance</p>
            <p className="font-semibold text-foreground">{trip.distance_km || "—"} km</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Fare</p>
            <p className="font-semibold text-foreground">{trip.is_free ? "Free" : `₹${trip.total_fare || 0}`}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Started</p>
            <p className="text-foreground">{trip.started_at ? new Date(trip.started_at).toLocaleTimeString() : "—"}</p>
          </div>
        </div>
      </Card>

      {/* Map */}
      {currentLocation && (
        <Card className="p-3">
          <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-primary" /> Your Location (Live)
          </p>
          <AmbulanceMap
            userLat={currentLocation.lat}
            userLng={currentLocation.lng}
            ambulanceLat={currentLocation.lat}
            ambulanceLng={currentLocation.lng}
            ambulanceInfo="You are here"
          />
          <p className="text-[10px] text-muted-foreground mt-1 text-center">
            GPS updating every 8 seconds • {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
          </p>
        </Card>
      )}

      {/* Action Button */}
      {currentStage && trip.status !== "completed" && (
        <Button
          className="w-full h-14 text-lg font-bold"
          onClick={() => updateTripStatus(currentStage.next)}
          disabled={updating}
        >
          {updating ? (
            <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              {currentStage.btnLabel}
            </>
          )}
        </Button>
      )}

      {trip.status === "completed" && (
        <Card className="p-6 text-center bg-primary/5 border-primary/20">
          <CheckCircle className="w-10 h-10 text-primary mx-auto mb-2" />
          <p className="font-bold text-foreground">Trip Completed</p>
          <p className="text-sm text-muted-foreground mt-1">
            {trip.is_free ? "Free service" : `Fare: ₹${trip.total_fare}`}
          </p>
        </Card>
      )}
    </div>
  );
}
