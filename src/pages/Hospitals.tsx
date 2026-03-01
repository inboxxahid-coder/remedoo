import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Search, Heart, MapPin, Bed, ShieldCheck, CalendarPlus, Building2, Landmark, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useGeolocation, sortByDistance, formatDistance } from "@/hooks/useGeolocation";

const Hospitals = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const { location } = useGeolocation();

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const { data: hRes } = await supabase.from("hospitals").select("*");
        if (hRes) setHospitals(hRes);
      } catch (e) { console.error("Failed to fetch hospitals:", e); }
      setLoading(false);
    };
    fetchHospitals();

    const loadFavorites = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUserId(session.user.id);
          const { data: fRes } = await supabase.from("favorites").select("provider_id").eq("user_id", session.user.id).eq("provider_type", "hospital");
          if (fRes) setFavorites(new Set(fRes.map((f) => f.provider_id)));
        }
      } catch (e) { console.error("Failed to load favorites:", e); }
    };
    loadFavorites();
  }, []);

  const toggleFavorite = async (id: string) => {
    if (!userId) { toast.error("Please sign in to add favorites"); navigate("/login"); return; }
    if (favorites.has(id)) {
      await supabase.from("favorites").delete().eq("user_id", userId).eq("provider_id", id).eq("provider_type", "hospital");
      setFavorites((p) => { const n = new Set(p); n.delete(id); return n; });
      toast.success("Removed from favorites");
    } else {
      await supabase.from("favorites").insert({ user_id: userId, provider_id: id, provider_type: "hospital" });
      setFavorites((p) => new Set(p).add(id));
      toast.success("Added to favorites");
    }
  };

  const sorted = useMemo(() => {
    const searched = hospitals.filter((h) => h.name.toLowerCase().includes(search.toLowerCase()) || h.location?.toLowerCase().includes(search.toLowerCase()));
    if (location) return sortByDistance(searched, location.latitude, location.longitude);
    return searched;
  }, [hospitals, search, location]);

  const govtHospitals = sorted.filter((h: any) => h.is_government);
  const privateHospitals = sorted.filter((h: any) => !h.is_government);

  const renderCard = (h: any) => (
    <div key={h.id} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center text-3xl flex-shrink-0">
          {h.is_government ? "🏛️" : "🏥"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate">{h.name}</h3>
              {h.is_government && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full mt-0.5">
                  <Landmark className="w-2.5 h-2.5" />GOVT
                </span>
              )}
            </div>
            <button onClick={() => toggleFavorite(h.id)}>
              <Heart className={`w-5 h-5 ${favorites.has(h.id) ? "fill-emergency text-emergency" : "text-muted-foreground"}`} />
            </button>
          </div>
          {h.location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{h.location}</p>}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-warning text-warning" /><span className="text-xs font-medium">{h.rating}</span></div>
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Bed className="w-3 h-3" />{h.beds} beds</span>
            {h.icu_available && <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full flex items-center gap-1"><ShieldCheck className="w-3 h-3" />ICU</span>}
            {h.distance_km != null && (
              <span className="text-xs text-primary font-medium flex items-center gap-0.5">
                <Navigation className="w-3 h-3" />{formatDistance(h.distance_km)}
              </span>
            )}
          </div>
          <button
            onClick={() => navigate(`/book/hospital/${h.id}`)}
            className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold gradient-primary text-primary-foreground flex items-center justify-center gap-1"
          >
            <CalendarPlus className="w-3.5 h-3.5" />Book Now
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground">Hospitals</h1>
          {location && (
            <span className="ml-auto flex items-center gap-1 text-xs text-primary-foreground/70">
              <Navigation className="w-3 h-3" />Nearby
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search hospitals..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-0 shadow-lg h-11 rounded-xl" />
        </div>
      </div>
      <div className="px-5 mt-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <Tabs defaultValue="all" className="space-y-3">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="all" className="text-xs gap-1.5">
                <Building2 className="w-3.5 h-3.5" />All ({sorted.length})
              </TabsTrigger>
              <TabsTrigger value="govt" className="text-xs gap-1.5">
                <Landmark className="w-3.5 h-3.5" />Govt ({govtHospitals.length})
              </TabsTrigger>
              <TabsTrigger value="private" className="text-xs gap-1.5">
                <Building2 className="w-3.5 h-3.5" />Private ({privateHospitals.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-3">
              {sorted.length === 0 ? <p className="text-center py-12 text-muted-foreground">No hospitals found</p> : sorted.map(renderCard)}
            </TabsContent>
            <TabsContent value="govt" className="space-y-3">
              {govtHospitals.length === 0 ? <p className="text-center py-12 text-muted-foreground">No government hospitals found</p> : govtHospitals.map(renderCard)}
            </TabsContent>
            <TabsContent value="private" className="space-y-3">
              {privateHospitals.length === 0 ? <p className="text-center py-12 text-muted-foreground">No private hospitals found</p> : privateHospitals.map(renderCard)}
            </TabsContent>
          </Tabs>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Hospitals;
