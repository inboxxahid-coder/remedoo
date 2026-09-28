import { useState, useEffect, useMemo } from "react";
import { rankDoctors } from "@/lib/doctorRanking";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Star, Search, Heart, MapPin, Navigation, BadgeCheck, SlidersHorizontal, Percent, Stethoscope, X, Clock, IndianRupee } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useGeolocation, sortByDistance, formatDistance } from "@/hooks/useGeolocation";
import MedicalLoader from "@/components/ui/MedicalLoader";
import { motion, AnimatePresence } from "framer-motion";
import { getDoctorAvatar } from "@/lib/providerDefaults";
import { readPageCache, writePageCache, runWhenIdle } from "@/lib/pageCache";
import { useServiceToggle } from "@/hooks/useServiceToggle";
import ServiceDisabledBanner from "@/components/ServiceDisabledBanner";

const OFFER_BANNERS = [
  { emoji: "🩺", title: "Flat 30% OFF", subtitle: "On first doctor consultation", bg: "from-emerald-500 to-teal-600" },
  { emoji: "⚡", title: "Instant Booking", subtitle: "No waiting, confirm in seconds", bg: "from-violet-500 to-purple-600" },
  { emoji: "📞", title: "Free Follow-up", subtitle: "Within 7 days of consultation", bg: "from-orange-500 to-amber-600" },
];

const FILTERS = ["Relevance", "Rating 4.0+", "Fee: Low-High", "Experience", "Nearest First"];

