import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, ShoppingBag, IndianRupee, TrendingUp } from "lucide-react";

export default function PharmacyAnalytics() {
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, completedOrders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: pharmacy } = await supabase.from("pharmacies").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!pharmacy) { setLoading(false); return; }
      const { data: orders } = await supabase.from("orders").select("total, status").eq("pharmacy_id", pharmacy.id);
      const all = orders || [];
      const completed = all.filter(o => o.status === "delivered");
      const totalRevenue = completed.reduce((s, o) => s + (o.total || 0), 0);
      setStats({ totalOrders: all.length, totalRevenue, avgOrderValue: completed.length > 0 ? totalRevenue / completed.length : 0, completedOrders: completed.length });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const cards = [
    { label: "Total Orders", value: stats.totalOrders, icon: ShoppingBag, color: "text-blue-600" },
    { label: "Completed Orders", value: stats.completedOrders, icon: TrendingUp, color: "text-green-600" },
    { label: "Total Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, icon: IndianRupee, color: "text-amber-600" },
    { label: "Avg Order Value", value: `₹${stats.avgOrderValue.toFixed(0)}`, icon: BarChart3, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> Analytics</h1>
      <div className="grid grid-cols-2 gap-4">
        {cards.map(c => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><c.icon className={`w-5 h-5 ${c.color}`} /></div>
              <div><p className="text-xs text-muted-foreground">{c.label}</p><p className="text-lg font-bold text-foreground">{c.value}</p></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
