import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ShoppingCart, Plus, Minus, Pill, X, Upload, BadgeCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import MedicalLoader from "@/components/ui/MedicalLoader";
import { motion } from "framer-motion";

interface RemedooItem {
  id: string;
  name: string;
  generic_name: string | null;
  category: string;
  price: number;
  mrp: number | null;
  stock_quantity: number;
  requires_prescription: boolean;
  discount_percent: number | null;
  image_url: string | null;
  description: string | null;
}

interface CartEntry { item: RemedooItem; quantity: number; }

const RemedooPharmacyPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<RemedooItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    supabase.from("remedoo_pharmacy_inventory").select("*").eq("is_active", true).order("name")
      .then(({ data }) => { setItems((data as any[]) || []); setLoading(false); });
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    return ["All", ...Array.from(cats).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    let res = items;
    if (selectedCategory !== "All") res = res.filter(i => i.category === selectedCategory);
    if (search) res = res.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    return res;
  }, [items, search, selectedCategory]);

  const addToCart = (item: RemedooItem) => {
    setCart(prev => {
      const existing = prev[item.id];
      if (existing && existing.quantity >= item.stock_quantity) { toast.error("Max stock reached"); return prev; }
      return { ...prev, [item.id]: { item, quantity: (existing?.quantity || 0) + 1 } };
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const existing = prev[id];
      if (!existing || existing.quantity <= 1) { const n = { ...prev }; delete n[id]; return n; }
      return { ...prev, [id]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const cartCount = Object.values(cart).reduce((a, b) => a + b.quantity, 0);
  const cartTotal = Object.values(cart).reduce((a, b) => a + b.item.price * b.quantity, 0);
  const hasRx = Object.values(cart).some(c => c.item.requires_prescription);

  const goToCheckout = () => {
    if (cartCount === 0) { toast.error("Cart is empty"); return; }
    navigate("/remedoo-checkout", { state: { cart, hasRx } });
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-32">
      {/* Header */}
      <div className="bg-card sticky top-0 z-30 shadow-sm">
        <div className="px-4 safe-top pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                Remedoo Pharmacy <BadgeCheck className="w-4 h-4 text-primary" />
              </h1>
              <p className="text-[11px] text-muted-foreground">Medicines delivered to your door</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search medicines..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 bg-muted/50 border-border h-11 rounded-xl text-sm"
            />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
          </div>
        </div>
        {/* Categories */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                  selectedCategory === c ? "bg-foreground text-background" : "bg-card border border-border text-foreground"
                }`}
              >{c}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Medicines Grid */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {loading ? <div className="col-span-2"><MedicalLoader text="Loading medicines..." /></div> :
          filtered.length === 0 ? (
            <div className="col-span-2 text-center py-16">
              <Pill className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">No medicines found</p>
            </div>
          ) : filtered.map((item, idx) => {
            const inCart = cart[item.id]?.quantity || 0;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-card rounded-xl border border-border p-3 flex flex-col"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                    {item.generic_name && <p className="text-[10px] text-muted-foreground truncate">{item.generic_name}</p>}
                  </div>
                  {item.requires_prescription && <Badge variant="outline" className="text-[9px] shrink-0 ml-1">Rx</Badge>}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-foreground">₹{item.price}</span>
                  {item.mrp && item.mrp > item.price && (
                    <span className="text-[10px] text-muted-foreground line-through">₹{item.mrp}</span>
                  )}
                  {(item.discount_percent || 0) > 0 && (
                    <Badge className="text-[9px] bg-emerald-100 text-emerald-800">{item.discount_percent}% off</Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">{item.stock_quantity > 0 ? `${item.stock_quantity} in stock` : "Out of stock"}</p>
                {item.stock_quantity > 0 ? (
                  inCart > 0 ? (
                    <div className="flex items-center justify-between bg-primary/10 rounded-lg p-1">
                      <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-md bg-card flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                      <span className="text-sm font-bold text-primary">{inCart}</span>
                      <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => addToCart(item)}>
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  )
                ) : (
                  <Button size="sm" variant="secondary" className="w-full text-xs" disabled>Out of Stock</Button>
                )}
              </motion.div>
            );
          })}
      </div>

      {/* Cart Footer */}
      {cartCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2">
          <button
            onClick={goToCheckout}
            className="w-full bg-primary text-primary-foreground rounded-2xl p-4 flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">{cartCount} item{cartCount > 1 ? "s" : ""}</p>
                {hasRx && <p className="text-[10px] opacity-80 flex items-center gap-1"><Upload className="w-3 h-3" /> Prescription needed</p>}
              </div>
            </div>
            <p className="font-bold text-lg">₹{cartTotal.toFixed(0)} →</p>
          </button>
        </div>
      )}
      <BottomNav />
    </div>
  );
};

export default RemedooPharmacyPage;
