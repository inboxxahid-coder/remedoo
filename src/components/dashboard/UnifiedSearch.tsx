import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Stethoscope, Building2, FlaskConical, Store, Pill, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  id: string;
  name: string;
  subtitle: string;
  type: "doctor" | "hospital" | "lab" | "pharmacy" | "medicine";
  extra?: string;
  price?: number;
  discount?: number;
  rating?: number;
}

const typeConfig = {
  doctor: { icon: Stethoscope, label: "Doctor", path: (id: string) => `/doctor/${id}` },
  hospital: { icon: Building2, label: "Hospital", path: (id: string) => `/hospital/${id}` },
  lab: { icon: FlaskConical, label: "Lab", path: (id: string) => `/lab/${id}` },
  pharmacy: { icon: Store, label: "Pharmacy", path: (id: string) => `/pharmacy/${id}` },
  medicine: { icon: Pill, label: "Medicine", path: (_id: string, extra?: string) => extra ? `/pharmacy/${extra}` : "/pharmacies" },
};

const UnifiedSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    const pattern = `%${term}%`;

    const fetchAll = async () => {
      const [doctors, hospitals, labs, pharmacies, medicines] = await Promise.all([
        supabase.from("doctors_public").select("id, name, specialization, rating").ilike("name", pattern).order("rating", { ascending: false }).limit(5),
        supabase.from("hospitals_public").select("id, name, location, rating").ilike("name", pattern).order("rating", { ascending: false }).limit(5),
        supabase.from("labs_public").select("id, name, location, rating").ilike("name", pattern).order("rating", { ascending: false }).limit(5),
        supabase.from("pharmacies_public").select("id, name, location").ilike("name", pattern).limit(5),
        supabase.from("medicines").select("id, name, generic_name, category, pharmacy_id, price, discount_percent").ilike("name", pattern).eq("in_stock", true).order("price", { ascending: true }).limit(8),
      ]);

      const mapped: SearchResult[] = [
        ...(doctors.data?.map((d) => ({ id: d.id, name: d.name, subtitle: d.specialization || "Doctor", type: "doctor" as const, rating: d.rating })) || []),
        ...(hospitals.data?.map((h) => ({ id: h.id, name: h.name, subtitle: h.location || "Hospital", type: "hospital" as const, rating: h.rating })) || []),
        ...(labs.data?.map((l) => ({ id: l.id, name: l.name, subtitle: l.location || "Lab", type: "lab" as const, rating: l.rating })) || []),
        ...(pharmacies.data?.map((p) => ({ id: p.id, name: p.name, subtitle: p.location || "Pharmacy", type: "pharmacy" as const })) || []),
        ...(medicines.data?.map((m) => ({
          id: m.id,
          name: m.name,
          subtitle: m.generic_name || m.category || "Medicine",
          type: "medicine" as const,
          extra: m.pharmacy_id,
          price: m.price,
          discount: m.discount_percent,
        })) || []),
      ];

      setResults(mapped);
      setOpen(mapped.length > 0);
      setLoading(false);
    };

    const debounce = setTimeout(fetchAll, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (r: SearchResult) => {
    setOpen(false);
    setQuery("");
    const cfg = typeConfig[r.type];
    if (r.type === "medicine" && r.extra) {
      navigate(`/pharmacy/${r.extra}`);
    } else {
      navigate(cfg.path(r.id));
    }
  };

  const formatPrice = (price: number, discount?: number) => {
    if (discount && discount > 0) {
      const discounted = price - (price * discount / 100);
      return (
        <span className="flex items-center gap-1.5">
          <span className="font-bold text-primary text-xs">₹{discounted.toFixed(0)}</span>
          <span className="text-[10px] text-muted-foreground line-through">₹{price}</span>
          <span className="text-[10px] font-semibold text-emerald-600">{discount}% off</span>
        </span>
      );
    }
    return <span className="font-bold text-primary text-xs">₹{price}</span>;
  };

  return (
    <div ref={containerRef} className="relative z-20">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
      <Input
        placeholder="Search doctors, hospitals, labs, medicines..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        className="pl-11 pr-9 bg-white/20 border border-white/30 shadow-sm h-11 rounded-xl text-sm text-white placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-white/40"
      />
      {query && (
        <button aria-label="Clear search" onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-2 left-0 right-0 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden max-h-80 overflow-y-auto"
          >
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Searching…</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No results found</div>
            ) : (
              results.map((r) => {
                const cfg = typeConfig[r.type];
                const Icon = cfg.icon;
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => handleSelect(r)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.subtitle} · {cfg.label}</p>
                    </div>
                    {r.type === "medicine" && r.price != null && (
                      <div className="flex-shrink-0 text-right">
                        {formatPrice(r.price, r.discount)}
                      </div>
                    )}
                    {r.rating != null && r.rating > 0 && r.type !== "medicine" && (
                      <div className="flex-shrink-0 flex items-center gap-0.5 bg-emerald-500/10 text-emerald-600 text-[11px] font-bold px-1.5 py-0.5 rounded-md">
                        ★ {Number(r.rating).toFixed(1)}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnifiedSearch;
