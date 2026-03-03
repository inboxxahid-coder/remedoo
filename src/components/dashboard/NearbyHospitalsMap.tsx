import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Building2, ChevronRight, Navigation } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation, getDistanceKm, formatDistance } from "@/hooks/useGeolocation";
import "leaflet/dist/leaflet.css";

const NearbyHospitalsMapInner = lazy(() => import("./NearbyHospitalsMapInner"));

interface NearbyHospital {
  id: string;
  name: string;
  location: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
}

const NearbyHospitalsMap = () => {
  const navigate = useNavigate();
  const { location } = useGeolocation();
  const [hospitals, setHospitals] = useState<NearbyHospital[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("hospitals_public")
        .select("id, name, location, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(10);

      if (!data || !location) return;

      const sorted = data
        .map((h) => ({
          ...h,
          latitude: h.latitude!,
          longitude: h.longitude!,
          distance_km: getDistanceKm(location.latitude, location.longitude, h.latitude!, h.longitude!),
        }))
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, 5);

      setHospitals(sorted);
    };
    if (location) fetchData();
  }, [location]);

  if (!location || hospitals.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.6 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" /> Nearby Hospitals
        </h2>
        <button
          onClick={() => navigate("/hospitals")}
          className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline"
        >
          View All <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden border border-border shadow-sm" style={{ height: 180 }}>
        <Suspense fallback={<div className="w-full h-full bg-muted animate-pulse" />}>
          <NearbyHospitalsMapInner
            userLat={location.latitude}
            userLng={location.longitude}
            hospitals={hospitals}
            formatDistance={formatDistance}
          />
        </Suspense>
      </div>

      {/* Compact list below map */}
      <div className="mt-2 space-y-1.5">
        {hospitals.slice(0, 3).map((h) => (
          <button
            key={h.id}
            onClick={() => navigate("/hospitals")}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-emergency/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-emergency" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{h.name}</p>
              <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                {h.location || "Hospital"}
              </p>
            </div>
            <span className="text-[10px] font-semibold text-primary flex-shrink-0">
              {formatDistance(h.distance_km)}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default NearbyHospitalsMap;
