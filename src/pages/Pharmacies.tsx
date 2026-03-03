import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Search, Heart, MapPin, Clock, ShoppingBag, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useGeolocation, sortByDistance, formatDistance } from "@/hooks/useGeolocation";
import MedicalLoader from "@/components/ui/MedicalLoader";

const Pharmacies = () => {
  const navigate = useNavigate();
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [medicineCounts, setMedicineCounts] = useState<Record<string, number>>({});
  const { location } = useGeolocation();

  useEffect(() => {
    const fetchPharmacies = async () => {
      try {
        const [pRes, mRes] = await Promise.all([
          supabase.from("pharmacies_public").select("*"),
          supabase.from("medicines").select("pharmacy_id"),
        ]);
        if (pRes.data) setPharmacies(pRes.data);
        if (mRes.data) {
          const counts: Record<string, number> = {};
          mRes.data.forEach((m) => { counts[m.pharmacy_id] = (counts[m.pharmacy_id] || 0) + 1; });
          setMedicineCounts(counts);
        }
      } catch (e) { console.error("Failed to fetch pharmacies:", e); }
      setLoading(false);
    };
    fetchPharmacies();

    const loadFavorites = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUserId(session.user.id);
          const { data: fRes } = await supabase.from("favorites").select("provider_id").eq("user_id", session.user.id).eq("provider_type", "pharmacy");
          if (fRes) setFavorites(new Set(fRes.map((f) => f.provider_id)));
        }
      } catch (e) { console.error("Failed to load favorites:", e); }
    };
    loadFavorites();
  }, []);

  const toggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!userId) { toast.error("Please sign in to add favorites"); navigate("/login"); return; }
    if (favorites.has(id)) {
      await supabase.from("favorites").delete().eq("user_id", userId).eq("provider_id", id).eq("provider_type", "pharmacy");
      setFavorites((p) => { const n = new Set(p); n.delete(id); return n; });
      toast.success("Removed from favorites");
    } else {
      await supabase.from("favorites").insert({ user_id: userId, provider_id: id, provider_type: "pharmacy" });
      setFavorites((p) => new Set(p).add(id));
      toast.success("Added to favorites");
    }
  };

  const filtered = useMemo(() => {
    const searched = pharmacies.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (location) return sortByDistance(searched, location.latitude, location.longitude);
    return searched;
  }, [pharmacies, search, location]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground">Order Medicines</h1>
          {location && (
            <span className="ml-auto flex items-center gap-1 text-xs text-primary-foreground/70">
              <Navigation className="w-3 h-3" />Nearby
            </span>
          )}
        </div>
        <p className="text-primary-foreground/70 text-sm mb-3">Get medicines delivered to your doorstep</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search pharmacies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-0 shadow-lg h-11 rounded-xl" />
        </div>
      </div>

      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {loading ? (
          <MedicalLoader text="Finding pharmacies" />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No pharmacies found</div>
        ) : (
          filtered.map((p: any) => (
            <button
              key={p.id}
              onClick={() => navigate(`/pharmacy/${p.id}`)}
              className="w-full text-left bg-card rounded-xl border border-border p-2.5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex gap-2">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-xl flex-shrink-0">💊</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-foreground text-[11px] leading-tight truncate">{p.name}</h3>
                    <button onClick={(e) => toggleFavorite(e, p.id)} className="ml-1 flex-shrink-0">
                      <Heart className={`w-3.5 h-3.5 ${favorites.has(p.id) ? "fill-emergency text-emergency" : "text-muted-foreground"}`} />
                    </button>
                  </div>
                  {p.location && <p className="text-[9px] text-muted-foreground flex items-center gap-0.5 mt-0.5 truncate"><MapPin className="w-2.5 h-2.5 flex-shrink-0" />{p.location}</p>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="flex items-center gap-0.5 text-[9px]"><Star className="w-2.5 h-2.5 fill-warning text-warning" /><span className="font-medium">{p.rating}</span></span>
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground"><ShoppingBag className="w-2.5 h-2.5" />{medicineCounts[p.id] || 0}</span>
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground"><Clock className="w-2.5 h-2.5" />25-35m</span>
                    {p.distance_km != null && (
                      <span className="text-[9px] text-primary font-medium flex items-center gap-0.5">
                        <Navigation className="w-2.5 h-2.5" />{formatDistance(p.distance_km)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Pharmacies;
