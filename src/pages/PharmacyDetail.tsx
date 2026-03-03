import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Search, MapPin, Clock, ShoppingCart, Plus, Minus, FileText, Pill, Package, Info, Navigation } from "lucide-react";
import { withAuthGuard } from "@/hooks/useRequireAuth";
import MedicineDetailSheet from "@/components/patient/MedicineDetailSheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type CartItem = {
  medicine: Tables<"medicines">;
  quantity: number;
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

  const getDiscountedPrice = (m: Tables<"medicines">) => {
    return m.price * (1 - (m.discount_percent || 0) / 100);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      "Antibiotics": "💊",
      "Pain Relief": "🩹",
      "Vitamins": "🌿",
      "Cardiac": "❤️",
      "Diabetes": "🩸",
      "Respiratory": "🫁",
      "Digestive": "🧬",
      "Skin Care": "✨",
      "Eye Care": "👁️",
      "General": "💊",
    };
    return icons[category] || "💊";
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!pharmacy) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Pharmacy not found</div>;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-primary-foreground truncate">{pharmacy.name}</h1>
            {pharmacy.location && <p className="text-primary-foreground/70 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />{pharmacy.location}</p>}
          </div>
          <div className="flex items-center gap-1 bg-primary-foreground/20 rounded-lg px-2 py-1">
            <Star className="w-3.5 h-3.5 fill-warning text-warning" />
            <span className="text-primary-foreground text-xs font-semibold">{pharmacy.rating}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-primary-foreground/70 text-xs mb-3">
          <Clock className="w-3 h-3" /><span>Delivery in 25-35 min</span>
          <span className="mx-1">•</span>
          <span>{medicines.length} items available</span>
          {(pharmacy.latitude && pharmacy.longitude || pharmacy.location) && (
            <>
              <span className="mx-1">•</span>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude && pharmacy.longitude ? `${pharmacy.latitude},${pharmacy.longitude}` : encodeURIComponent(pharmacy.location || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary-foreground hover:text-primary-foreground/90 transition-colors"
              >
                <Navigation className="w-3 h-3" /> Directions
              </a>
            </>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search medicines..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-0 shadow-lg h-11 rounded-xl" />
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-5 mt-4 mb-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card text-muted-foreground border border-border hover:border-primary/30"
              }`}
            >
              {cat !== "All" && <span className="text-sm">{getCategoryIcon(cat)}</span>}
              {cat === "All" && <Package className="w-3.5 h-3.5" />}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalogue Grid */}
      <div className="px-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Pill className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No medicines found</p>
            <p className="text-xs mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {filtered.map((m) => {
              const inCart = cart[m.id];
              const discountedPrice = getDiscountedPrice(m);
              const hasDiscount = (m.discount_percent || 0) > 0;

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMedicine(m)}
                  className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group cursor-pointer"
                >
                  {/* Discount ribbon */}
                  {hasDiscount && (
                    <div className="absolute top-1 left-1 z-10">
                      <Badge className="bg-success text-success-foreground text-[8px] font-bold px-1 py-0 rounded-md shadow-sm">
                        {m.discount_percent}%
                      </Badge>
                    </div>
                  )}

                  {/* Rx badge */}
                  {m.requires_prescription && (
                    <div className="absolute top-1 right-1 z-10">
                      <Badge variant="outline" className="bg-card/90 backdrop-blur-sm text-[8px] border-primary text-primary px-1 py-0 rounded-md">
                        Rx
                      </Badge>
                    </div>
                  )}

                  {/* Medicine visual area */}
                  <div className="h-20 bg-gradient-to-br from-accent/60 to-accent/20 flex items-center justify-center relative overflow-hidden">
                    {m.image_url ? (
                      <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-2xl">{getCategoryIcon(m.category)}</span>
                        <span className="text-[8px] text-accent-foreground/50 font-medium">{m.category}</span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-2 space-y-1">
                    <h3 className="font-semibold text-foreground text-[10px] leading-tight line-clamp-2 min-h-[1.5rem]">{m.name}</h3>
                    {m.brand_name && (
                      <p className="text-[9px] text-primary font-medium truncate">{m.brand_name}</p>
                    )}
                    {m.generic_name && (
                      <p className="text-[8px] text-muted-foreground truncate">{m.generic_name}</p>
                    )}
                    <p className="text-[8px] text-muted-foreground">{m.unit} {m.manufacturer && `• ${m.manufacturer}`}</p>

                    {/* Price */}
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-foreground text-xs">₹{discountedPrice.toFixed(0)}</span>
                      {hasDiscount && (
                        <span className="text-[8px] text-muted-foreground line-through">₹{m.price}</span>
                      )}
                    </div>

                    {/* Add / Quantity control */}
                    <div className="pt-0.5">
                      {inCart ? (
                        <div className="flex items-center justify-between bg-primary/10 rounded-lg h-6">
                          <button onClick={() => removeFromCart(m.id)} className="px-2 h-full flex items-center text-primary hover:bg-primary/20 rounded-l-lg transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] font-bold text-primary">{inCart.quantity}</span>
                          <button onClick={() => addToCart(m)} className="px-2 h-full flex items-center text-primary hover:bg-primary/20 rounded-r-lg transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => addToCart(m)}
                          className="w-full h-6 rounded-lg text-[10px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Plus className="w-2.5 h-2.5 mr-0.5" />Add
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Medicine Detail Sheet */}
      <MedicineDetailSheet
        medicine={selectedMedicine}
        open={!!selectedMedicine}
        onClose={() => setSelectedMedicine(null)}
        cartQty={selectedMedicine ? (cart[selectedMedicine.id]?.quantity || 0) : 0}
        onAdd={addToCart}
        onRemove={removeFromCart}
      />

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 safe-bottom z-50">
          <button
            onClick={() => navigate("/cart", { state: { cart, pharmacy } })}
            className="w-full gradient-primary text-primary-foreground rounded-2xl p-4 flex items-center justify-between shadow-xl"
          >
            <div className="flex items-center gap-2">
              <div className="bg-primary-foreground/20 rounded-lg p-1.5">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="font-bold text-sm">{cartCount} {cartCount === 1 ? "item" : "items"}</span>
                <p className="text-xs text-primary-foreground/70">{pharmacy.name}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold">₹{cartTotal.toFixed(0)}</span>
              <p className="text-xs text-primary-foreground/70">View Cart →</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default withAuthGuard(PharmacyDetail);
