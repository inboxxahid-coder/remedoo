import { X, Pill, Plus, Minus, ShieldCheck, Factory, Calendar, Hash, Package, FileText, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  medicine: Tables<"medicines"> | null;
  open: boolean;
  onClose: () => void;
  cartQty: number;
  onAdd: (m: Tables<"medicines">) => void;
  onRemove: (id: string) => void;
}

const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    Antibiotics: "💊", "Pain Relief": "🩹", Vitamins: "🌿", Cardiac: "❤️",
    Diabetes: "🩸", Respiratory: "🫁", Digestive: "🧬", "Skin Care": "✨",
    "Eye Care": "👁️", General: "💊",
  };
  return icons[category] || "💊";
};

export default function MedicineDetailSheet({ medicine: m, open, onClose, cartQty, onAdd, onRemove }: Props) {
  if (!m) return null;

  const discountedPrice = m.price * (1 - (m.discount_percent || 0) / 100);
  const hasDiscount = (m.discount_percent || 0) > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[85vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Close */}
            <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full bg-accent">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Image / Visual */}
            <div className="h-44 bg-gradient-to-br from-accent/60 to-accent/20 flex items-center justify-center relative mx-4 rounded-2xl mt-2 overflow-hidden">
              {m.image_url ? (
                <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl">{getCategoryIcon(m.category)}</span>
              )}
              {hasDiscount && (
                <Badge className="absolute top-3 left-3 bg-success text-success-foreground text-xs font-bold px-2 py-0.5 rounded-lg shadow">
                  {m.discount_percent}% OFF
                </Badge>
              )}
              {m.requires_prescription && (
                <Badge variant="outline" className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm border-primary text-primary text-xs px-2 py-0.5 rounded-lg">
                  Rx Required
                </Badge>
              )}
            </div>

            {/* Content */}
            <div className="px-5 pt-4 pb-6 space-y-4">
              {/* Brand & Generic */}
              <div>
                <h2 className="text-lg font-bold text-foreground leading-tight">{m.name}</h2>
                {m.generic_name && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    {m.generic_name}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">₹{discountedPrice.toFixed(0)}</span>
                {hasDiscount && (
                  <span className="text-sm text-muted-foreground line-through">₹{m.price}</span>
                )}
                <Badge variant={m.in_stock ? "default" : "destructive"} className="ml-auto text-xs">
                  {m.in_stock ? `In Stock${m.stock_quantity != null ? ` (${m.stock_quantity})` : ""}` : "Out of Stock"}
                </Badge>
              </div>

              {/* Description */}
              {m.description && (
                <div className="bg-accent/40 rounded-xl p-3">
                  <p className="text-xs text-foreground/80 leading-relaxed">{m.description}</p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <DetailItem icon={Package} label="Category" value={m.category} />
                <DetailItem icon={FileText} label="Unit" value={m.unit || "N/A"} />
                {m.manufacturer && <DetailItem icon={Factory} label="Manufacturer" value={m.manufacturer} />}
                {m.batch_number && <DetailItem icon={Hash} label="Batch No." value={m.batch_number} />}
                {m.expiry_date && (
                  <DetailItem
                    icon={Calendar}
                    label="Expiry Date"
                    value={new Date(m.expiry_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  />
                )}
                {m.requires_prescription && (
                  <DetailItem icon={ShieldCheck} label="Prescription" value="Required" />
                )}
              </div>

              {/* Add to cart */}
              <div className="pt-2">
                {cartQty > 0 ? (
                  <div className="flex items-center justify-between bg-primary/10 rounded-2xl p-2">
                    <button onClick={() => onRemove(m.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/20 text-primary">
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="text-lg font-bold text-primary">{cartQty}</span>
                    <button onClick={() => onAdd(m)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <Button onClick={() => onAdd(m)} className="w-full h-12 rounded-2xl text-sm font-bold" disabled={!m.in_stock}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    {m.in_stock ? "Add to Cart" : "Out of Stock"}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: typeof Pill; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 bg-accent/30 rounded-xl p-2.5">
      <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
