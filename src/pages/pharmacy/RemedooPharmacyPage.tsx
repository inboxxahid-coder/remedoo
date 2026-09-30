import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ShoppingCart, Plus, Minus, Pill, X, Upload, BadgeCheck, Info, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import MedicalLoader from "@/components/ui/MedicalLoader";
import { motion } from "framer-motion";
import SortControl from "@/components/search/SortControl";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "discount", label: "Biggest discount" },
  { value: "availability", label: "Best availability" },
  { value: "name", label: "Name: A to Z" },
];

interface RemedooItem {
  id: string;
  name: string;
  brand_name: string | null;
  generic_name: string | null;
  category: string;
  price: number;
  mrp: number | null;
  stock_quantity: number;
  requires_prescription: boolean;
  discount_percent: number | null;
  image_url: string | null;
  description: string | null;
  dosage_info: string | null;
  side_effects: string | null;
  usage_instructions: string | null;
  drug_category: string | null;
  manufacturer: string | null;
  expiry_date: string | null;
}

interface CartEntry { item: RemedooItem; quantity: number; }

const CATEGORIES = [
  "All", "Pain Relief", "Antibiotics", "Diabetes", "Heart & BP", "Vitamins & Supplements",
  "Skin Care", "Eye Care", "Digestive", "Respiratory", "Personal Care", "General",
];

const RemedooPharmacyPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<RemedooItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("relevance");
  const [detailItem, setDetailItem] = useState<RemedooItem | null>(null);
  const [deliverySettings, setDeliverySettings] = useState({ base: 30, freeThreshold: 499 });

  useEffect(() => {
    const load = async () => {
      const [invRes, settRes] = await Promise.all([
        supabase.from("remedoo_pharmacy_inventory").select("*").eq("is_active", true).order("name"),
        supabase.from("platform_settings").select("key, value").in("key", ["remedoo_base_delivery_fee", "remedoo_free_delivery_threshold"]),
      ]);
      // Filter out expired medicines
      const now = new Date();
      const meds = ((invRes.data as any[]) || []).filter(m =>
        m.stock_quantity > 0 && (!m.expiry_date || new Date(m.expiry_date) > now)
      );
      setItems(meds);

      const settings = settRes.data || [];
      const base = settings.find(s => s.key === "remedoo_base_delivery_fee");
      const threshold = settings.find(s => s.key === "remedoo_free_delivery_threshold");
      setDeliverySettings({
        base: base ? Number(base.value) : 30,
        freeThreshold: threshold ? Number(threshold.value) : 499,
      });
      setLoading(false);
    };
    load();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    return CATEGORIES.filter(c => c === "All" || cats.has(c));
  }, [items]);

  const filtered = useMemo(() => {
    let res = items;
    if (selectedCategory !== "All") res = res.filter(i => i.category === selectedCategory);
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.generic_name?.toLowerCase().includes(q)) ||
        (i.brand_name?.toLowerCase().includes(q)) ||
        (i.manufacturer?.toLowerCase().includes(q))
      );
    }
    if (sortBy === "price_low") res = [...res].sort((a, b) => a.price - b.price);
    else if (sortBy === "price_high") res = [...res].sort((a, b) => b.price - a.price);
    else if (sortBy === "discount") res = [...res].sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
    else if (sortBy === "name") res = [...res].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "availability") res = [...res].sort((a, b) => b.stock_quantity - a.stock_quantity);
    return res;
  }, [items, search, selectedCategory, sortBy]);

  // Find alternatives (same generic name, different brand)
  const getAlternatives = (item: RemedooItem) => {
    if (!item.generic_name) return [];
    return items.filter(i =>
      i.id !== item.id &&
      i.generic_name?.toLowerCase() === item.generic_name?.toLowerCase() &&
      i.stock_quantity > 0
    ).sort((a, b) => a.price - b.price);
  };

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
  const deliveryFee = cartTotal >= deliverySettings.freeThreshold ? 0 : deliverySettings.base;

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
            <button aria-label="Go back" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                Remedoo Pharmacy <BadgeCheck className="w-4 h-4 text-primary" />
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Free delivery above ₹{deliverySettings.freeThreshold}
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, brand, or generic..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 bg-muted/50 border-border h-11 rounded-xl text-sm"
            />
            {search && <button aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
          </div>
        </div>
        {/* Categories */}
        <div className="px-4 pb-2 overflow-x-auto scrollbar-hide">
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
        {/* Sorting */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <SortControl value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} label="Sort medicines" />
        </div>
      </div>

      {/* Medicines Grid */}
      <div className="px-4 mt-4 app-container grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-stretch">
        {loading ? <div className="col-span-full"><MedicalLoader text="Loading medicines..." /></div> :
          filtered.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <Pill className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">No medicines found</p>
              {search && <p className="text-xs text-muted-foreground mt-1">Try searching by generic name or brand</p>}
            </div>
          ) : filtered.map((item, idx) => {
            const inCart = cart[item.id]?.quantity || 0;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-card rounded-xl border border-border p-3 flex flex-col h-full"
              >
                <div className="flex items-start justify-between mb-1">
                  <button onClick={() => setDetailItem(item)} className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                    {item.brand_name && <p className="text-[10px] text-primary truncate">{item.brand_name}</p>}
                    {item.generic_name && <p className="text-[10px] text-muted-foreground truncate">{item.generic_name}</p>}
                  </button>
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {item.requires_prescription && <Badge variant="outline" className="text-[9px]">Rx</Badge>}
                    <button onClick={() => setDetailItem(item)} className="w-5 h-5 rounded-full bg-muted/50 flex items-center justify-center">
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                {item.manufacturer && <p className="text-[9px] text-muted-foreground truncate mb-1">by {item.manufacturer}</p>}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-foreground">₹{item.price}</span>
                  {item.mrp && item.mrp > item.price && (
                    <span className="text-[10px] text-muted-foreground line-through">₹{item.mrp}</span>
                  )}
                  {(item.discount_percent || 0) > 0 && (
                    <Badge className="text-[9px] bg-emerald-100 text-emerald-800">{item.discount_percent}% off</Badge>
                  )}
                </div>
                {item.stock_quantity > 0 ? (
                  inCart > 0 ? (
                    <div className="flex items-center justify-between bg-primary/10 rounded-lg p-1">
                      <button aria-label="Decrease quantity" onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-md bg-card flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                      <span className="text-sm font-bold text-primary">{inCart}</span>
                      <button aria-label="Add" onClick={() => addToCart(item)} className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center"><Plus className="w-3 h-3" /></button>
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
                {deliveryFee === 0 && <p className="text-[10px] opacity-80">✓ Free delivery</p>}
              </div>
            </div>
            <p className="font-bold text-lg">₹{(cartTotal + deliveryFee).toFixed(0)} →</p>
          </button>
        </div>
      )}

      {/* Medicine Detail Sheet */}
      <Sheet open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
          {detailItem && (
            <div className="space-y-4 pb-6">
              <SheetHeader>
                <SheetTitle className="text-left">{detailItem.name}</SheetTitle>
              </SheetHeader>

              <div className="flex items-center gap-2 flex-wrap">
                {detailItem.brand_name && <Badge className="text-xs bg-primary/10 text-primary">{detailItem.brand_name}</Badge>}
                {detailItem.requires_prescription && <Badge variant="outline" className="text-xs">Prescription Required</Badge>}
                {detailItem.drug_category && <Badge variant="secondary" className="text-xs">{detailItem.drug_category.toUpperCase()}</Badge>}
                <Badge variant="secondary" className="text-xs">{detailItem.category}</Badge>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-foreground">₹{detailItem.price}</span>
                {detailItem.mrp && detailItem.mrp > detailItem.price && (
                  <span className="text-sm text-muted-foreground line-through">MRP ₹{detailItem.mrp}</span>
                )}
                {(detailItem.discount_percent || 0) > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-800">{detailItem.discount_percent}% off</Badge>
                )}
              </div>

              {detailItem.generic_name && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Generic Name</p>
                  <p className="text-sm font-medium text-foreground">{detailItem.generic_name}</p>
                </div>
              )}

              {detailItem.manufacturer && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Manufacturer</p>
                  <p className="text-sm font-medium text-foreground">{detailItem.manufacturer}</p>
                </div>
              )}

              {detailItem.description && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground">{detailItem.description}</p>
                </div>
              )}

              {detailItem.dosage_info && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">💊 Dosage</p>
                  <p className="text-sm text-foreground">{detailItem.dosage_info}</p>
                </div>
              )}

              {detailItem.usage_instructions && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">📋 Usage Instructions</p>
                  <p className="text-sm text-foreground">{detailItem.usage_instructions}</p>
                </div>
              )}

              {detailItem.side_effects && (
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">⚠️ Side Effects</p>
                  <p className="text-sm text-foreground">{detailItem.side_effects}</p>
                </div>
              )}

              {/* Alternatives */}
              {(() => {
                const alts = getAlternatives(detailItem);
                if (alts.length === 0) return null;
                return (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">💡 Cheaper Alternatives ({detailItem.generic_name})</p>
                    <div className="space-y-2">
                      {alts.slice(0, 3).map(alt => (
                        <div key={alt.id} className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{alt.name}</p>
                            {alt.brand_name && <p className="text-[10px] text-primary">{alt.brand_name}</p>}
                            {alt.manufacturer && <p className="text-[10px] text-muted-foreground">{alt.manufacturer}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-foreground">₹{alt.price}</span>
                            {alt.price < detailItem.price && (
                              <Badge className="text-[9px] bg-emerald-100 text-emerald-800">
                                Save ₹{detailItem.price - alt.price}
                              </Badge>
                            )}
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { addToCart(alt); setDetailItem(null); }}>
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Add to cart */}
              <Button className="w-full h-12 text-base font-bold" onClick={() => { addToCart(detailItem); setDetailItem(null); }}
                disabled={detailItem.stock_quantity === 0}>
                <Plus className="w-4 h-4 mr-2" /> Add to Cart — ₹{detailItem.price}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
};

export default RemedooPharmacyPage;
