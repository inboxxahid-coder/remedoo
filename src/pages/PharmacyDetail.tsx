import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Search, MapPin, Clock, ShoppingCart, Plus, Minus, FileText, Filter } from "lucide-react";
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

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!pharmacy) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Pharmacy not found</div>;

  return (
    <div className="min-h-screen bg-background pb-24">
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
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search medicines..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-0 shadow-lg h-11 rounded-xl" />
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-5 mt-4 mb-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Medicines list */}
      <div className="px-5 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No medicines found</div>
        ) : (
          filtered.map((m) => {
            const inCart = cart[m.id];
            const discountedPrice = getDiscountedPrice(m);
            return (
              <div key={m.id} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center text-2xl flex-shrink-0">
                    {m.requires_prescription ? "📋" : "💊"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate">{m.name}</h3>
                        {m.generic_name && <p className="text-xs text-muted-foreground">{m.generic_name}</p>}
                      </div>
                      {m.requires_prescription && (
                        <Badge variant="outline" className="text-[10px] shrink-0 border-primary text-primary">
                          <FileText className="w-2.5 h-2.5 mr-0.5" />Rx
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.unit}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">₹{discountedPrice.toFixed(0)}</span>
                        {(m.discount_percent || 0) > 0 && (
                          <>
                            <span className="text-xs text-muted-foreground line-through">₹{m.price}</span>
                            <span className="text-xs font-medium text-success">{m.discount_percent}% off</span>
                          </>
                        )}
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-1">
                          <button onClick={() => removeFromCart(m.id)} className="p-1.5 rounded-lg text-primary hover:bg-primary/20 transition-colors">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-semibold text-primary w-5 text-center">{inCart.quantity}</span>
                          <button onClick={() => addToCart(m)} className="p-1.5 rounded-lg text-primary hover:bg-primary/20 transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => addToCart(m)} className="h-8 rounded-xl border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs">
                          <Plus className="w-3 h-3 mr-1" />Add
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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

export default PharmacyDetail;
