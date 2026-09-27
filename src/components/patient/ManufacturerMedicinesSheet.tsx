import { useState, useEffect } from "react";
import { X, Factory, ArrowRight, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface Props {
  manufacturer: string | null;
  open: boolean;
  onClose: () => void;
}

type MedicineWithPharmacy = Tables<"medicines"> & { pharmacies?: { id: string; name: string } | null };

export default function ManufacturerMedicinesSheet({ manufacturer, open, onClose }: Props) {
  const navigate = useNavigate();
  const [results, setResults] = useState<MedicineWithPharmacy[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!manufacturer || !open) return;
    const search = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("medicines")
        .select("*, pharmacies(id, name)")
        .ilike("manufacturer", `%${manufacturer}%`)
        .eq("in_stock", true)
        .order("name")
        .limit(50);
      setResults((data as MedicineWithPharmacy[]) || []);
      setLoading(false);
    };
    search();
  }, [manufacturer, open]);

  if (!manufacturer) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-card rounded-t-3xl max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-border" /></div>
            <button aria-label="Clear" onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full bg-accent"><X className="w-4 h-4 text-muted-foreground" /></button>

            <div className="px-5 pt-2 pb-6">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">{manufacturer}</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">All medicines from this manufacturer</p>

              {loading ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Loading...</div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No medicines found</div>
              ) : (
                <div className="mt-4 space-y-2">
                  {results.map((r) => {
                    const discounted = r.price * (1 - (r.discount_percent || 0) / 100);
                    return (
                      <button
                        key={r.id}
                        onClick={() => { onClose(); navigate(`/pharmacy/${r.pharmacy_id}`); }}
                        className="w-full text-left bg-accent/30 rounded-xl p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{r.name}</p>
                          {r.brand_name && <p className="text-[10px] text-primary truncate">{r.brand_name}</p>}
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Store className="w-3 h-3" />{(r.pharmacies as any)?.name || "Pharmacy"}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-foreground">₹{discounted.toFixed(0)}</p>
                          {(r.discount_percent || 0) > 0 && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-success/15 text-success border-0">{r.discount_percent}% off</Badge>
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
