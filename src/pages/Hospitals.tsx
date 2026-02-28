import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Search, Heart, MapPin, Bed, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const Hospitals = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState<Tables<"hospitals">[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        const { data: fRes } = await supabase.from("favorites").select("provider_id").eq("user_id", session.user.id).eq("provider_type", "hospital");
        if (fRes) setFavorites(new Set(fRes.map((f) => f.provider_id)));
      }
      const { data: hRes } = await supabase.from("hospitals").select("*");
      if (hRes) setHospitals(hRes);
      setLoading(false);
    };
    load();
  }, [navigate]);

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

  const filtered = hospitals.filter((h) => h.name.toLowerCase().includes(search.toLowerCase()) || h.location?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground">Hospitals</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search hospitals..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-0 shadow-lg h-11 rounded-xl" />
        </div>
      </div>
      <div className="px-5 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No hospitals found</div>
        ) : (
          filtered.map((h) => (
            <div key={h.id} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center text-3xl flex-shrink-0">🏥</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-foreground truncate">{h.name}</h3>
                    <button onClick={() => toggleFavorite(h.id)}>
                      <Heart className={`w-5 h-5 ${favorites.has(h.id) ? "fill-emergency text-emergency" : "text-muted-foreground"}`} />
                    </button>
                  </div>
                  {h.location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{h.location}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-warning text-warning" /><span className="text-xs font-medium">{h.rating}</span></div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Bed className="w-3 h-3" />{h.beds} beds</span>
                    {h.icu_available && <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full flex items-center gap-1"><ShieldCheck className="w-3 h-3" />ICU</span>}
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

export default Hospitals;
