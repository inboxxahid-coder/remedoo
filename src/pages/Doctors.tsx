import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Search, Heart, MapPin, Phone, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useGeolocation, sortByDistance, formatDistance } from "@/hooks/useGeolocation";

const Doctors = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<(Tables<"doctors"> & { hospital_name?: string; hospital_latitude?: number | null; hospital_longitude?: number | null })[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const { location } = useGeolocation();

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data: doctorsRes } = await supabase.from("doctors").select("*, hospitals(name, latitude, longitude)");
        if (doctorsRes) {
          setDoctors(doctorsRes.map((d: any) => ({
            ...d,
            hospital_name: d.hospitals?.name,
            latitude: d.hospitals?.latitude ?? null,
            longitude: d.hospitals?.longitude ?? null,
          })));
        }
      } catch (e) { console.error("Failed to fetch doctors:", e); }
      setLoading(false);
    };
    fetchDoctors();

    const loadFavorites = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUserId(session.user.id);
          const { data: favsRes } = await supabase.from("favorites").select("provider_id").eq("user_id", session.user.id).eq("provider_type", "doctor");
          if (favsRes) setFavorites(new Set(favsRes.map((f) => f.provider_id)));
        }
      } catch (e) { console.error("Failed to load favorites:", e); }
    };
    loadFavorites();
  }, []);

  const toggleFavorite = async (doctorId: string) => {
    if (!userId) { toast.error("Please sign in to add favorites"); navigate("/login"); return; }
    if (favorites.has(doctorId)) {
      await supabase.from("favorites").delete().eq("user_id", userId).eq("provider_id", doctorId).eq("provider_type", "doctor");
      setFavorites((prev) => { const n = new Set(prev); n.delete(doctorId); return n; });
      toast.success("Removed from favorites");
    } else {
      await supabase.from("favorites").insert({ user_id: userId, provider_id: doctorId, provider_type: "doctor" });
      setFavorites((prev) => new Set(prev).add(doctorId));
      toast.success("Added to favorites");
    }
  };

  const filtered = useMemo(() => {
    const searched = doctors.filter((d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.specialization?.toLowerCase().includes(search.toLowerCase()))
    );
    if (location) {
      return sortByDistance(searched, location.latitude, location.longitude);
    }
    return searched;
  }, [doctors, search, location]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground">Doctors</h1>
          {location && (
            <span className="ml-auto flex items-center gap-1 text-xs text-primary-foreground/70">
              <Navigation className="w-3 h-3" />Nearby
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or specialization..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-0 shadow-lg h-11 rounded-xl" />
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No doctors found</div>
        ) : (
          filtered.map((doc: any) => (
            <div key={doc.id} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center text-3xl flex-shrink-0">👨‍⚕️</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground truncate">{doc.name}</h3>
                      <p className="text-sm text-primary font-medium">{doc.specialization}</p>
                    </div>
                    <button onClick={() => toggleFavorite(doc.id)}>
                      <Heart className={`w-5 h-5 ${favorites.has(doc.id) ? "fill-emergency text-emergency" : "text-muted-foreground"}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                      <span className="text-xs font-medium">{doc.rating}</span>
                    </div>
                    {doc.hospital_name && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{doc.hospital_name}
                      </span>
                    )}
                    {doc.distance_km != null && (
                      <span className="text-xs text-primary font-medium flex items-center gap-0.5">
                        <Navigation className="w-3 h-3" />{formatDistance(doc.distance_km)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-semibold text-primary">₹{doc.consultation_fee}</span>
                    <Button size="sm" className="h-8 rounded-lg gradient-primary text-primary-foreground text-xs" onClick={() => navigate(`/book/doctor/${doc.id}`)}>
                      Book Now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Doctors;
