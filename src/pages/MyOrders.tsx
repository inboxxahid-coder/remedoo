import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Clock, Check, Truck, ChevronRight, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonOrderCard } from "@/components/SkeletonCard";
import { format, parseISO } from "date-fns";

type Order = {
  id: string;
  status: string;
  total: number;
  placed_at: string;
  pharmacy_id: string;
};

const statusConfig: Record<string, { label: string; icon: typeof Package; color: string; bg: string }> = {
  placed: { label: "Placed", icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  confirmed: { label: "Confirmed", icon: Check, color: "text-primary", bg: "bg-primary/10" },
  out_for_delivery: { label: "On the Way", icon: Truck, color: "text-success", bg: "bg-success/10" },
  delivered: { label: "Delivered", icon: Check, color: "text-success", bg: "bg-success/10" },
  cancelled: { label: "Cancelled", icon: Package, color: "text-destructive", bg: "bg-destructive/10" },
};

const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pharmacyNames, setPharmacyNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "past">("active");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login", { replace: true }); return; }
      const { data } = await supabase.from("orders").select("id, status, total, placed_at, pharmacy_id").eq("user_id", session.user.id).order("placed_at", { ascending: false });
      if (data) {
        setOrders(data);
        const ids = [...new Set(data.map((o) => o.pharmacy_id))];
        if (ids.length > 0) {
          const { data: pData } = await supabase.from("pharmacies").select("id, name").in("id", ids);
          if (pData) {
            const names: Record<string, string> = {};
            pData.forEach((p) => { names[p.id] = p.name; });
            setPharmacyNames(names);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const pastOrders = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));
  const display = tab === "active" ? activeOrders : pastOrders;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground">My Orders</h1>
          <span className="ml-auto text-primary-foreground/60 text-xs font-medium">{orders.length} total</span>
        </div>
        <div className="flex gap-2">
          {(["active", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t ? "bg-primary-foreground text-primary shadow-sm" : "bg-primary-foreground/15 text-primary-foreground"
              }`}
            >
              {t === "active" ? `Active (${activeOrders.length})` : `Past (${pastOrders.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonOrderCard key={i} />)
        ) : display.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <p className="text-foreground font-semibold mb-1">No {tab} orders</p>
            <p className="text-sm text-muted-foreground mb-4">
              {tab === "active" ? "Your active orders will appear here" : "Your completed orders will show here"}
            </p>
            <button onClick={() => navigate("/pharmacies")} className="text-primary font-semibold text-sm">Browse Pharmacies →</button>
          </div>
        ) : (
          display.map((order, i) => {
            const config = statusConfig[order.status] || statusConfig.placed;
            const Icon = config.icon;
            return (
              <motion.button
                key={order.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/order/${order.id}`)}
                className="w-full text-left bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-2xl shrink-0">💊</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm truncate">{pharmacyNames[order.pharmacy_id] || "Pharmacy"}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">#{order.id.slice(0, 8).toUpperCase()} • {format(parseISO(order.placed_at), "MMM d, h:mm a")}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${config.bg} ${config.color}`}>
                        <Icon className="w-3 h-3" />{config.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-foreground">₹{order.total}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto mt-1" />
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default MyOrders;
