import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Loader2, TrendingUp, Package, ShoppingBag, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function AdminPharmacyAnalytics() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [oRes, iRes] = await Promise.all([
        supabase.from("remedoo_orders").select("*").order("placed_at", { ascending: false }),
        supabase.from("remedoo_pharmacy_inventory").select("*"),
      ]);
      setOrders(oRes.data || []);
      setInventory(iRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  // Stats
  const totalRevenue = orders.filter(o => o.status === "delivered").reduce((a, o) => a + (o.total || 0), 0);
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(o => o.status === "delivered").length;
  const cancelledOrders = orders.filter(o => o.status === "cancelled").length;
  const avgOrderValue = deliveredOrders > 0 ? Math.round(totalRevenue / deliveredOrders) : 0;

  // Daily revenue chart (last 7 days)
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const dayOrders = orders.filter(o => {
      const placed = new Date(o.placed_at);
      return placed >= dayStart && placed < dayEnd && o.status === "delivered";
    });
    return {
      date: format(date, "dd MMM"),
      revenue: dayOrders.reduce((a, o) => a + (o.total || 0), 0),
      orders: dayOrders.length,
    };
  });

  // Top selling medicines
  const medicineSales: Record<string, { name: string; qty: number; revenue: number }> = {};
  orders.filter(o => o.status === "delivered").forEach(o => {
    (o.items || []).forEach((item: any) => {
      if (!medicineSales[item.name]) medicineSales[item.name] = { name: item.name, qty: 0, revenue: 0 };
      medicineSales[item.name].qty += item.quantity || 1;
      medicineSales[item.name].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });
  const topMedicines = Object.values(medicineSales).sort((a, b) => b.qty - a.qty).slice(0, 10);

  // Category distribution
  const catCounts: Record<string, number> = {};
  inventory.forEach(i => { catCounts[i.category] = (catCounts[i.category] || 0) + 1; });
  const categoryData = Object.entries(catCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Order status distribution
  const statusCounts: Record<string, number> = {};
  orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-primary/10"><BarChart3 className="w-6 h-6 text-primary" /></div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Pharmacy Analytics</h1>
          <p className="text-sm text-muted-foreground">Sales and inventory insights</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <DollarSign className="w-5 h-5 text-emerald-600 mb-1" />
          <p className="text-2xl font-bold text-foreground">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
        </Card>
        <Card className="p-4">
          <ShoppingBag className="w-5 h-5 text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
          <p className="text-xs text-muted-foreground">Total Orders</p>
        </Card>
        <Card className="p-4">
          <TrendingUp className="w-5 h-5 text-violet-600 mb-1" />
          <p className="text-2xl font-bold text-foreground">₹{avgOrderValue}</p>
          <p className="text-xs text-muted-foreground">Avg Order Value</p>
        </Card>
        <Card className="p-4">
          <Package className="w-5 h-5 text-amber-600 mb-1" />
          <p className="text-2xl font-bold text-foreground">{inventory.length}</p>
          <p className="text-xs text-muted-foreground">Medicines in Stock</p>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="p-4 mb-6">
        <h3 className="text-sm font-bold text-foreground mb-4">Daily Revenue (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <Tooltip />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue (₹)" />
            <Bar dataKey="orders" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Top Selling */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Top Selling Medicines</h3>
          {topMedicines.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No sales data yet</p>
          ) : (
            <div className="space-y-2">
              {topMedicines.map((m, i) => (
                <div key={m.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                    <span className="truncate text-foreground">{m.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-semibold text-foreground">{m.qty} sold</span>
                    <span className="text-xs text-muted-foreground ml-2">₹{m.revenue}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Category Pie */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Inventory by Category</h3>
          {categoryData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No inventory data</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={70} strokeWidth={2}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1">
                {categoryData.slice(0, 6).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-foreground truncate">{c.name}</span>
                    <span className="text-muted-foreground ml-auto">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Order Status */}
      <Card className="p-4">
        <h3 className="text-sm font-bold text-foreground mb-3">Order Status Breakdown</h3>
        <div className="flex gap-3 flex-wrap">
          {statusData.map(s => (
            <div key={s.name} className="bg-muted/50 rounded-xl px-4 py-3 text-center">
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground capitalize">{s.name}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
