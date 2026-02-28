import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, MapPin, Navigation, AlertTriangle, Star, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const EMERGENCY_NUMBER = "112";

const Emergency = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState<Tables<"hospitals">[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sosActive, setSosActive] = useState(false);

  useEffect(() => {
    // Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // silently fail
      );
    }

    // Load hospitals
    supabase
      .from("hospitals")
      .select("*")
      .order("rating", { ascending: false })
      .then(({ data }) => {
        if (data) setHospitals(data);
        setLoading(false);
      });
  }, []);

  const getDistance = (lat?: number | null, lng?: number | null) => {
    if (!userLocation || !lat || !lng) return null;
    const R = 6371;
    const dLat = ((lat - userLocation.lat) * Math.PI) / 180;
    const dLon = ((lng - userLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const sortedHospitals = [...hospitals].sort((a, b) => {
    const distA = getDistance(a.latitude, a.longitude);
    const distB = getDistance(b.latitude, b.longitude);
    if (distA && distB) return parseFloat(distA) - parseFloat(distB);
    if (distA) return -1;
    if (distB) return 1;
    return 0;
  });

  const handleSOS = () => {
    setSosActive(true);
    window.location.href = `tel:${EMERGENCY_NUMBER}`;
    setTimeout(() => setSosActive(false), 3000);
  };

  const callHospital = (phone: string | null) => {
    if (phone) window.location.href = `tel:${phone}`;
  };

  const openDirections = (lat?: number | null, lng?: number | null, name?: string) => {
    if (lat && lng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name || "")}`,
        "_blank"
      );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="gradient-emergency px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-emergency-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-emergency-foreground">Emergency SOS</h1>
        </div>
        <p className="text-emergency-foreground/70 text-sm">
          Tap the SOS button to call emergency services immediately
        </p>
      </div>

      <div className="px-5 mt-4 space-y-5">
        {/* SOS Button */}
        <div className="flex flex-col items-center py-6">
          <button
            onClick={handleSOS}
            className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-2xl transition-transform active:scale-95 ${
              sosActive
                ? "bg-emergency/80 scale-105"
                : "bg-emergency hover:bg-emergency/90"
            }`}
          >
            {/* Pulse rings */}
            <span className="absolute inset-0 rounded-full bg-emergency/30 animate-ping" />
            <span className="absolute inset-[-8px] rounded-full border-4 border-emergency/20 animate-pulse" />

            <AlertTriangle className="w-12 h-12 text-emergency-foreground mb-1" />
            <span className="text-2xl font-extrabold text-emergency-foreground">SOS</span>
            <span className="text-xs text-emergency-foreground/80 font-medium">Tap to Call</span>
          </button>
          <p className="text-muted-foreground text-xs mt-4 text-center">
            Calls {EMERGENCY_NUMBER} · Your location will be shared if available
          </p>
        </div>

        {/* Quick Emergency Contacts */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Phone className="w-5 h-5 text-emergency" />
            Quick Contacts
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Ambulance", number: "108", emoji: "🚑" },
              { label: "Women Helpline", number: "1091", emoji: "👩" },
              { label: "Police", number: "100", emoji: "🚔" },
              { label: "Fire Dept", number: "101", emoji: "🚒" },
            ].map((contact) => (
              <button
                key={contact.label}
                onClick={() => (window.location.href = `tel:${contact.number}`)}
                className="bg-card rounded-2xl border border-border p-3 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow"
              >
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
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Nearby Hospitals
          </h2>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading hospitals...</div>
          ) : sortedHospitals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hospitals found</div>
          ) : (
            <div className="space-y-3">
              {sortedHospitals.map((hospital) => {
                const dist = getDistance(hospital.latitude, hospital.longitude);
                return (
                  <div
                    key={hospital.id}
                    className="bg-card rounded-2xl border border-border p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{hospital.name}</h3>
                        {hospital.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {hospital.location}
                          </p>
                        )}
                      </div>
                      {hospital.icu_available && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">
                          ICU
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      {hospital.rating && (
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-warning text-warning" />
                          {hospital.rating}
                        </span>
                      )}
                      {dist && (
                        <span className="flex items-center gap-0.5">
                          <Navigation className="w-3 h-3" />
                          {dist} km away
                        </span>
                      )}
                      {hospital.beds != null && hospital.beds > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {hospital.beds} beds
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {hospital.phone && (
                        <button
                          onClick={() => callHospital(hospital.phone)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emergency text-emergency-foreground text-xs font-semibold"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call Now
                        </button>
                      )}
                      {hospital.latitude && hospital.longitude && (
                        <button
                          onClick={() => openDirections(hospital.latitude, hospital.longitude, hospital.name)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
                        >
                          <Navigation className="w-3.5 h-3.5" /> Directions
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/book/hospital/${hospital.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-foreground text-xs font-medium"
                      >
                        Book Visit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Emergency;
