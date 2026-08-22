import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, MapPin, Navigation, AlertTriangle, Star, Clock, Truck, IndianRupee, User, CheckCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AmbulanceMap from "@/components/patient/LazyAmbulanceMap";
import { getDistanceKm } from "@/hooks/useGeolocation";
import { getProviderPricingConfig, calculateAmbulancePrice } from "@/lib/ambulancePricing";
import { Badge } from "@/components/ui/badge";
import { useServiceToggle } from "@/hooks/useServiceToggle";
import ServiceDisabledBanner from "@/components/ServiceDisabledBanner";

const EMERGENCY_NUMBER = "112";

const TRIP_STAGES = [
  { key: "assigned", label: "Driver Assigned" },
  { key: "en_route", label: "Ambulance On the Way" },
  { key: "arrived", label: "Driver Arrived" },
  { key: "in_progress", label: "Transport Started" },
  { key: "completed", label: "Trip Completed" },
];

const Emergency = () => {
  const navigate = useNavigate();
  const { services } = useServiceToggle();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [assignedAmbulance, setAssignedAmbulance] = useState<any>(null);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [driverLiveLocation, setDriverLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pricingMap, setPricingMap] = useState<Record<string, { total: number; breakdown: string; nightCharge: number } | null>>({});

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }

    supabase.from("hospitals").select("id, name, location, image_url, rating, beds, available_beds, icu_available, is_government, latitude, longitude, phone, emergency_contact").order("rating", { ascending: false }).then(({ data }) => {
      if (data) setHospitals(data);
      setLoading(false);
    });

    const checkActive = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check active emergency request
      const { data } = await supabase
        .from("emergency_requests")
        .select("*")
        .eq("patient_id", session.user.id)
        .in("status", ["pending", "dispatched", "en_route"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setActiveRequest(data[0]);
        if (data[0].assigned_ambulance_id) {
          const { data: amb } = await supabase.from("ambulances").select("*").eq("id", data[0].assigned_ambulance_id).single();
          if (amb) setAssignedAmbulance(amb);
        }
      }

      // Check active ambulance trip for this patient
      const { data: tripData } = await supabase
        .from("ambulance_trips")
        .select("*")
        .eq("patient_id", session.user.id)
        .in("status", ["assigned", "en_route", "arrived", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (tripData && tripData.length > 0) {
        setActiveTrip(tripData[0]);
        // Get latest driver location
        const { data: locData } = await supabase
          .from("driver_locations")
          .select("latitude, longitude")
          .eq("trip_id", tripData[0].id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (locData && locData.length > 0) {
          setDriverLiveLocation({ lat: locData[0].latitude, lng: locData[0].longitude });
        }
      }
    };
    checkActive();
  }, []);

  // Realtime: listen for driver location updates + trip status changes
  useEffect(() => {
    if (!activeTrip) return;

    const channel = supabase
      .channel(`patient-tracking-${activeTrip.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "driver_locations",
        filter: `trip_id=eq.${activeTrip.id}`,
      }, (payload) => {
        const loc = payload.new as any;
        setDriverLiveLocation({ lat: loc.latitude, lng: loc.longitude });
        // Also update ambulance marker
        setAssignedAmbulance((prev: any) => prev ? { ...prev, current_latitude: loc.latitude, current_longitude: loc.longitude } : prev);
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "ambulance_trips",
        filter: `id=eq.${activeTrip.id}`,
      }, (payload) => {
        const updated = payload.new as any;
        setActiveTrip(updated);
        if (updated.status === "completed" || updated.status === "cancelled") {
          toast.info(updated.status === "completed" ? "Trip completed!" : "Trip cancelled");
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeTrip?.id]);

  // Also listen for emergency request updates
  useEffect(() => {
    const channel = supabase
      .channel("emergency-tracking-main")
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_requests" }, (payload) => {
        const updated = payload.new as any;
        if (activeRequest && updated.id === activeRequest.id) setActiveRequest(updated);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ambulances" }, (payload) => {
        const updated = payload.new as any;
        if (assignedAmbulance && updated.id === assignedAmbulance.id) setAssignedAmbulance(updated);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeRequest?.id, assignedAmbulance?.id]);

  // Pricing
  useEffect(() => {
    if (!userLocation || hospitals.length === 0) return;
    const fetchPricing = async () => {
      const map: Record<string, any> = {};
      for (const h of hospitals) {
        if (!h.latitude || !h.longitude) { map[h.id] = null; continue; }
        const dist = getDistanceKm(userLocation.lat, userLocation.lng, h.latitude, h.longitude);
        const { config, ranges } = await getProviderPricingConfig("hospital", h.id);
        if (!config || !config.service_enabled || config.service_type === "free") {
          map[h.id] = config?.service_enabled ? { total: 0, breakdown: "Free service", nightCharge: 0 } : null;
        } else {
          map[h.id] = calculateAmbulancePrice(config, dist, ranges);
        }
      }
      setPricingMap(map);
    };
    fetchPricing();
  }, [userLocation, hospitals]);

  const getDistance = (lat?: number | null, lng?: number | null) => {
    if (!userLocation || !lat || !lng) return null;
    return getDistanceKm(userLocation.lat, userLocation.lng, lat, lng).toFixed(1);
  };

  const driverDistanceToPatient = userLocation && driverLiveLocation
    ? getDistanceKm(userLocation.lat, userLocation.lng, driverLiveLocation.lat, driverLiveLocation.lng).toFixed(1)
    : null;

  const estimatedArrivalMinutes = driverDistanceToPatient
    ? Math.max(1, Math.round(parseFloat(driverDistanceToPatient) * 2.5))
    : null;

  const sortedHospitals = [...hospitals].sort((a, b) => {
    const distA = getDistance(a.latitude, a.longitude);
    const distB = getDistance(b.latitude, b.longitude);
    if (distA && distB) return parseFloat(distA) - parseFloat(distB);
    if (distA) return -1;
    if (distB) return 1;
    return 0;
  });

  const handleSOS = async () => {
    setSosActive(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase.from("emergency_requests").insert({
        patient_id: session.user.id,
        latitude: userLocation?.lat || null,
        longitude: userLocation?.lng || null,
        status: "pending",
      }).select().single();
      if (!error && data) {
        setActiveRequest(data);
        toast.success("Emergency request sent! Help is on the way.");
      }
    }
    window.location.href = `tel:${EMERGENCY_NUMBER}`;
    setTimeout(() => setSosActive(false), 3000);
  };

  const cancelRequest = async () => {
    if (activeRequest) {
      await supabase.from("emergency_requests").update({ status: "cancelled" }).eq("id", activeRequest.id);
    }
    if (activeTrip && ["assigned", "en_route"].includes(activeTrip.status)) {
      await supabase.from("ambulance_trips").update({ status: "cancelled" }).eq("id", activeTrip.id);
    }
    setActiveRequest(null);
    setAssignedAmbulance(null);
    setActiveTrip(null);
    setDriverLiveLocation(null);
    toast.info("Emergency request cancelled");
  };

  const currentStageIndex = activeTrip ? TRIP_STAGES.findIndex(s => s.key === activeTrip.status) : -1;

  if (!services.service_ambulance_enabled) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <ServiceDisabledBanner serviceName="Ambulance Services" />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="gradient-emergency page-header px-5 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-emergency-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-emergency-foreground">Emergency SOS</h1>
        </div>
        <p className="text-emergency-foreground/70 text-sm">Tap the SOS button to call emergency services immediately</p>
      </div>

      <div className="px-5 mt-4 space-y-5">
        {/* ===== LIVE TRACKING SECTION ===== */}
        {activeTrip && !["completed", "cancelled"].includes(activeTrip.status) && (
          <div className="bg-card rounded-2xl border-2 border-primary p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary animate-pulse" />
              <h2 className="font-bold text-foreground">🚑 Live Ambulance Tracking</h2>
            </div>

            {/* Trip Stage Progress */}
            <div className="flex items-center gap-1">
              {TRIP_STAGES.slice(0, -1).map((stage, i) => {
                const isPast = i < currentStageIndex;
                const isCurrent = i === currentStageIndex;
                return (
                  <div key={stage.key} className="flex items-center flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isPast ? "bg-primary text-primary-foreground" :
                      isCurrent ? "bg-primary/20 text-primary ring-2 ring-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {isPast ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    {i < TRIP_STAGES.length - 2 && (
                      <div className={`flex-1 h-0.5 mx-1 ${isPast ? "bg-primary" : "bg-muted"}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-sm font-semibold text-primary text-center">
              {TRIP_STAGES[currentStageIndex]?.label || activeTrip.status}
            </p>

            {/* Driver info */}
            <div className="bg-accent rounded-xl p-3 space-y-2">
              {activeTrip.driver_name && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{activeTrip.driver_name}</span>
                </div>
              )}
              {activeTrip.driver_phone && (
                <button onClick={() => window.location.href = `tel:${activeTrip.driver_phone}`} className="flex items-center gap-2 text-sm text-primary font-medium">
                  <Phone className="w-4 h-4" /> Call Driver: {activeTrip.driver_phone}
                </button>
              )}
              {assignedAmbulance && (
                <p className="text-xs text-muted-foreground">🚑 {assignedAmbulance.vehicle_number} • {assignedAmbulance.vehicle_type || "BLS"}</p>
              )}
            </div>

            {/* Distance & ETA */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <Navigation className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{driverDistanceToPatient || "—"} km</p>
                <p className="text-[10px] text-muted-foreground">Distance</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{estimatedArrivalMinutes || "—"} min</p>
                <p className="text-[10px] text-muted-foreground">Est. Arrival</p>
              </div>
            </div>

            {/* Live Map */}
            {userLocation && (driverLiveLocation || (assignedAmbulance?.current_latitude)) && (
              <div>
                <p className="text-xs font-medium text-foreground mb-2">📍 Live Location</p>
                <AmbulanceMap
                  userLat={userLocation.lat}
                  userLng={userLocation.lng}
                  ambulanceLat={driverLiveLocation?.lat || assignedAmbulance?.current_latitude}
                  ambulanceLng={driverLiveLocation?.lng || assignedAmbulance?.current_longitude}
                  ambulanceInfo={`🚑 ${assignedAmbulance?.vehicle_number || ""} — ${activeTrip.driver_name || "Driver"}`}
                />
              </div>
            )}

            {/* Cancel */}
            {["assigned", "en_route"].includes(activeTrip.status) && (
              <button onClick={cancelRequest} className="w-full py-2 rounded-xl border border-destructive text-destructive text-sm font-medium">
                Cancel Ambulance Request
              </button>
            )}
          </div>
        )}

        {/* Legacy active request (no trip yet) */}
        {activeRequest && !activeTrip && activeRequest.status !== "cancelled" && activeRequest.status !== "completed" && (
          <div className="bg-card rounded-2xl border-2 border-emergency p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emergency animate-pulse" />
              <h2 className="font-bold text-foreground">Active Emergency</h2>
            </div>
            <div className="text-sm font-semibold text-warning">
              Finding ambulance...
            </div>
            {assignedAmbulance && (
              <div className="bg-accent rounded-xl p-3 space-y-1">
                <p className="text-sm font-medium text-foreground">🚑 {assignedAmbulance.vehicle_number}</p>
                {assignedAmbulance.driver_name && <p className="text-xs text-muted-foreground">Driver: {assignedAmbulance.driver_name}</p>}
                {assignedAmbulance.driver_phone && (
                  <button onClick={() => window.location.href = `tel:${assignedAmbulance.driver_phone}`} className="text-xs text-primary font-medium">
                    📞 Call Driver
                  </button>
                )}
              </div>
            )}
            {userLocation && assignedAmbulance?.current_latitude && (
              <AmbulanceMap
                userLat={userLocation.lat}
                userLng={userLocation.lng}
                ambulanceLat={assignedAmbulance.current_latitude}
                ambulanceLng={assignedAmbulance.current_longitude}
                ambulanceInfo={`🚑 ${assignedAmbulance.vehicle_number}`}
              />
            )}
            <button onClick={cancelRequest} className="w-full py-2 rounded-xl border border-destructive text-destructive text-sm font-medium">
              Cancel Emergency Request
            </button>
          </div>
        )}

        {/* SOS Button */}
        <div className="flex flex-col items-center py-6">
          <button onClick={handleSOS} className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-2xl transition-transform active:scale-95 ${sosActive ? "bg-emergency/80 scale-105" : "bg-emergency hover:bg-emergency/90"}`}>
            <span className="absolute inset-0 rounded-full bg-emergency/30 animate-ping" />
            <span className="absolute inset-[-8px] rounded-full border-4 border-emergency/20 animate-pulse" />
            <AlertTriangle className="w-12 h-12 text-emergency-foreground mb-1" />
            <span className="text-2xl font-extrabold text-emergency-foreground">SOS</span>
            <span className="text-xs text-emergency-foreground/80 font-medium">Tap to Call</span>
          </button>
          <p className="text-muted-foreground text-xs mt-4 text-center">Calls {EMERGENCY_NUMBER} · Your location will be shared if available</p>
        </div>

        {/* Quick Emergency Contacts */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Phone className="w-5 h-5 text-emergency" /> Quick Contacts</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Ambulance", number: "108", emoji: "🚑" },
              { label: "Women Helpline", number: "1091", emoji: "👩" },
              { label: "Police", number: "100", emoji: "🚔" },
              { label: "Fire Dept", number: "101", emoji: "🚒" },
              { label: "Child Helpline", number: "1098", emoji: "👶" },
              { label: "Disaster Mgmt", number: "1078", emoji: "🌊" },
            ].map((contact) => (
              <button key={contact.label} onClick={() => (window.location.href = `tel:${contact.number}`)} className="bg-card rounded-2xl border border-border p-3 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
                <span className="text-2xl">{contact.emoji}</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{contact.label}</p>
                  <p className="text-xs text-muted-foreground">{contact.number}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Nearby Hospitals */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Nearby Hospitals</h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading hospitals...</div>
          ) : sortedHospitals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hospitals found</div>
          ) : (
            <div className="space-y-3">
              {sortedHospitals.map((hospital) => {
                const dist = getDistance(hospital.latitude, hospital.longitude);
                const pricing = pricingMap[hospital.id];
                return (
                  <div key={hospital.id} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{hospital.name}</h3>
                        {hospital.location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {hospital.location}</p>}
                      </div>
                      {hospital.icu_available && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">ICU</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      {hospital.rating > 0 && <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-warning text-warning" />{hospital.rating}</span>}
                      {dist && <span className="flex items-center gap-0.5"><Navigation className="w-3 h-3" />{dist} km</span>}
                      {hospital.beds != null && hospital.beds > 0 && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{hospital.beds} beds</span>}
                    </div>
                    {pricing !== undefined && (
                      <div className="bg-accent/50 rounded-xl p-2.5 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" /> Estimated ambulance cost
                          </span>
                          {pricing === null ? (
                            <Badge variant="outline" className="text-xs">No ambulance</Badge>
                          ) : pricing.total === 0 ? (
                            <Badge variant="default" className="text-xs bg-success text-success-foreground">Free</Badge>
                          ) : (
                            <span className="text-sm font-bold text-foreground">₹{pricing.total}</span>
                          )}
                        </div>
                        {pricing && pricing.nightCharge > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1">Includes ₹{pricing.nightCharge} night charge</p>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      {hospital.phone && <button onClick={() => window.location.href = `tel:${hospital.phone}`} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emergency text-emergency-foreground text-xs font-semibold"><Phone className="w-3.5 h-3.5" /> Call</button>}
                      {hospital.latitude && hospital.longitude && <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`, "_blank")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"><Navigation className="w-3.5 h-3.5" /> Directions</button>}
                      <button onClick={() => navigate(`/book/hospital/${hospital.id}`)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-foreground text-xs font-medium">Book</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Emergency;
