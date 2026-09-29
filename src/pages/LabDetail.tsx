import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Star, MapPin, Clock, Heart, TestTube, Search,
  Beaker, Home, Utensils, BadgePercent, ChevronDown, ChevronUp,
  Droplets, AlertCircle, CheckCircle2, Info, Calendar, ArrowRightLeft,
  Navigation, BadgeCheck, Percent, ChevronRight, X
} from "lucide-react";
import { withAuthGuard } from "@/hooks/useRequireAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import LabTestCompareSheet from "@/components/patient/LabTestCompareSheet";
import { motion, AnimatePresence } from "framer-motion";

const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    "Blood Test": "🩸", "Urine Test": "🧪", "Imaging": "📷", "Pathology": "🔬",
    "Cardiac": "❤️", "Diabetes": "💉", "Thyroid": "🦋", "Liver": "🫁",
    "Kidney": "🫘", "Vitamin": "🌿", "Allergy": "🤧", "General": "🧬",
  };
  return icons[category] || "🧬";
};

const getPreparationSteps = (test: Tables<"lab_tests">) => {
  const before: string[] = [];
  const after: string[] = [];
  const howItWorks: string[] = [];

  if (test.sample_type) {
    const st = test.sample_type.toLowerCase();
    if (st.includes("blood")) {
      howItWorks.push("A small blood sample is drawn from a vein in your arm using a sterile needle.");
      howItWorks.push("The procedure takes about 2-5 minutes.");
    } else if (st.includes("urine")) {
      howItWorks.push("You will be given a sterile container to collect a urine sample.");
      howItWorks.push("Mid-stream clean-catch sample is usually preferred.");
    } else if (st.includes("stool")) {
      howItWorks.push("A stool sample is collected in a provided container.");
    } else if (st.includes("swab")) {
      howItWorks.push("A sterile swab is used to collect a sample from the specified area.");
    } else {
      howItWorks.push(`A ${test.sample_type} sample will be collected by a trained phlebotomist.`);
    }
  }

  if (test.requires_fasting) {
    before.push("Fast for 8-12 hours before the test (water is allowed).");
    before.push("Avoid alcohol for 24 hours before the test.");
    before.push("Schedule your test early morning for convenience.");
  } else {
    before.push("No fasting is required. You can eat and drink normally.");
  }
  before.push("Inform the lab about any medications you are currently taking.");
  before.push("Carry a valid ID and your prescription (if any).");
  if (test.home_collection) {
    before.push("Home sample collection is available — a phlebotomist will visit you.");
  }

  after.push("Apply gentle pressure on the puncture site for 2-3 minutes if blood was drawn.");
  after.push("You can resume normal activities immediately after the test.");
  if (test.turnaround_time) {
    after.push(`Reports are typically available within ${test.turnaround_time}.`);
  }
  after.push("Consult your doctor to interpret the results — do not self-diagnose.");

  return { before, after, howItWorks };
};

const LabDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [lab, setLab] = useState<Tables<"labs"> | null>(null);
  const [tests, setTests] = useState<Tables<"lab_tests">[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [compareTest, setCompareTest] = useState<Tables<"lab_tests"> | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const [{ data: labData }, { data: testData }] = await Promise.all([
        supabase.from("labs").select("*").eq("id", id).single(),
        supabase.from("lab_tests").select("*").eq("lab_id", id).order("is_popular", { ascending: false }),
      ]);
      if (labData) setLab(labData);
      if (testData) setTests(testData);
      setLoading(false);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        const { data: fav } = await supabase
          .from("favorites").select("id")
          .eq("user_id", session.user.id).eq("provider_id", id).eq("provider_type", "lab")
          .maybeSingle();
        if (fav) setIsFavorite(true);
      }
    };
    fetchAll();
  }, [id]);

  const toggleFavorite = async () => {
    if (!userId || !id) { toast.error("Please sign in"); navigate("/login"); return; }
    if (isFavorite) {
      await supabase.from("favorites").delete().eq("user_id", userId).eq("provider_id", id).eq("provider_type", "lab");
      setIsFavorite(false);
      toast.success("Removed from favorites");
    } else {
      await supabase.from("favorites").insert({ user_id: userId, provider_id: id, provider_type: "lab" });
      setIsFavorite(true);
      toast.success("Added to favorites");
    }
  };

  const categories = useMemo(() => ["All", ...new Set(tests.map((t) => t.category))], [tests]);
  const offersCount = useMemo(() => tests.filter(t => (t.discount_percent || 0) > 0).length, [tests]);

  const filteredTests = useMemo(() => {
    let result = tests;
    if (activeCategory !== "All") result = result.filter((t) => t.category === activeCategory);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    return result;
  }, [tests, activeCategory, search]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!lab) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3"><p className="text-muted-foreground">Lab not found</p><Button variant="outline" onClick={() => navigate("/labs")}>Back to Labs</Button></div>;

  return (
    <div className="min-h-screen bg-muted/30 pb-24 max-w-4xl mx-auto">
      {/* Swiggy-style hero header */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-primary/20 via-accent/40 to-primary/10 relative overflow-hidden">
          {lab.image_url ? (
            <img loading="lazy" decoding="async" src={lab.image_url} alt={lab.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-7xl opacity-30">🔬</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        {/* Top action bar */}
        <div className="absolute top-0 left-0 right-0 px-4 pt-10 flex items-center justify-between z-10">
          <button aria-label="Go back" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex gap-2">
            <button aria-label="Search" onClick={() => setShowSearch(!showSearch)} className="w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-sm"><Search className="w-4 h-4 text-foreground" /></button>
            <button aria-label="Toggle favourite" onClick={toggleFavorite} className="w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-sm"><Heart className={`w-4 h-4 ${isFavorite ? "fill-destructive text-destructive" : "text-foreground"}`} />
            </button>
          </div>
        </div>

        {/* Lab info card overlapping hero */}
        <div className="mx-4 -mt-12 relative z-10 bg-card rounded-2xl border border-border p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate flex items-center gap-1.5">
                {lab.name}
                {lab.approval_status === "approved" && <BadgeCheck className="w-5 h-5 text-primary shrink-0" />}
              </h1>
              {lab.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-primary shrink-0" /> {lab.location}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 6-12 hrs</span>
                <span>•</span>
                <span>{tests.length} tests</span>
                {offersCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-primary font-semibold flex items-center gap-1"><Percent className="w-3 h-3" />{offersCount} offers</span>
                  </>
                )}
              </div>
            </div>
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold text-white shrink-0 ${(lab.rating || 0) >= 4 ? "bg-emerald-600" : "bg-amber-500"}`}>
              <Star className="w-3.5 h-3.5 fill-current" />
              {lab.rating || "—"}
            </div>
          </div>

          {(lab.latitude && lab.longitude || lab.location) && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${lab.latitude && lab.longitude ? `${lab.latitude},${lab.longitude}` : encodeURIComponent(lab.location || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-between py-2 border-t border-dashed border-border text-xs text-primary font-semibold"
            >
              <span className="flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5" /> Get Directions</span>
              <ChevronRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Expandable search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 overflow-hidden">
            <div className="relative mt-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input aria-label="Search tests in this lab..." placeholder="Search tests in this lab..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 pr-9 bg-card border-border h-11 rounded-xl text-sm" autoFocus />
              {search && (
                <button aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category filter chips */}
      <div className="px-4 mt-4 mb-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                activeCategory === cat
                  ? "bg-foreground text-background shadow-md"
                  : "bg-card text-foreground border border-border hover:bg-muted"
              }`}
            >
              {cat !== "All" && <span className="text-sm">{getCategoryIcon(cat)}</span>}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Offer banner */}
      {offersCount > 0 && (
        <div className="px-4 mb-4">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Save with {offersCount} offers</p>
              <p className="text-[11px] text-muted-foreground">Discounts on selected lab tests</p>
            </div>
          </div>
        </div>
      )}

      {/* Test catalogue */}
      <div className="px-4">
        {filteredTests.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <TestTube className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No tests found</p>
            <p className="text-xs mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="result-grid items-start">
            {filteredTests.map((test, idx) => {
              const isExpanded = expandedTest === test.id;
              const discountedPrice = test.discount_percent ? Math.round(test.price * (1 - (test.discount_percent ?? 0) / 100)) : test.price;
              const hasDiscount = (test.discount_percent || 0) > 0;
              const prep = getPreparationSteps(test);

              return (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  {/* Test summary row */}
                  <button onClick={() => setExpandedTest(isExpanded ? null : test.id)} className="w-full text-left p-3 flex gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/60 to-accent/20 flex items-center justify-center shrink-0 relative">
                      <span className="text-2xl">{getCategoryIcon(test.category)}</span>
                      {hasDiscount && (
                        <div className="absolute -top-1 -left-1">
                          <Badge className="bg-primary text-primary-foreground text-[7px] font-bold px-1 py-0 rounded-md">
                            {test.discount_percent}% OFF
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground leading-tight">{test.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{test.category}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">₹{discountedPrice}</p>
                          {hasDiscount && <p className="text-[10px] text-muted-foreground line-through">₹{test.price}</p>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                        {test.sample_type && <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3" />{test.sample_type}</span>}
                        {test.turnaround_time && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{test.turnaround_time}</span>}
                        {test.home_collection && <span className="text-success flex items-center gap-0.5"><Home className="w-3 h-3" />Home</span>}
                        {test.requires_fasting && <span className="text-warning flex items-center gap-0.5"><Utensils className="w-3 h-3" />Fasting</span>}
                        {test.is_popular && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Popular</Badge>}
                        <span className="ml-auto">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4 space-y-4">
                      {test.description && (
                        <div className="pt-3">
                          <div className="flex items-center gap-2 mb-1.5"><Info className="w-4 h-4 text-primary" /><h4 className="text-sm font-semibold text-foreground">About This Test</h4></div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{test.description}</p>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2 mb-2"><Beaker className="w-4 h-4 text-primary" /><h4 className="text-sm font-semibold text-foreground">How It's Done</h4></div>
                        <div className="space-y-1.5">
                          {prep.howItWorks.map((step, i) => (
                            <div key={i} className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /><p className="text-xs text-muted-foreground">{step}</p></div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-warning" /><h4 className="text-sm font-semibold text-foreground">Before the Test</h4></div>
                        <div className="space-y-1.5">
                          {prep.before.map((step, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="w-4 h-4 rounded-full bg-warning/15 text-warning text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                              <p className="text-xs text-muted-foreground">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-success" /><h4 className="text-sm font-semibold text-foreground">After the Test</h4></div>
                        <div className="space-y-1.5">
                          {prep.after.map((step, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="w-4 h-4 rounded-full bg-success/15 text-success text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                              <p className="text-xs text-muted-foreground">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); setCompareTest(test); }}
                        className="w-full h-9 rounded-xl text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                        Compare Price at Other Labs
                      </Button>

                      <Button
                        className="w-full h-10 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm"
                        onClick={() => navigate(`/book/lab/${id}?test=${test.id}`)}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Book This Test — ₹{discountedPrice}
                      </Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Location Map */}
      {(lab.latitude && lab.longitude || lab.location) && (
        <div className="px-4 mt-6">
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm">
              <Navigation className="w-4 h-4 text-primary" /> Location
            </h3>
            {lab.latitude && lab.longitude && (
              <div className="rounded-xl overflow-hidden border border-border h-40">
                <iframe
                  title="Lab Location"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${lab.longitude - 0.01},${lab.latitude - 0.01},${lab.longitude + 0.01},${lab.latitude + 0.01}&layer=mapnik&marker=${lab.latitude},${lab.longitude}`}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <LabTestCompareSheet test={compareTest} open={!!compareTest} onClose={() => setCompareTest(null)} />
      <BottomNav />
    </div>
  );
};

export default withAuthGuard(LabDetail);
