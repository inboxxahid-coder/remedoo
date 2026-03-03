import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Star, MapPin, Phone, Clock, Heart, TestTube,
  Beaker, Home, Utensils, BadgePercent, ChevronDown, ChevronUp,
  Droplets, AlertCircle, CheckCircle2, Info, Calendar, ArrowRightLeft, Navigation
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

/* Derive human-friendly preparation instructions from test metadata */
const getPreparationSteps = (test: Tables<"lab_tests">) => {
  const before: string[] = [];
  const after: string[] = [];
  const howItWorks: string[] = [];

  // Sample collection
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

  // Fasting
  if (test.requires_fasting) {
    before.push("Fast for 8-12 hours before the test (water is allowed).");
    before.push("Avoid alcohol for 24 hours before the test.");
    before.push("Schedule your test early morning for convenience.");
  } else {
    before.push("No fasting is required. You can eat and drink normally.");
  }

  // General before
  before.push("Inform the lab about any medications you are currently taking.");
  before.push("Carry a valid ID and your prescription (if any).");

  // Home collection
  if (test.home_collection) {
    before.push("Home sample collection is available — a phlebotomist will visit you.");
  }

  // After
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
          .from("favorites")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("provider_id", id)
          .eq("provider_type", "lab")
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

  const categories = useMemo(() => {
    return ["All", ...new Set(tests.map((t) => t.category))];
  }, [tests]);

  const filteredTests = useMemo(() => {
    let result = tests;
    if (activeCategory !== "All") result = result.filter((t) => t.category === activeCategory);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    return result;
  }, [tests, activeCategory, search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading lab details...</p>
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Lab not found</p>
        <Button variant="outline" onClick={() => navigate("/labs")}>Back to Labs</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-primary-foreground">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-primary-foreground truncate">{lab.name}</h1>
          </div>
          <button onClick={toggleFavorite}>
            <Heart className={`w-6 h-6 ${isFavorite ? "fill-red-400 text-red-400" : "text-primary-foreground/70"}`} />
          </button>
        </div>

        {/* Lab info */}
        <div className="bg-card/10 backdrop-blur-sm rounded-xl p-3 space-y-1.5">
          {lab.location && (
            <p className="text-sm text-primary-foreground/80 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 flex-shrink-0" />{lab.location}
            </p>
          )}
          {lab.phone && (
            <p className="text-sm text-primary-foreground/80 flex items-center gap-1.5">
              <Phone className="w-4 h-4 flex-shrink-0" />{lab.phone}
            </p>
          )}
          <div className="flex items-center gap-3">
            {lab.rating != null && (
              <span className="flex items-center gap-1 text-sm text-primary-foreground">
                <Star className="w-4 h-4 fill-warning text-warning" />{lab.rating}
              </span>
            )}
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-xs">
              <TestTube className="w-3 h-3 mr-1" />{tests.length} Tests Available
            </Badge>
            {(lab.latitude && lab.longitude || lab.location) && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${lab.latitude && lab.longitude ? `${lab.latitude},${lab.longitude}` : encodeURIComponent(lab.location || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary-foreground bg-primary-foreground/20 rounded-lg px-2 py-1 hover:bg-primary-foreground/30 transition-colors"
              >
                <Navigation className="w-3 h-3" /> Directions
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Search & Categories */}
      <div className="px-5 mt-4 space-y-3">
        <Input
          placeholder="Search tests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 rounded-xl border-border"
        />

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Showing {filteredTests.length} of {tests.length} tests
        </p>
      </div>

      {/* Tests List */}
      <div className="px-5 mt-2 space-y-3">
        {filteredTests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No tests match your search</div>
        ) : (
          filteredTests.map((test) => {
            const isExpanded = expandedTest === test.id;
            const discountedPrice = test.discount_percent
              ? Math.round(test.price * (1 - (test.discount_percent ?? 0) / 100))
              : test.price;
            const prep = getPreparationSteps(test);

            return (
              <div key={test.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* Test Summary */}
                <button
                  onClick={() => setExpandedTest(isExpanded ? null : test.id)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                      <TestTube className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground leading-tight">{test.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{test.category}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-primary">₹{discountedPrice}</p>
                          {test.discount_percent != null && test.discount_percent > 0 && (
                            <>
                              <p className="text-[10px] text-muted-foreground line-through">₹{test.price}</p>
                              <span className="text-[10px] text-success flex items-center gap-0.5 justify-end">
                                <BadgePercent className="w-3 h-3" />{test.discount_percent}% off
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {test.sample_type && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Droplets className="w-3 h-3" />{test.sample_type}
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
                            {(test as any).home_collection_fee > 0 && ` (+₹${(test as any).home_collection_fee})`}
                          </span>
                        )}
                        {test.requires_fasting && (
                          <span className="text-[10px] text-warning flex items-center gap-0.5">
                            <Utensils className="w-3 h-3" />Fasting required
                          </span>
                        )}
                        {test.is_popular && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Popular</Badge>
                        )}
                        <span className="ml-auto">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 space-y-4">
                    {test.description && (
                      <div className="pt-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Info className="w-4 h-4 text-primary" />
                          <h4 className="text-sm font-semibold text-foreground">About This Test</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{test.description}</p>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Beaker className="w-4 h-4 text-primary" />
                        <h4 className="text-sm font-semibold text-foreground">How It's Done</h4>
                      </div>
                      <div className="space-y-1.5">
                        {prep.howItWorks.map((step, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-warning" />
                        <h4 className="text-sm font-semibold text-foreground">Before the Test</h4>
                      </div>
                      <div className="space-y-1.5">
                        {prep.before.map((step, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-warning/15 text-warning text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <p className="text-xs text-muted-foreground">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <h4 className="text-sm font-semibold text-foreground">After the Test</h4>
                      </div>
                      <div className="space-y-1.5">
                        {prep.after.map((step, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-success/15 text-success text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <p className="text-xs text-muted-foreground">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Compare + Book buttons */}
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompareTest(test);
                      }}
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
              </div>
            );
          })
        )}
      </div>

      {/* Location Map */}
      {(lab.latitude && lab.longitude || lab.location) && (
        <div className="px-5 mt-4">
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" /> Location
            </h3>
            {lab.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-3">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" /> {lab.location}
              </p>
            )}
            {lab.latitude && lab.longitude && (
              <div className="rounded-xl overflow-hidden border border-border h-44">
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
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${lab.latitude && lab.longitude ? `${lab.latitude},${lab.longitude}` : encodeURIComponent(lab.location || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 w-full h-9 rounded-xl text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/5 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" /> Get Directions
            </a>
          </div>
        </div>
      )}

      {/* Compare Sheet */}
      <LabTestCompareSheet test={compareTest} open={!!compareTest} onClose={() => setCompareTest(null)} />

      <BottomNav />
    </div>
  );
};

export default withAuthGuard(LabDetail);
