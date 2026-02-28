import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Clock, Check, Truck, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Order = {
  id: string;
  status: string;
  total: number;
  placed_at: string;
  pharmacy_id: string;
};

const statusConfig: Record<string, { label: string; icon: typeof Package; color: string }> = {
  placed: { label: "Placed", icon: Clock, color: "text-warning" },
  confirmed: { label: "Confirmed", icon: Check, color: "text-primary" },
  out_for_delivery: { label: "On the Way", icon: Truck, color: "text-primary" },
  delivered: { label: "Delivered", icon: Check, color: "text-success" },
  cancelled: { label: "Cancelled", icon: Package, color: "text-destructive" },
};

const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pharmacyNames, setPharmacyNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login", { replace: true }); return; }

      const { data } = await supabase
        .from("orders")
        .select("id, status, total, placed_at, pharmacy_id")
        .eq("user_id", session.user.id)
        .order("placed_at", { ascending: false });

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

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground">My Orders</h1>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No orders yet</p>
          </div>
        ) : (
          orders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.placed;
            const Icon = config.icon;
            return (
              <button
                key={order.id}
                onClick={() => navigate(`/order/${order.id}`)}
                className="w-full text-left bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-xl">💊</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{pharmacyNames[order.pharmacy_id] || "Pharmacy"}</h3>
                    <p className="text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()} • {new Date(order.placed_at).toLocaleDateString()}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                      <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground text-sm">₹{order.total}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto mt-1" />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyOrders;
