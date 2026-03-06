import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, Building2, FlaskConical, Store, GripVertical } from "lucide-react";

type ProviderType = "hospital" | "lab" | "pharmacy";

const TABS: { value: ProviderType; label: string; icon: typeof Building2 }[] = [
  { value: "hospital", label: "Hospitals", icon: Building2 },
  { value: "lab", label: "Labs", icon: FlaskConical },
  { value: "pharmacy", label: "Pharmacies", icon: Store },
];

export default function AdminFeaturedProviders() {
  const [data, setData] = useState<Record<ProviderType, any[]>>({ hospital: [], lab: [], pharmacy: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [hospRes, labRes, pharmRes] = await Promise.all([
      supabase.from("hospitals").select("id, name, is_featured, featured_sort_order, city").order("featured_sort_order"),
      supabase.from("labs").select("id, name, is_featured, featured_sort_order, city").order("featured_sort_order"),
      supabase.from("pharmacies").select("id, name, is_featured, featured_sort_order, city").order("featured_sort_order"),
    ]);
    setData({ hospital: hospRes.data || [], lab: labRes.data || [], pharmacy: pharmRes.data || [] });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleFeatured = async (type: ProviderType, id: string, current: boolean) => {
    const table = type === "hospital" ? "hospitals" : type === "lab" ? "labs" : "pharmacies";
    const featuredCount = data[type].filter(p => p.is_featured).length;
    const { error } = await supabase.from(table).update({
      is_featured: !current,
      featured_sort_order: !current ? featuredCount + 1 : 0,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(!current ? "Featured" : "Unfeatured");
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Star className="w-6 h-6 text-amber-500" /> Featured Providers
      </h1>
      <p className="text-sm text-muted-foreground">Featured providers appear at the top of search results and homepage sections.</p>

      <Tabs defaultValue="hospital">
        <TabsList>
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1">
              <t.icon className="w-4 h-4" /> {t.label}
              <Badge variant="secondary" className="ml-1 text-xs">{data[t.value].filter(p => p.is_featured).length}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(tab => (
          <TabsContent key={tab.value} value={tab.value}>
            <div className="space-y-4">
              {/* Featured */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Featured ({data[tab.value].filter(p => p.is_featured).length})</h3>
                <div className="space-y-2">
                  {data[tab.value].filter(p => p.is_featured).map(p => (
                    <Card key={p.id} className="p-3 flex items-center justify-between border-primary/30 bg-primary/5">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <div>
                          <p className="font-medium text-sm text-foreground">{p.name}</p>
                          {p.city && <p className="text-xs text-muted-foreground">{p.city}</p>}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => toggleFeatured(tab.value, p.id, true)}>Remove</Button>
                    </Card>
                  ))}
                  {data[tab.value].filter(p => p.is_featured).length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No featured {tab.label.toLowerCase()} yet</p>
                  )}
                </div>
              </div>

              {/* All */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">All {tab.label} ({data[tab.value].filter(p => !p.is_featured).length})</h3>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {data[tab.value].filter(p => !p.is_featured).map(p => (
                    <Card key={p.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-foreground">{p.name}</p>
                        {p.city && <p className="text-xs text-muted-foreground">{p.city}</p>}
                      </div>
                      <Button variant="default" size="sm" onClick={() => toggleFeatured(tab.value, p.id, false)}>Feature</Button>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