const Doctors = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { services, loading: serviceLoading } = useServiceToggle();
  const specFromUrl = searchParams.get("spec") || "All";
  const cachedDoctors = useMemo(() => readPageCache<any[]>("doctors"), []);
  const [doctors, setDoctors] = useState<any[]>(cachedDoctors ?? []);
  const [search, setSearch] = useState("");
  const [selectedSpec, setSelectedSpec] = useState<string>(specFromUrl);
  const [loading, setLoading] = useState(!cachedDoctors);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("Relevance");
  const [bannerIdx, setBannerIdx] = useState(0);
  const { location } = useGeolocation();

  useEffect(() => {
    const t = setInterval(() => setBannerIdx(i => (i + 1) % OFFER_BANNERS.length), 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data: doctorsRes } = await supabase.from("doctors_public").select("*, hospitals(name, latitude, longitude, is_government)");
        if (doctorsRes) {
          const mapped = doctorsRes
            .filter((d: any) => !d.hospitals?.is_government)
            .map((d: any) => ({
              ...d,
              hospital_name: d.hospitals?.name,
              latitude: d.hospitals?.latitude ?? null,
              longitude: d.hospitals?.longitude ?? null,
            }));
          setDoctors(mapped);
          writePageCache("doctors", mapped);
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
    runWhenIdle(loadFavorites);
  }, []);

  const toggleFavorite = async (e: React.MouseEvent, doctorId: string) => {
    e.stopPropagation();
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

  const specializations = useMemo(() => {
    const specs = new Set(doctors.map((d) => d.specialization).filter(Boolean) as string[]);
    return ["All", ...Array.from(specs).sort()];
  }, [doctors]);

  const filtered = useMemo(() => {
    let results = doctors.filter((d) => {
      const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.specialization?.toLowerCase().includes(search.toLowerCase()));
      const matchesSpec = selectedSpec === "All" || d.specialization === selectedSpec;
      return matchesSearch && matchesSpec;
    });

    // Add distance data
    if (location) results = sortByDistance(results, location.latitude, location.longitude);

    if (activeFilter === "Rating 4.0+") results = results.filter(d => (d.rating || 0) >= 4);
    if (activeFilter === "Fee: Low-High") results = [...results].sort((a, b) => (a.consultation_fee || 0) - (b.consultation_fee || 0));
    else if (activeFilter === "Experience") results = [...results].sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0));
    else if (activeFilter === "Nearest First" && location) results = sortByDistance(results, location.latitude, location.longitude);
    else if (activeFilter === "Relevance") {
      // Smart ranking: composite score of rating + distance + experience + featured
      results = rankDoctors(results, location?.latitude, location?.longitude);
    }

    return results;
  }, [doctors, search, selectedSpec, location, activeFilter]);

  const waitTime = (d: any) => {
    if (d.distance_km != null) {
      const mins = Math.max(5, Math.round(10 + d.distance_km * 2));
      return `${mins}-${mins + 10} min`;
    }
    return "15-25 min";
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      {/* Swiggy-style sticky header */}
      <div className="bg-card sticky top-0 z-30 shadow-sm">
        <div className="px-4 safe-top pb-3 app-container">
          <div className="flex items-center gap-3 mb-3">
            <button aria-label="Go back" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">Doctors</h1>
              {location && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" /> Doctors near your location
                </p>
              )}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or specialization"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 bg-muted/50 border-border h-11 rounded-xl text-sm"
            />
            {search && (
              <button aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>
            )}
          </div>
        </div>

        {/* Specialization chips */}
        <div className="px-4 pb-2 overflow-x-auto scrollbar-hide app-container">
          <div className="flex gap-2">
            {specializations.map(spec => (
              <button
                key={spec}
                onClick={() => setSelectedSpec(spec)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  selectedSpec === spec
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-card border border-border text-foreground hover:bg-muted"
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Filter chips */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide app-container">
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
                    ? "bg-primary text-primary-foreground shadow-sm"
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
      <div className="px-4 mt-4 app-container">
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
          <div className="absolute bottom-2 right-4 flex gap-1">
            {OFFER_BANNERS.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === bannerIdx ? "bg-white w-4" : "bg-white/40"}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Section title */}
      <div className="px-4 mt-5 mb-3 flex items-center justify-between app-container">
        <div>
          <h2 className="font-bold text-foreground text-base">{filtered.length} doctors available</h2>
          <p className="text-[11px] text-muted-foreground">Book consultation with best doctors</p>
        </div>
      </div>

      {/* Doctor listing — Swiggy-style cards */}
      <div className="px-4 app-container card-grid">
        {!services.service_doctors_enabled ? (
          <div className="col-span-full"><ServiceDisabledBanner serviceName="Doctor Appointments" /></div>
        ) : loading ? (
          <div className="col-span-full"><MedicalLoader text="Finding doctors near you..." /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 col-span-full">
            <Stethoscope className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">No doctors found</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different search or specialty</p>
          </div>
        ) : (
          filtered.map((doc: any, idx: number) => (
            <motion.button
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => navigate(`/doctor/${doc.id}`)}
              className="w-full text-left bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all group"
            >
              {/* Top image/banner area */}
              <div className="relative h-32 bg-gradient-to-br from-primary/10 via-accent/30 to-primary/5 flex items-center justify-center overflow-hidden">
                <img loading="lazy" decoding="async" src={getDoctorAvatar(doc.gender, doc.image_url)} alt={doc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

                {/* Favorite button */}
                <button aria-label="Toggle favourite"
                  onClick={(e) => toggleFavorite(e, doc.id)}
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-sm"
                ><Heart className={`w-4 h-4 ${favorites.has(doc.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} /></button>

                {/* Fee ribbon */}
                {doc.consultation_fee && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/80 px-3 py-1.5">
                    <p className="text-primary-foreground text-[11px] font-bold flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" /> Consultation fee ₹{doc.consultation_fee}
                    </p>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm truncate flex items-center gap-1.5">
                      {doc.name}
                      {doc.approval_status === "approved" && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
                    </h3>
                    <p className="text-xs text-primary font-medium mt-0.5">{doc.specialization}</p>
                    {doc.hospital_name && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" /> {doc.hospital_name}
                      </p>
                    )}
                  </div>
                  {/* Rating badge */}
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold text-white shrink-0 ${(doc.rating || 0) >= 4 ? "bg-emerald-600" : (doc.rating || 0) >= 3 ? "bg-amber-500" : "bg-muted-foreground"}`}>
                    <Star className="w-3 h-3 fill-current" />
                    {doc.rating || "—"}
                  </div>
                </div>

                {/* Divider line with info */}
                <div className="mt-2.5 pt-2.5 border-t border-dashed border-border flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {doc.experience_years && (
                    <span className="flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5" /> {doc.experience_years} yrs exp
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {waitTime(doc)}
                  </span>
                  {doc.distance_km != null && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-primary font-semibold">
                        <Navigation className="w-3.5 h-3.5" /> {formatDistance(doc.distance_km)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Doctors;
