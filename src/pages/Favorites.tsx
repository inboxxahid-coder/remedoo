import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Star, MapPin, Trash2, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { SkeletonListCard } from "@/components/SkeletonCard";
import { readPageCache, writePageCache } from "@/lib/pageCache";

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
const colorMap: Record<string, string> = {
  doctor: "bg-primary/10",
  hospital: "bg-success/10",
  lab: "bg-warning/10",
  pharmacy: "bg-emergency/10",
};

const Favorites = () => {
  const navigate = useNavigate();
  const cachedFavs = readPageCache<FavoriteItem[]>("favorites");
  const [favorites, setFavorites] = useState<FavoriteItem[]>(cachedFavs || []);
  const [loading, setLoading] = useState(!cachedFavs);

  const loadFavorites = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login", { replace: true }); return; }
    const { data: favs } = await supabase.from("favorites").select("*").eq("user_id", session.user.id);
    if (!favs) { setLoading(false); return; }

    // Batch one query per provider type instead of one per favorite (N+1)
    const tableFor: Record<string, "doctors" | "hospitals" | "labs" | "pharmacies"> = {
      doctor: "doctors", hospital: "hospitals", lab: "labs", pharmacy: "pharmacies",
    };
    const byType = new Map<string, string[]>();
    favs.forEach((f) => {
      const t = tableFor[f.provider_type] || "pharmacies";
      byType.set(t, [...(byType.get(t) || []), f.provider_id]);
    });

    const results = await Promise.all(
      Array.from(byType.entries()).map(async ([table, ids]) => {
        const { data } = await supabase.from(table as any).select("*").in("id", ids);
        return (data || []) as any[];
      })
    );
    const lookup = new Map<string, any>();
    results.flat().forEach((row: any) => lookup.set(row.id, row));

    const items: FavoriteItem[] = [];
    for (const fav of favs) {
      const data = lookup.get(fav.provider_id);
      if (data) {
        items.push({
          id: fav.id, provider_type: fav.provider_type, provider_id: fav.provider_id,
          name: data.name, rating: data.rating,
          location: data.location, specialization: data.specialization,
        });
      }
    }
    setFavorites(items);
    writePageCache("favorites", items);
    setLoading(false);
  };

  useEffect(() => { loadFavorites(); }, [navigate]);

  const removeFavorite = async (id: string) => {
    await supabase.from("favorites").delete().eq("id", id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    toast.success("Removed from favorites");
  };

  const navigateToProvider = (fav: FavoriteItem) => {
    const path = fav.provider_type === "doctor" ? `/doctor/${fav.provider_id}` :
      fav.provider_type === "hospital" ? `/hospital/${fav.provider_id}` :
      fav.provider_type === "lab" ? `/lab/${fav.provider_id}` : `/pharmacy/${fav.provider_id}`;
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-primary page-header px-5 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3">
          <button aria-label="Go back" onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground">Favorites</h1>
          {favorites.length > 0 && (
            <span className="ml-auto bg-primary-foreground/20 text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
              {favorites.length}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonListCard key={i} />)
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <p className="text-foreground font-semibold mb-1">No favorites yet</p>
            <p className="text-sm text-muted-foreground">Add doctors, hospitals, labs or pharmacies</p>
          </div>
        ) : (
          <AnimatePresence>
            {favorites.map((fav, i) => (
              <motion.div
                key={fav.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
              >
                <button onClick={() => navigateToProvider(fav)} className="w-full p-4 text-left">
                  <div className="flex gap-3 items-center">
                    <div className={`w-14 h-14 rounded-2xl ${colorMap[fav.provider_type] || "bg-accent"} flex items-center justify-center text-2xl shrink-0`}>
                      {emojiMap[fav.provider_type] || "❤️"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground truncate text-sm">{fav.name}</h3>
                      <p className="text-xs text-primary capitalize font-semibold mt-0.5">{fav.provider_type}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {fav.rating && (
                          <span className="flex items-center gap-0.5 text-xs">
                            <Star className="w-3 h-3 fill-warning text-warning" />{fav.rating}
                          </span>
                        )}
                        {fav.location && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5 truncate">
                            <MapPin className="w-3 h-3 shrink-0" />{fav.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <button aria-label="Remove item"
                        onClick={(e) => { e.stopPropagation(); removeFavorite(fav.id); }}
                        className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                      ><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Favorites;
