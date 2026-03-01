import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Search, Heart, MapPin, TestTube, Navigation, ChevronDown, ChevronUp, Beaker, Clock, Home, Utensils, BadgePercent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useGeolocation, sortByDistance, formatDistance } from "@/hooks/useGeolocation";

const Labs = () => {
  const navigate = useNavigate();
  const [labs, setLabs] = useState<Tables<"labs">[]>([]);
  const [labTests, setLabTests] = useState<Record<string, Tables<"lab_tests">[]>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [expandedLab, setExpandedLab] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Record<string, string>>({});
  const { location } = useGeolocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: lRes }, { data: tRes }] = await Promise.all([
          supabase.from("labs").select("*"),
          supabase.from("lab_tests").select("*").order("is_popular", { ascending: false }),
        ]);
        if (lRes) setLabs(lRes);
        if (tRes) {
          const grouped: Record<string, Tables<"lab_tests">[]> = {};
          tRes.forEach((t) => {
            if (!grouped[t.lab_id]) grouped[t.lab_id] = [];
            grouped[t.lab_id].push(t);
          });
          setLabTests(grouped);
        }
      } catch (e) {
        console.error("Failed to fetch labs:", e);
      }
      setLoading(false);
    };
    fetchData();

    const loadFavorites = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUserId(session.user.id);
          const { data: fRes } = await supabase.from("favorites").select("provider_id").eq("user_id", session.user.id).eq("provider_type", "lab");
          if (fRes) setFavorites(new Set(fRes.map((f) => f.provider_id)));
        }
      } catch (e) {
        console.error("Failed to load favorites:", e);
      }
    };
    loadFavorites();
  }, []);

  const toggleFavorite = async (id: string) => {
    if (!userId) { toast.error("Please sign in to add favorites"); navigate("/login"); return; }
    if (favorites.has(id)) {
      await supabase.from("favorites").delete().eq("user_id", userId).eq("provider_id", id).eq("provider_type", "lab");
      setFavorites((p) => { const n = new Set(p); n.delete(id); return n; });
      toast.success("Removed from favorites");
    } else {
      await supabase.from("favorites").insert({ user_id: userId, provider_id: id, provider_type: "lab" });
      setFavorites((p) => new Set(p).add(id));
      toast.success("Added to favorites");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const searched = labs.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      (labTests[l.id] || []).some((t) => t.name.toLowerCase().includes(q))
    );
    if (location) return sortByDistance(searched, location.latitude, location.longitude);
    return searched;
  }, [labs, search, location, labTests]);

  const getCategoriesForLab = (labId: string): string[] => {
    const tests = labTests[labId] || [];
    return [...new Set(tests.map((t) => t.category))];
  };

  const getFilteredTests = (labId: string): Tables<"lab_tests">[] => {
    const tests = labTests[labId] || [];
    const cat = activeCategory[labId];
    if (!cat || cat === "All") return tests;
    return tests.filter((t) => t.category === cat);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground">Labs & Tests</h1>
          {location && (
            <span className="ml-auto flex items-center gap-1 text-xs text-primary-foreground/70">
              <Navigation className="w-3 h-3" />Nearby
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search labs or tests..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-0 shadow-lg h-11 rounded-xl" />
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No labs found</div>
        ) : (
          filtered.map((lab: any) => {
            const tests = labTests[lab.id] || [];
            const q = search.toLowerCase();
            const isTestSearch = q.length > 0 && !lab.name.toLowerCase().includes(q);
            const matchedTests = isTestSearch ? tests.filter((t) => t.name.toLowerCase().includes(q)) : [];
            const isExpanded = expandedLab === lab.id || (isTestSearch && matchedTests.length > 0);
            const categories = getCategoriesForLab(lab.id);
            const currentCat = activeCategory[lab.id] || "All";
            const visibleTests = getFilteredTests(lab.id);

            return (
              <div key={lab.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* Lab Header */}
                <div className="p-4">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center text-3xl flex-shrink-0">🔬</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-foreground truncate">{lab.name}</h3>
                        <button onClick={() => toggleFavorite(lab.id)}>
                          <Heart className={`w-5 h-5 ${favorites.has(lab.id) ? "fill-emergency text-emergency" : "text-muted-foreground"}`} />
                        </button>
                      </div>
                      {lab.location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{lab.location}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <Star className="w-3.5 h-3.5 fill-warning text-warning" /><span className="text-xs font-medium">{lab.rating}</span>
                        {lab.distance_km != null && (
                          <span className="text-xs text-primary font-medium flex items-center gap-0.5">
                            <Navigation className="w-3 h-3" />{formatDistance(lab.distance_km)}
                          </span>
                        )}
                        {tests.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] h-5">
                            <Beaker className="w-3 h-3 mr-0.5" />{tests.length} tests
                          </Badge>
                        )}
                        {isTestSearch && matchedTests.length > 0 && (
                          <Badge className="text-[10px] h-5 bg-primary/15 text-primary border-primary/30">
                            <Search className="w-3 h-3 mr-0.5" />{matchedTests.length} matched
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        {tests.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg text-xs"
                            onClick={() => setExpandedLab(isExpanded ? null : lab.id)}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
                            {isExpanded ? "Hide Tests" : "View Tests"}
                          </Button>
                        )}
                        <Button size="sm" className="h-8 rounded-lg gradient-primary text-primary-foreground text-xs ml-auto" onClick={() => navigate(`/book/lab/${lab.id}`)}>
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Tests Section */}
                {isExpanded && tests.length > 0 && (
                  <div className="border-t border-border">
                    {/* Category Tabs */}
                    {categories.length > 1 && (
                      <div className="px-4 pt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
                        <button
                          onClick={() => setActiveCategory((p) => ({ ...p, [lab.id]: "All" }))}
                          className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${currentCat === "All" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                        >
                          All
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setActiveCategory((p) => ({ ...p, [lab.id]: cat }))}
                            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${currentCat === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Test List */}
                    <div className="p-4 pt-3 space-y-2 max-h-80 overflow-y-auto">
                      {visibleTests.map((test) => {
                        const isMatch = isTestSearch && test.name.toLowerCase().includes(search.toLowerCase());
                        return (
                        <div key={test.id} className={`rounded-xl p-3 flex items-start gap-3 ${isMatch ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/50"}`}>
                          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                            <TestTube className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-foreground leading-tight">{test.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{test.category}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-bold text-primary">₹{test.price}</p>
                                {test.discount_percent != null && test.discount_percent > 0 && (
                                  <span className="text-[10px] text-success flex items-center gap-0.5 justify-end">
                                    <BadgePercent className="w-3 h-3" />{test.discount_percent}% off
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              {test.sample_type && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Beaker className="w-3 h-3" />{test.sample_type}
                                </span>
                              )}
                              {test.turnaround_time && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />{test.turnaround_time}
                                </span>
                              )}
                              {test.home_collection && (
                                <span className="text-[10px] text-success flex items-center gap-0.5">
                                  <Home className="w-3 h-3" />Home collection
                                </span>
                              )}
                              {test.requires_fasting && (
                                <span className="text-[10px] text-warning flex items-center gap-0.5">
                                  <Utensils className="w-3 h-3" />Fasting
                                </span>
                              )}
                              {test.is_popular && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Popular</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Labs;
