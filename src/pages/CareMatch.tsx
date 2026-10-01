import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sparkles, Stethoscope, Building2, TestTube, Star, MapPin,
  IndianRupee, AlertTriangle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { useGeolocation } from "@/hooks/useGeolocation";

const QUICK_SYMPTOMS = ["Fever and body ache", "Chest discomfort", "Persistent cough", "Stomach pain", "Skin rash", "Headache and dizziness"];

const CARE_TYPES = [
  { value: "any", label: "Anything suitable" },
  { value: "doctor", label: "Doctor" },
  { value: "hospital", label: "Hospital" },
  { value: "lab", label: "Lab test" },
];

const URGENCY = [
  { value: "routine", label: "Routine" },
  { value: "soon", label: "Within a few days" },
  { value: "urgent", label: "Urgent" },
];

interface Recommendation {
  id: string;
  type: "doctor" | "hospital" | "lab";
  match_score: number;
  reason: string;
  provider: any;
}

interface MatchResult {
  assessment: string;
  specialization: string;
  emergency: boolean;
  recommendations: Recommendation[];
}

const typeIcon = (type: string) => {
  if (type === "hospital") return <Building2 className="w-4 h-4 text-primary" aria-hidden="true" />;
  if (type === "lab") return <TestTube className="w-4 h-4 text-primary" aria-hidden="true" />;
  return <Stethoscope className="w-4 h-4 text-primary" aria-hidden="true" />;
};

const CareMatch = () => {
  const navigate = useNavigate();
  const { location } = useGeolocation();
  const [symptoms, setSymptoms] = useState("");
  const [careType, setCareType] = useState("any");
  const [urgency, setUrgency] = useState("routine");
  const [budget, setBudget] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);

  const findMatches = async () => {
    if (symptoms.trim().length < 3) { toast.error("Please describe how you are feeling"); return; }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-care-match", {
        body: {
          symptoms,
          preferences: {
            careType,
            urgency,
            budget: budget ? Number(budget) : null,
            maxDistanceKm: maxDistance ? Number(maxDistance) : null,
            notes,
          },
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setResult(data as MatchResult);
      if (!data?.recommendations?.length) toast.info("No close matches found. Try adding more detail.");
    } catch (e) {
      console.error("Care match failed:", e);
      toast.error("Could not find matches right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openProvider = (rec: Recommendation) => {
    if (rec.type === "doctor") navigate(`/doctor/${rec.id}`);
    else if (rec.type === "hospital") navigate(`/hospital/${rec.id}`);
    else navigate(`/lab/${rec.id}`);
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-28">
      <div className="bg-card sticky top-0 z-30 shadow-sm">
        <div className="px-4 safe-top pb-3 app-container flex items-center gap-3">
          <button aria-label="Go back" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" /> Smart Care Finder
            </h1>
            <p className="text-[11px] text-muted-foreground">Describe your symptoms, get matched care</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 max-w-3xl mx-auto space-y-4">
        <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
          <div>
            <label htmlFor="symptoms" className="text-sm font-semibold text-foreground">How are you feeling?</label>
            <Textarea
              id="symptoms"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. Sharp stomach pain with nausea for two days, worse after meals"
              className="mt-2 min-h-[90px] text-sm rounded-xl"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {QUICK_SYMPTOMS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSymptoms(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-foreground hover:bg-muted/70 min-h-[32px]"
                >{s}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-2">What kind of care do you want?</p>
            <div className="flex flex-wrap gap-2">
              {CARE_TYPES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCareType(c.value)}
                  aria-pressed={careType === c.value}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] transition-all ${
                    careType === c.value ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"
                  }`}
                >{c.label}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-2">How soon do you need it?</p>
            <div className="flex flex-wrap gap-2">
              {URGENCY.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => setUrgency(u.value)}
                  aria-pressed={urgency === u.value}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] transition-all ${
                    urgency === u.value ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"
                  }`}
                >{u.label}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="budget" className="text-xs font-medium text-muted-foreground">Budget (₹)</label>
              <Input id="budget" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 500" className="mt-1 h-10 rounded-xl text-sm" />
            </div>
            <div>
              <label htmlFor="distance" className="text-xs font-medium text-muted-foreground">Max distance (km)</label>
              <Input id="distance" inputMode="numeric" value={maxDistance} onChange={(e) => setMaxDistance(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 10" className="mt-1 h-10 rounded-xl text-sm" />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="text-xs font-medium text-muted-foreground">Anything else? (optional)</label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. prefer a female doctor, home sample collection" className="mt-1 h-10 rounded-xl text-sm" />
          </div>

          <Button onClick={findMatches} disabled={loading} className="w-full h-11 rounded-xl font-semibold">
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> Finding the best care…</>) : (<><Sparkles className="w-4 h-4 mr-2" aria-hidden="true" /> Find my care match</>)}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            ⚕️ Guidance only, not a medical diagnosis. Always consult a qualified doctor.
          </p>
        </div>

        {result && (
          <div className="space-y-3">
            {result.emergency && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-destructive">This may need emergency care</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Call 112 or open emergency help straight away.</p>
                  <Button size="sm" variant="destructive" className="mt-2 h-9 rounded-lg" onClick={() => navigate("/emergency")}>Open emergency help</Button>
                </div>
              </div>
            )}

            {result.assessment && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm text-foreground">{result.assessment}</p>
                {result.specialization && (
                  <p className="text-xs text-muted-foreground mt-1">Suggested specialisation: <span className="font-semibold text-foreground">{result.specialization}</span></p>
                )}
              </div>
            )}

            {result.recommendations.map((rec, idx) => (
              <motion.button
                key={`${rec.type}-${rec.id}`}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => openProvider(rec)}
                className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {typeIcon(rec.type)}
                    <div>
                      <p className="font-semibold text-foreground text-sm">{rec.provider?.name}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {rec.provider?.specialization || rec.provider?.location || rec.type}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold">
                    {rec.match_score}% match
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{rec.reason}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                  {rec.provider?.rating != null && (
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" aria-hidden="true" />{Number(rec.provider.rating).toFixed(1)}</span>
                  )}
                  {rec.provider?.consultation_fee != null && (
                    <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" aria-hidden="true" />{rec.provider.consultation_fee}</span>
                  )}
                  {rec.provider?.distance_km != null && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" aria-hidden="true" />{rec.provider.distance_km} km</span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default CareMatch;
