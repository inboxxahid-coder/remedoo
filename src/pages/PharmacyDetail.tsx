import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Search, MapPin, Clock, ShoppingCart, Plus, Minus, Pill, Navigation, BadgeCheck, Percent, Heart, Share2, X, ChevronRight } from "lucide-react";
import { withAuthGuard } from "@/hooks/useRequireAuth";
import MedicineDetailSheet from "@/components/patient/MedicineDetailSheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export type CartItem = {
  medicine: Tables<"medicines">;
  quantity: number;
};

const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    "Antibiotics": "💊", "Pain Relief": "🩹", "Vitamins": "🌿", "Cardiac": "❤️",
    "Diabetes": "🩸", "Respiratory": "🫁", "Digestive": "🧬", "Skin Care": "✨",
    "Eye Care": "👁️", "General": "💊",
  };
  return icons[category] || "💊";
};

const PharmacyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pharmacy, setPharmacy] = useState<Tables<"pharmacies"> | null>(null);
  const [medicines, setMedicines] = useState<Tables<"medicines">[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMedicine, setSelectedMedicine] = useState<Tables<"medicines"> | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [pRes, mRes] = await Promise.all([
        supabase.from("pharmacies").select("*").eq("id", id!).single(),
        supabase.from("medicines").select("*").eq("pharmacy_id", id!).eq("in_stock", true),
      ]);
      if (pRes.data) setPharmacy(pRes.data);
      if (mRes.data) setMedicines(mRes.data);
      setLoading(false);
    };
    load();
  }, [id]);

  const categories = useMemo(() => {
    const cats = new Set(medicines.map((m) => m.category));
    return ["All", ...Array.from(cats).sort()];
  }, [medicines]);

  const filtered = useMemo(() => {
    return medicines.filter((m) => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || (m.generic_name?.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = selectedCategory === "All" || m.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [medicines, search, selectedCategory]);

  const offersCount = useMemo(() => medicines.filter(m => (m.discount_percent || 0) > 0).length, [medicines]);

  const addToCart = (medicine: Tables<"medicines">) => {
    if (medicine.requires_prescription) {
      toast.info("This medicine requires a prescription. You can upload it at checkout.");
    }
    setCart((prev) => {
      const existing = prev[medicine.id];
      return { ...prev, [medicine.id]: { medicine, quantity: (existing?.quantity || 0) + 1 } };
    });
  };

  const removeFromCart = (medicineId: string) => {
    setCart((prev) => {
      const existing = prev[medicineId];
      if (!existing || existing.quantity <= 1) {
        const next = { ...prev };
        delete next[medicineId];
        return next;
      }
      return { ...prev, [medicineId]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((sum, item) => {
    const discounted = item.medicine.price * (1 - (item.medicine.discount_percent || 0) / 100);
    return sum + discounted * item.quantity;
  }, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const getDiscountedPrice = (m: Tables<"medicines">) => m.price * (1 - (m.discount_percent || 0) / 100);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!pharmacy) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Pharmacy not found</div>;

  return (
    <div className="min-h-screen bg-muted/30 pb-28">
      {/* Swiggy-style hero header */}
      <div className="relative">
        {/* Hero image */}
        <div className="h-48 bg-gradient-to-br from-primary/20 via-accent/40 to-primary/10 relative overflow-hidden">
          {pharmacy.image_url ? (
            <img loading="lazy" decoding="async" src={pharmacy.image_url} alt={pharmacy.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-7xl opacity-30">🏥</span>
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
            <button onClick={() => setShowSearch(!showSearch)} className="w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
              <Search className="w-4 h-4 text-foreground" />
            </button>
            <button aria-label="Toggle favourite" className="w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-sm"><Heart className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* Pharmacy info card overlapping hero */}
        <div className="mx-4 -mt-12 relative z-10 bg-card rounded-2xl border border-border p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate flex items-center gap-1.5">
                {pharmacy.name}
                {pharmacy.approval_status === "approved" && <BadgeCheck className="w-5 h-5 text-primary shrink-0" />}
              </h1>
              {pharmacy.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-primary shrink-0" /> {pharmacy.location}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 25-35 min</span>
                <span>•</span>
                <span>{medicines.length} items</span>
                {offersCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-primary font-semibold flex items-center gap-1"><Percent className="w-3 h-3" />{offersCount} offers</span>
                  </>
                )}
              </div>
            </div>
            {/* Rating */}
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold text-white shrink-0 ${(pharmacy.rating || 0) >= 4 ? "bg-emerald-600" : "bg-amber-500"}`}>
              <Star className="w-3.5 h-3.5 fill-current" />
              {pharmacy.rating || "—"}
            </div>
          </div>

          {/* Get directions link */}
          {(pharmacy.latitude && pharmacy.longitude || pharmacy.location) && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude && pharmacy.longitude ? `${pharmacy.latitude},${pharmacy.longitude}` : encodeURIComponent(pharmacy.location || '')}`}
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
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 overflow-hidden"
          >
            <div className="relative mt-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search medicines in this pharmacy..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-9 bg-card border-border h-11 rounded-xl text-sm"
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
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
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                selectedCategory === cat
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
              <p className="text-[11px] text-muted-foreground">Discounts on selected medicines</p>
            </div>
          </div>
        </div>
      )}

      {/* Medicine catalogue */}
      <div className="px-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Pill className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No medicines found</p>
            <p className="text-xs mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((m, idx) => {
              const inCart = cart[m.id];
              const discountedPrice = getDiscountedPrice(m);
              const hasDiscount = (m.discount_percent || 0) > 0;

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => setSelectedMedicine(m)}
                  className="bg-card rounded-xl border border-border p-3 flex gap-3 cursor-pointer hover:shadow-md transition-shadow group"
                >
                  {/* Medicine image */}
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-accent/60 to-accent/20 flex items-center justify-center overflow-hidden shrink-0 relative">
                    {m.image_url ? (
                      <img loading="lazy" decoding="async" src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{getCategoryIcon(m.category)}</span>
                    )}
                    {hasDiscount && (
                      <div className="absolute top-1 left-1">
                        <Badge className="bg-primary text-primary-foreground text-[8px] font-bold px-1 py-0 rounded-md">
                          {m.discount_percent}% OFF
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">{m.name}</h3>
                        {m.requires_prescription && (
                          <Badge variant="outline" className="text-[8px] border-primary text-primary px-1 py-0 rounded-md shrink-0">
                            Rx
                          </Badge>
                        )}
                      </div>
                      {m.brand_name && <p className="text-[11px] text-primary font-medium mt-0.5">{m.brand_name}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">{m.unit} {m.manufacturer && `• ${m.manufacturer}`}</p>
                    </div>

                    {/* Price + Cart */}
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-foreground text-sm">₹{discountedPrice.toFixed(0)}</span>
                        {hasDiscount && (
                          <span className="text-[11px] text-muted-foreground line-through">₹{m.price}</span>
                        )}
                      </div>

                      {inCart ? (
                        <div className="flex items-center bg-primary rounded-lg overflow-hidden h-8" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => removeFromCart(m.id)} className="px-2.5 h-full flex items-center text-primary-foreground hover:bg-primary/80 transition-colors">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-primary-foreground px-1 min-w-[20px] text-center">{inCart.quantity}</span>
                          <button onClick={() => addToCart(m)} className="px-2.5 h-full flex items-center text-primary-foreground hover:bg-primary/80 transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); addToCart(m); }}
                          className="h-8 rounded-lg text-xs font-bold border-primary text-primary hover:bg-primary hover:text-primary-foreground px-4"
                        >
                          ADD
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Location Map */}
      {(pharmacy.latitude && pharmacy.longitude || pharmacy.location) && (
        <div className="px-4 mt-6">
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm">
              <Navigation className="w-4 h-4 text-primary" /> Location
            </h3>
            {pharmacy.latitude && pharmacy.longitude && (
              <div className="rounded-xl overflow-hidden border border-border h-40">
                <iframe
                  title="Pharmacy Location"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${pharmacy.longitude - 0.01},${pharmacy.latitude - 0.01},${pharmacy.longitude + 0.01},${pharmacy.latitude + 0.01}&layer=mapnik&marker=${pharmacy.latitude},${pharmacy.longitude}`}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Medicine Detail Sheet */}
      <MedicineDetailSheet
        medicine={selectedMedicine}
        open={!!selectedMedicine}
        onClose={() => setSelectedMedicine(null)}
        cartQty={selectedMedicine ? (cart[selectedMedicine.id]?.quantity || 0) : 0}
        onAdd={addToCart}
        onRemove={removeFromCart}
      />

      {/* Floating cart bar — Swiggy style */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-4 safe-bottom z-50 [&>*]:max-w-3xl [&>*]:mx-auto"
          >
            <button
              onClick={() => navigate("/cart", { state: { cart, pharmacy } })}
              className="w-full bg-primary text-primary-foreground rounded-2xl p-4 flex items-center justify-between shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary-foreground text-primary text-[9px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                </div>
                <div className="text-left">
                  <span className="font-bold text-sm">{cartCount} {cartCount === 1 ? "item" : "items"} • ₹{cartTotal.toFixed(0)}</span>
                  <p className="text-[10px] text-primary-foreground/70">{pharmacy.name}</p>
                </div>
              </div>
              <span className="font-bold text-sm flex items-center gap-1">
                View Cart <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default withAuthGuard(PharmacyDetail);
