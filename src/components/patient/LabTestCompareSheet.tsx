import { useState, useEffect } from "react";
import { X, ArrowRight, FlaskConical, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface Props {
  test: Tables<"lab_tests"> | null;
  open: boolean;
  onClose: () => void;
}

type TestWithLab = Tables<"lab_tests"> & { labs?: { id: string; name: string; location: string | null; rating: number | null } | null };

export default function LabTestCompareSheet({ test, open, onClose }: Props) {
  const navigate = useNavigate();
  const [results, setResults] = useState<TestWithLab[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!test || !open) return;
    const search = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("lab_tests")
        .select("*, labs(id, name, location, rating)")
        .ilike("name", `%${test.name}%`)
        .neq("id", test.id)
        .order("price", { ascending: true })
        .limit(20);
      setResults((data as TestWithLab[]) || []);
      setLoading(false);
    };
    search();
  }, [test, open]);

  if (!test) return null;

  const currentPrice = test.price * (1 - (test.discount_percent || 0) / 100);

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
            <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full bg-accent">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="px-5 pt-2 pb-6">
              <h3 className="text-base font-bold text-foreground">Compare Lab Prices</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {test.name} — Current: ₹{currentPrice.toFixed(0)}
              </p>

              {loading ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Searching across labs...</div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No other labs found for this test</div>
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
                          navigate(`/lab/${r.lab_id}`);
                        }}
                        className="w-full text-left bg-accent/30 rounded-xl p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                          <FlaskConical className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{r.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {(r.labs as any)?.name || "Unknown Lab"}
                            {(r.labs as any)?.location && ` • ${(r.labs as any).location}`}
                          </p>
                          {r.turnaround_time && <p className="text-[9px] text-muted-foreground">Results: {r.turnaround_time}</p>}
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
