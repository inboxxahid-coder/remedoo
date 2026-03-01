import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ShoppingBag, Pill, IndianRupee, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PharmacyDashboard() {
  const [stats, setStats] = useState({ orders: 0, medicines: 0, revenue: 0, pending: 0 });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: pharmacy } = await supabase.from("pharmacies").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!pharmacy) return;

      const { data: orders } = await supabase.from("orders").select("total, status").eq("pharmacy_id", pharmacy.id);
      const { count: medCount } = await supabase.from("medicines").select("id", { count: "exact", head: true }).eq("pharmacy_id", pharmacy.id);

      const revenue = (orders || []).filter(o => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0);
      const pending = (orders || []).filter(o => o.status === "placed" || o.status === "confirmed").length;

      setStats({ orders: orders?.length || 0, medicines: medCount || 0, revenue, pending });
    };
    load();
  }, []);

  const cards = [
    { label: "Total Orders", value: stats.orders, icon: ShoppingBag, color: "text-primary" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-warning" },
    { label: "Medicines", value: stats.medicines, icon: Pill, color: "text-success" },
    { label: "Revenue", value: `₹${stats.revenue}`, icon: IndianRupee, color: "text-primary" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Pharmacy Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.label} className="p-4">
            <c.icon className={`w-6 h-6 ${c.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{typeof c.value === "string" ? c.value : c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
