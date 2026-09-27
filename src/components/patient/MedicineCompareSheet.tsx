import { useState, useEffect } from "react";
import { X, ArrowRight, Store, TrendingDown, TrendingUp, Minus as TrendNeutral } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface Props {
  medicine: Tables<"medicines"> | null;
  open: boolean;
  onClose: () => void;
}

type MedicineWithPharmacy = Tables<"medicines"> & { pharmacies?: { id: string; name: string; location: string | null; rating: number | null } | null };

export default function MedicineCompareSheet({ medicine, open, onClose }: Props) {
  const navigate = useNavigate();
  const [results, setResults] = useState<MedicineWithPharmacy[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!medicine || !open) return;
    const search = async () => {
      setLoading(true);
      // Search by name or generic_name across all pharmacies
      let query = supabase
        .from("medicines")
        .select("*, pharmacies(id, name, location, rating)")
        .eq("in_stock", true)
        .neq("id", medicine.id);

      if (medicine.generic_name) {
        query = query.ilike("generic_name", `%${medicine.generic_name}%`);
      } else {
        query = query.ilike("name", `%${medicine.name}%`);
      }

      const { data } = await query.order("price", { ascending: true }).limit(20);
      setResults((data as MedicineWithPharmacy[]) || []);
      setLoading(false);
    };
    search();
  }, [medicine, open]);

  if (!medicine) return null;

  const currentPrice = medicine.price * (1 - (medicine.discount_percent || 0) / 100);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-card rounded-t-3xl max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <button aria-label="Clear" onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full bg-accent"><X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="px-5 pt-2 pb-6">
              <h3 className="text-base font-bold text-foreground">Compare Prices</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {medicine.generic_name || medicine.name} — Current: ₹{currentPrice.toFixed(0)}
              </p>

              {loading ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Searching across pharmacies...</div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No alternatives found at other pharmacies</div>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {results.map((r) => {
                    const rPrice = r.price * (1 - (r.discount_percent || 0) / 100);
                    const diff = rPrice - currentPrice;
                    const isCheaper = diff < 0;
                    const isSame = Math.abs(diff) < 1;

                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          onClose();
                          navigate(`/pharmacy/${r.pharmacy_id}`);
                        }}
                        className="w-full text-left bg-accent/30 rounded-xl p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                          <Store className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{r.name}</p>
                          {r.brand_name && <p className="text-[10px] text-primary truncate">{r.brand_name}</p>}
                          <p className="text-[10px] text-muted-foreground truncate">
                            {(r.pharmacies as any)?.name || "Unknown Pharmacy"}
                            {(r.pharmacies as any)?.location && ` • ${(r.pharmacies as any).location}`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-foreground">₹{rPrice.toFixed(0)}</p>
                          {!isSame && (
                            <Badge className={`text-[9px] px-1.5 py-0 ${isCheaper ? "bg-success/15 text-success border-0" : "bg-destructive/15 text-destructive border-0"}`}>
                              {isCheaper ? <TrendingDown className="w-2.5 h-2.5 mr-0.5" /> : <TrendingUp className="w-2.5 h-2.5 mr-0.5" />}
                              ₹{Math.abs(diff).toFixed(0)} {isCheaper ? "less" : "more"}
                            </Badge>
                          )}
                          {isSame && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-muted text-muted-foreground border-0">Same</Badge>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
