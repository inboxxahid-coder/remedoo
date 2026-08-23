import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingBag, Pill, IndianRupee, Clock, TrendingUp,
  Package, CheckCircle, XCircle, Activity, ArrowRight, BarChart3, Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { readPageCache, writePageCache } from "@/lib/pageCache";

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const snap = readPageCache<any>("pharmacy_dashboard");
  const [loading, setLoading] = useState(!snap);
  const [pharmacy, setPharmacy] = useState<any>(snap?.pharmacy ?? null);
  const [stats, setStats] = useState(snap?.stats ?? {
    orders: 0, medicines: 0, revenue: 0, pending: 0,
    delivered: 0, cancelled: 0, monthlyRevenue: 0, outOfStock: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>(snap?.recentOrders ?? []);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: ph } = await supabase.from("pharmacies").select("*").eq("user_id", session.user.id).maybeSingle();
      if (!ph) { setLoading(false); return; }
      setPharmacy(ph);

      const monthStart = new Date(); monthStart.setDate(1);
      const monthStr = monthStart.toISOString().split("T")[0];

      const [ordersRes, medCountRes, outStockRes, recentRes] = await Promise.all([
        supabase.from("orders").select("total, status, created_at").eq("pharmacy_id", ph.id),
        supabase.from("medicines").select("id", { count: "exact", head: true }).eq("pharmacy_id", ph.id),
        supabase.from("medicines").select("id", { count: "exact", head: true }).eq("pharmacy_id", ph.id).eq("in_stock", false),
        supabase.from("orders").select("id, status, total, created_at").eq("pharmacy_id", ph.id).order("created_at", { ascending: false }).limit(5),
      ]);

      const orders = ordersRes.data || [];
      const delivered = orders.filter(o => o.status === "delivered");
      const monthOrders = delivered.filter(o => o.created_at >= monthStr);
      const revenue = delivered.reduce((s, o) => s + Number(o.total), 0);
      const monthlyRevenue = monthOrders.reduce((s, o) => s + Number(o.total), 0);
      const pending = orders.filter(o => o.status === "placed" || o.status === "confirmed").length;

      const nextStats = {
        orders: orders.length,
        medicines: medCountRes.count || 0,
        revenue,
        pending,
        delivered: delivered.length,
        cancelled: orders.filter(o => o.status === "cancelled").length,
        monthlyRevenue,
        outOfStock: outStockRes.count || 0,
      };
      const nextRecent = recentRes.data || [];

      setStats(nextStats);
      setRecentOrders(nextRecent);
      writePageCache("pharmacy_dashboard", { pharmacy: ph, stats: nextStats, recentOrders: nextRecent });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-56 h-8 rounded" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Total Orders", value: stats.orders, icon: ShoppingBag, gradient: "from-primary/10 to-primary/5", color: "text-primary", path: "/pharmacy-panel/orders" },
    { label: "Pending", value: stats.pending, icon: Clock, gradient: "from-amber-500/10 to-amber-500/5", color: "text-amber-500", path: "/pharmacy-panel/orders" },
    { label: "Delivered", value: stats.delivered, icon: CheckCircle, gradient: "from-emerald-500/10 to-emerald-500/5", color: "text-emerald-500", path: "/pharmacy-panel/orders" },
    { label: "Medicines", value: stats.medicines, icon: Pill, gradient: "from-violet-500/10 to-violet-500/5", color: "text-violet-500", path: "/pharmacy-panel/medicines" },
    { label: "Out of Stock", value: stats.outOfStock, icon: XCircle, gradient: "from-destructive/10 to-destructive/5", color: "text-destructive", path: "/pharmacy-panel/medicines" },
    { label: "Cancelled", value: stats.cancelled, icon: Package, gradient: "from-muted-foreground/10 to-muted-foreground/5", color: "text-muted-foreground", path: "/pharmacy-panel/orders" },
  ];

  const quickLinks = [
    { label: "Orders", path: "/pharmacy-panel/orders", icon: ShoppingBag },
    { label: "Medicines", path: "/pharmacy-panel/medicines", icon: Pill },
    { label: "Earnings", path: "/pharmacy-panel/earnings", icon: IndianRupee },
    { label: "Analytics", path: "/pharmacy-panel/analytics", icon: BarChart3 },
    { label: "Reviews", path: "/pharmacy-panel/reviews", icon: Users },
    { label: "Profile", path: "/pharmacy-panel/profile", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pharmacy Dashboard</h1>
        {pharmacy && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {pharmacy.name} · ⭐ {pharmacy.rating ?? "N/A"}
          </p>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpiCards.map((c, idx) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card
              className={`p-4 bg-gradient-to-br ${c.gradient} border-0 cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => navigate(c.path)}
            >
              <c.icon className={`w-5 h-5 ${c.color} mb-1`} />
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/pharmacy-panel/earnings")}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">₹{stats.revenue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/pharmacy-panel/earnings")}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold text-foreground">₹{stats.monthlyRevenue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Access */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">Quick Access</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {quickLinks.map(q => (
            <Button key={q.label} variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => navigate(q.path)}>
              <q.icon className="w-5 h-5 text-primary" />
              <span className="text-xs">{q.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Recent Orders
          </h3>
          <button onClick={() => navigate("/pharmacy-panel/orders")} className="text-xs text-primary font-semibold flex items-center gap-1">
            See all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {recentOrders.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No recent orders</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentOrders.map(order => (
              <Card key={order.id} className="p-3.5 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate("/pharmacy-panel/orders")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-foreground">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      ₹{Number(order.total).toLocaleString()} · {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <Badge variant={order.status === "delivered" ? "secondary" : order.status === "cancelled" ? "destructive" : "default"}>
                    {order.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
