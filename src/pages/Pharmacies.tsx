import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Search, Heart, MapPin, Clock, ShoppingBag, Navigation, BadgeCheck, SlidersHorizontal, Percent, Pill, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useGeolocation, sortByDistance, formatDistance } from "@/hooks/useGeolocation";
import MedicalLoader from "@/components/ui/MedicalLoader";
import { motion, AnimatePresence } from "framer-motion";
import { getPharmacyImage } from "@/lib/providerDefaults";
import { usePharmacyMode } from "@/hooks/usePharmacyMode";
import { readPageCache, writePageCache, runWhenIdle } from "@/lib/pageCache";

const OFFER_BANNERS = [
  { emoji: "💊", title: "Flat 20% OFF", subtitle: "On first medicine order", bg: "from-emerald-500 to-teal-600" },
  { emoji: "🚚", title: "Free Delivery", subtitle: "On orders above ₹199", bg: "from-orange-500 to-amber-600" },
  { emoji: "⚡", title: "Express 15 min", subtitle: "Get meds super fast", bg: "from-violet-500 to-purple-600" },
];

const FILTERS = ["Relevance", "Rating 4.0+", "Delivery Time", "Has Offers", "Nearest First"];

const Pharmacies = () => {
  const navigate = useNavigate();
  const { mode, loading: modeLoading } = usePharmacyMode();
  const cached = useMemo(() => readPageCache<any>("pharmacies"), []);
  const [pharmacies, setPharmacies] = useState<any[]>(cached?.pharmacies ?? []);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(!cached);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [medicineCounts, setMedicineCounts] = useState<Record<string, number>>(cached?.medicineCounts ?? {});
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>(cached?.offerCounts ?? {});
  const [activeFilter, setActiveFilter] = useState("Relevance");
  const [bannerIdx, setBannerIdx] = useState(0);
  const { location } = useGeolocation();

  // Redirect to Remedoo pharmacy page if mode is remedoo
  useEffect(() => {
    if (!modeLoading && mode === "remedoo") {
      navigate("/remedoo-pharmacy", { replace: true });
    }
  }, [mode, modeLoading, navigate]);

  // Auto-rotate banners
  useEffect(() => {
    const t = setInterval(() => setBannerIdx(i => (i + 1) % OFFER_BANNERS.length), 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchPharmacies = async () => {
      try {
        const pRes = await supabase.from("pharmacies_public").select("*");
        if (pRes.data) setPharmacies(pRes.data);
        setLoading(false);
        const mRes = await new Promise<any>((resolve) =>
          runWhenIdle(() => supabase.from("medicines").select("pharmacy_id, discount_percent").then(resolve))
        );
        if (mRes.data) {
          const counts: Record<string, number> = {};
          const offers: Record<string, number> = {};
          mRes.data.forEach((m) => {
            counts[m.pharmacy_id] = (counts[m.pharmacy_id] || 0) + 1;
            if ((m.discount_percent || 0) > 0) offers[m.pharmacy_id] = (offers[m.pharmacy_id] || 0) + 1;
          });
          setMedicineCounts(counts);
          setOfferCounts(offers);
          writePageCache("pharmacies", { pharmacies: pRes.data ?? [], medicineCounts: counts, offerCounts: offers });
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
    runWhenIdle(loadFavorites);
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
    let results = pharmacies.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

    if (activeFilter === "Rating 4.0+" ) results = results.filter(p => (p.rating || 0) >= 4);
    if (activeFilter === "Has Offers") results = results.filter(p => (offerCounts[p.id] || 0) > 0);
    if (activeFilter === "Nearest First" && location) results = sortByDistance(results, location.latitude, location.longitude);
    else if (location) results = sortByDistance(results, location.latitude, location.longitude);
    if (activeFilter === "Delivery Time") results = [...results]; // already sorted by distance ~ delivery
    if (activeFilter === "Rating 4.0+" || activeFilter === "Relevance") {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return results;
  }, [pharmacies, search, location, activeFilter, offerCounts]);

  const deliveryTime = (p: any) => {
    if (p.distance_km != null) {
      const mins = Math.round(15 + p.distance_km * 3);
      return `${mins}-${mins + 10} min`;
    }
    return "25-35 min";
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      {/* Swiggy-style top header */}
      <div className="bg-card sticky top-0 z-30 shadow-sm">
        <div className="px-4 safe-top pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">Medicines & More</h1>
              {location && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" /> Delivering to your location
                </p>
              )}
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search for pharmacies or medicines"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 bg-muted/50 border-border h-11 rounded-xl text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Filter chips — horizontal scroll */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground bg-card shrink-0">
              <SlidersHorizontal className="w-3 h-3" /> Filter
            </button>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeFilter === f
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-card border border-border text-foreground hover:bg-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Offer banner carousel */}
      <div className="px-4 mt-4">
        <div className="relative h-24 rounded-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={bannerIdx}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className={`absolute inset-0 bg-gradient-to-r ${OFFER_BANNERS[bannerIdx].bg} flex items-center px-5 gap-4`}
            >
              <span className="text-4xl">{OFFER_BANNERS[bannerIdx].emoji}</span>
              <div>
                <p className="text-white font-bold text-lg">{OFFER_BANNERS[bannerIdx].title}</p>
                <p className="text-white/80 text-xs">{OFFER_BANNERS[bannerIdx].subtitle}</p>
              </div>
            </motion.div>
          </AnimatePresence>
          {/* Dots */}
          <div className="absolute bottom-2 right-4 flex gap-1">
            {OFFER_BANNERS.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === bannerIdx ? "bg-white w-4" : "bg-white/40"}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Section title */}
      <div className="px-4 mt-5 mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-foreground text-base">{filtered.length} pharmacies near you</h2>
          <p className="text-[11px] text-muted-foreground">Discover medicines with best offers</p>
        </div>
      </div>

      {/* Pharmacy listing — Swiggy-style cards */}
      <div className="px-4 app-container card-grid">
        {loading ? (
          <div className="col-span-full"><MedicalLoader text="Finding pharmacies near you..." /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 col-span-full">
            <Pill className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">No pharmacies found</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
          </div>
        ) : (
          filtered.map((p: any, idx: number) => {
            const hasOffers = (offerCounts[p.id] || 0) > 0;
            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => navigate(`/pharmacy/${p.id}`)}
                className="w-full text-left bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all group"
              >
                {/* Top image/banner area */}
                <div className="relative h-32 bg-gradient-to-br from-primary/10 via-accent/30 to-primary/5 flex items-center justify-center overflow-hidden">
                  <img loading="lazy" decoding="async" src={getPharmacyImage(p.image_url)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

                  {/* Favorite button */}
                  <button
                    onClick={(e) => toggleFavorite(e, p.id)}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-sm"
                  >
                    <Heart className={`w-4 h-4 ${favorites.has(p.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                  </button>

                  {/* Offer ribbon */}
                  {hasOffers && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/80 px-3 py-1.5">
                      <p className="text-primary-foreground text-[11px] font-bold flex items-center gap-1">
                        <Percent className="w-3 h-3" /> {offerCounts[p.id]} offers available
                      </p>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-sm truncate flex items-center gap-1.5">
                        {p.name}
                        {p.approval_status === "approved" && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
                      </h3>
                      {p.location && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{p.location}</p>
                      )}
                    </div>
                    {/* Rating badge */}
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold text-white shrink-0 ${(p.rating || 0) >= 4 ? "bg-emerald-600" : (p.rating || 0) >= 3 ? "bg-amber-500" : "bg-muted-foreground"}`}>
                      <Star className="w-3 h-3 fill-current" />
                      {p.rating || "—"}
                    </div>
                  </div>

                  {/* Divider line with info */}
                  <div className="mt-2.5 pt-2.5 border-t border-dashed border-border flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {deliveryTime(p)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5" /> {medicineCounts[p.id] || 0} items
                    </span>
                    {p.distance_km != null && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-primary font-semibold">
                          <Navigation className="w-3.5 h-3.5" /> {formatDistance(p.distance_km)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Pharmacies;
