import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search, Pill, Package, FileText } from "lucide-react";

const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    Antibiotics: "💊", "Pain Relief": "🩹", Vitamins: "🌿", Cardiac: "❤️",
    Diabetes: "🩸", Respiratory: "🫁", Digestive: "🧬", "Skin Care": "✨",
    "Eye Care": "👁️", General: "💊",
  };
  return icons[category] || "💊";
};

export default function PharmacyMedicines() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: pharmacy } = await supabase.from("pharmacies").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!pharmacy) { setLoading(false); return; }
      const { data } = await supabase.from("medicines").select("*").eq("pharmacy_id", pharmacy.id).order("name");
      setMedicines(data || []);
      setLoading(false);
    };
    load();
  }, []);

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

  const getDiscountedPrice = (m: any) => m.price * (1 - (m.discount_percent || 0) / 100);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-4">Medicines</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search medicines..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11 rounded-xl" />
      </div>

      {/* Category tabs */}
      <div className="mb-4 overflow-x-auto scrollbar-hide">
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
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Pill className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No medicines found</p>
          <p className="text-xs mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {filtered.map((m) => {
            const discountedPrice = getDiscountedPrice(m);
            const hasDiscount = (m.discount_percent || 0) > 0;

            return (
              <div
                key={m.id}
                className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group"
              >
                {hasDiscount && (
                  <div className="absolute top-1 left-1 z-10">
                    <Badge className="bg-success text-success-foreground text-[8px] font-bold px-1 py-0 rounded-md shadow-sm">
                      {m.discount_percent}%
                    </Badge>
                  </div>
                )}

                {m.requires_prescription && (
                  <div className="absolute top-1 right-1 z-10">
                    <Badge variant="outline" className="bg-card/90 backdrop-blur-sm text-[8px] border-primary text-primary px-1 py-0 rounded-md">
                      Rx
                    </Badge>
                  </div>
                )}

                <div className="h-20 bg-gradient-to-br from-accent/60 to-accent/20 flex items-center justify-center relative overflow-hidden">
                  {m.image_url ? (
                    <img loading="lazy" decoding="async" src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-2xl">{getCategoryIcon(m.category)}</span>
                      <span className="text-[8px] text-accent-foreground/50 font-medium">{m.category}</span>
                    </div>
                  )}
                </div>

                <div className="p-2 space-y-1">
                  <h3 className="font-semibold text-foreground text-[10px] leading-tight line-clamp-2 min-h-[1.5rem]">{m.name}</h3>
                  {m.generic_name && <p className="text-[8px] text-muted-foreground truncate">{m.generic_name}</p>}
                  <p className="text-[8px] text-muted-foreground">{m.unit} {m.manufacturer && `• ${m.manufacturer}`}</p>

                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-foreground text-xs">₹{discountedPrice.toFixed(0)}</span>
                    {hasDiscount && <span className="text-[8px] text-muted-foreground line-through">₹{m.price}</span>}
                  </div>

                  <Badge variant={m.in_stock ? "default" : "destructive"} className="text-[8px] mt-0.5">
                    {m.in_stock ? "In Stock" : "Out of Stock"}
                    {m.stock_quantity != null && m.in_stock ? ` (${m.stock_quantity})` : ""}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
