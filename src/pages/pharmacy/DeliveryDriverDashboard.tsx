import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Truck, Package, MapPin, Phone, CheckCircle, Navigation, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

export default function DeliveryDriverDashboard() {
  const navigate = useNavigate();
  const [driver, setDriver] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingInterval, setTrackingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: d } = await supabase.from("delivery_drivers").select("*").eq("user_id", session.user.id).maybeSingle();
      if (!d) { toast.error("No driver profile found"); navigate("/login"); return; }
      setDriver(d);
      const { data: dels } = await supabase.from("delivery_orders").select("*").eq("driver_id", d.id).order("created_at", { ascending: false });
      setDeliveries(dels || []);
      setLoading(false);
    };
    load();
    return () => { if (trackingInterval) clearInterval(trackingInterval); };
  }, []);

  const updateStatus = async (deliveryId: string, status: string, orderId: string) => {
    await supabase.from("delivery_orders").update({ status, ...(status === "delivered" ? { delivered_at: new Date().toISOString() } : {}) } as any).eq("id", deliveryId);
    if (status === "delivered") {
      await supabase.from("remedoo_orders").update({ status: "delivered" } as any).eq("id", orderId);
      await supabase.from("delivery_drivers").update({ status: "available" } as any).eq("id", driver.id);
      if (trackingInterval) clearInterval(trackingInterval);
    } else if (status === "picked_up") {
      await supabase.from("remedoo_orders").update({ status: "out_for_delivery" } as any).eq("id", orderId);
    }
    toast.success(`Status updated: ${status.replace("_", " ")}`);
    // Reload
    const { data: dels } = await supabase.from("delivery_orders").select("*").eq("driver_id", driver.id).order("created_at", { ascending: false });
    setDeliveries(dels || []);
  };

  const startTracking = useCallback((deliveryId: string) => {
    if (trackingInterval) clearInterval(trackingInterval);
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        await supabase.from("delivery_orders").update({
          driver_latitude: pos.coords.latitude,
          driver_longitude: pos.coords.longitude,
        } as any).eq("id", deliveryId);
      }, () => {});
    }, 8000);
    setTrackingInterval(interval);
  }, [trackingInterval]);

  const toggleStatus = async (newStatus: string) => {
    await supabase.from("delivery_drivers").update({ status: newStatus } as any).eq("id", driver.id);
    setDriver((p: any) => ({ ...p, status: newStatus }));
    toast.success(`Status: ${newStatus}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const active = deliveries.filter(d => !["delivered", "cancelled"].includes(d.status));
  const history = deliveries.filter(d => ["delivered", "cancelled"].includes(d.status));

  return (
    <div className="min-h-screen bg-muted/30 pb-8">
      <div className="bg-card sticky top-0 z-30 shadow-sm px-4 safe-top pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10"><Truck className="w-5 h-5 text-primary" /></div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Delivery Dashboard</h1>
              <p className="text-[11px] text-muted-foreground">{driver?.name}</p>
            </div>
          </div>
          <Badge className={`text-xs ${driver?.status === "available" ? "bg-emerald-100 text-emerald-800" : driver?.status === "on_delivery" ? "bg-orange-100 text-orange-800" : "bg-muted text-muted-foreground"}`}>
            {driver?.status}
          </Badge>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Status Toggle */}
        <Card className="p-4">
          <p className="font-bold text-sm text-foreground mb-2">Your Status</p>
          <div className="flex gap-2">
            {["available", "offline"].map(s => (
              <Button
                key={s}
                size="sm"
                variant={driver?.status === s ? "default" : "outline"}
                onClick={() => toggleStatus(s)}
                disabled={driver?.status === "on_delivery"}
              >
                {s === "available" ? "Go Online" : "Go Offline"}
              </Button>
            ))}
          </div>
        </Card>

        {/* Active Deliveries */}
        <div>
          <h2 className="font-bold text-sm text-foreground mb-2">Active Deliveries ({active.length})</h2>
          {active.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">No active deliveries</Card>
          ) : active.map(d => (
            <Card key={d.id} className="p-4 mb-3">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm text-foreground">Order #{d.order_id?.slice(0, 8)}</p>
                  <Badge className="text-[10px] mt-1">{d.status.replace(/_/g, " ")}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <MapPin className="w-3 h-3" /> {d.delivery_address || "Address pending"}
              </div>
              <div className="flex gap-2 flex-wrap">
                {d.status === "assigned" && (
                  <>
                    <Button size="sm" onClick={() => { updateStatus(d.id, "picked_up", d.order_id); startTracking(d.id); }}>
                      <Package className="w-3 h-3 mr-1" /> Picked Up
                    </Button>
                  </>
                )}
                {d.status === "picked_up" && (
                  <Button size="sm" onClick={() => { updateStatus(d.id, "in_transit", d.order_id); startTracking(d.id); }}>
                    <Navigation className="w-3 h-3 mr-1" /> Start Delivery
                  </Button>
                )}
                {d.status === "in_transit" && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(d.id, "delivered", d.order_id)}>
                    <CheckCircle className="w-3 h-3 mr-1" /> Mark Delivered
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* History */}
        <div>
          <h2 className="font-bold text-sm text-foreground mb-2">Delivery History ({history.length})</h2>
          {history.slice(0, 10).map(d => (
            <Card key={d.id} className="p-3 mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">#{d.order_id?.slice(0, 8)}</p>
                <p className="text-[10px] text-muted-foreground">{d.delivered_at ? format(new Date(d.delivered_at), "dd MMM, hh:mm a") : "—"}</p>
              </div>
              <Badge variant={d.status === "delivered" ? "default" : "secondary"} className="text-[10px]">{d.status}</Badge>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
