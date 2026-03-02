import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Star, Plus, Trash2, GripVertical } from "lucide-react";

interface Medicine {
  id: string;
  name: string;
  category: string;
  price: number;
  is_featured: boolean | null;
  featured_sort_order: number | null;
}

export default function AdminFeaturedMedicines() {
  const [featured, setFeatured] = useState<Medicine[]>([]);
  const [allMeds, setAllMeds] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [featRes, allRes] = await Promise.all([
      supabase.from("medicines").select("id, name, category, price, is_featured, featured_sort_order").eq("is_featured", true).order("featured_sort_order"),
      supabase.from("medicines").select("id, name, category, price, is_featured, featured_sort_order").order("name"),
    ]);
    setFeatured((featRes.data as Medicine[]) || []);
    setAllMeds((allRes.data as Medicine[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleFeatured = async (id: string, isFeatured: boolean) => {
    const { error } = await supabase.from("medicines").update({ 
      is_featured: !isFeatured, 
      featured_sort_order: !isFeatured ? featured.length + 1 : 0 
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(!isFeatured ? "Medicine featured" : "Medicine unfeatured");
    fetchData();
  };

  const updateOrder = async (id: string, order: number) => {
    await supabase.from("medicines").update({ featured_sort_order: order }).eq("id", id);
    fetchData();
  };

  const available = allMeds.filter(m => !m.is_featured && m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Featured Medicines</h1>
        <Button onClick={() => setShowPicker(!showPicker)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Medicine
        </Button>
      </div>

      {showPicker && (
        <div className="bg-card rounded-2xl border border-border p-4 mb-4 space-y-3">
          <Input placeholder="Search medicines..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="max-h-60 overflow-y-auto space-y-1">
            {available.map(med => (
              <button key={med.id} onClick={() => toggleFeatured(med.id, false)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent text-sm text-left">
                <span>{med.name} <span className="text-muted-foreground">— ₹{med.price}</span></span>
                <Star className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
            {available.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No medicines found</p>}
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : featured.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No featured medicines. Click "Add Medicine" to feature one.</div>
        ) : (
          <div className="divide-y divide-border">
            {featured.map(med => (
              <div key={med.id} className="flex items-center gap-3 p-4">
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{med.name}</p>
                  <p className="text-xs text-muted-foreground">{med.category} • ₹{med.price}</p>
                </div>
                <Input type="number" className="w-16 h-8 text-xs" value={med.featured_sort_order ?? 0} onChange={e => updateOrder(med.id, Number(e.target.value))} />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => toggleFeatured(med.id, true)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}