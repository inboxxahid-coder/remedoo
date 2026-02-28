import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Star, MapPin, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

type FavoriteItem = {
  id: string;
  provider_type: string;
  provider_id: string;
  name: string;
  rating: number | null;
  location?: string | null;
  specialization?: string | null;
};

const emojiMap: Record<string, string> = { doctor: "👨‍⚕️", hospital: "🏥", lab: "🔬", pharmacy: "💊" };

const Favorites = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login", { replace: true }); return; }

    const { data: favs } = await supabase.from("favorites").select("*").eq("user_id", session.user.id);
    if (!favs) { setLoading(false); return; }

    const items: FavoriteItem[] = [];
    for (const fav of favs) {
      const table = fav.provider_type === "doctor" ? "doctors" : fav.provider_type === "hospital" ? "hospitals" : fav.provider_type === "lab" ? "labs" : "pharmacies";
      const { data } = await supabase.from(table).select("*").eq("id", fav.provider_id).single();
      if (data) {
        items.push({
          id: fav.id,
          provider_type: fav.provider_type,
          provider_id: fav.provider_id,
          name: (data as any).name,
          rating: (data as any).rating,
          location: (data as any).location,
          specialization: (data as any).specialization,
        });
      }
    }
    setFavorites(items);
    setLoading(false);
  };

  useEffect(() => { loadFavorites(); }, [navigate]);

  const removeFavorite = async (id: string) => {
    await supabase.from("favorites").delete().eq("id", id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    toast.success("Removed from favorites");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground">Favorites</h1>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No favorites yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add doctors, hospitals, labs or pharmacies to your favorites</p>
          </div>
        ) : (
          favorites.map((fav) => (
            <div key={fav.id} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center text-2xl flex-shrink-0">
                  {emojiMap[fav.provider_type] || "❤️"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground truncate">{fav.name}</h3>
                      <p className="text-xs text-primary capitalize">{fav.provider_type}</p>
                    </div>
                    <button onClick={() => removeFavorite(fav.id)} className="text-muted-foreground hover:text-emergency">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {fav.rating && (
                      <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-warning text-warning" /><span className="text-xs">{fav.rating}</span></div>
                    )}
                    {fav.location && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{fav.location}</span>}
                    {fav.specialization && <span className="text-xs text-muted-foreground">{fav.specialization}</span>}
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

export default Favorites;
