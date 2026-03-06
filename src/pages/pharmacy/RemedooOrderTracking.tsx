import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Package, CheckCircle, Truck, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";

const STAGES = [
  { key: "placed", label: "Order Placed", icon: Package },
  { key: "prescription_verification", label: "Prescription Verification", icon: Package },
  { key: "preparing", label: "Preparing Order", icon: Package },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

const RemedooOrderTracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [delivery, setDelivery] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: o } = await supabase.from("remedoo_orders").select("*").eq("id", id!).single();
      setOrder(o);
      if (o) {
        const { data: d } = await supabase.from("delivery_orders").select("*").eq("order_id", o.id).maybeSingle();
        setDelivery(d);
        if (d?.driver_id) {
          const { data: dr } = await supabase.from("delivery_drivers").select("name, phone, vehicle_number").eq("id", d.driver_id).single();
          setDriver(dr);
        }
      }
      setLoading(false);
    };
    load();

    // Realtime
    const channel = supabase.channel(`remedoo-order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "remedoo_orders", filter: `id=eq.${id}` }, (p) => setOrder(p.new))
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders", filter: `order_id=eq.${id}` }, (p) => setDelivery(p.new))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Order not found</div>;

  const currentIdx = STAGES.findIndex(s => s.key === order.status);

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <div className="bg-card sticky top-0 z-30 shadow-sm px-4 safe-top pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/my-orders")} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Order #{order.id.slice(0, 8)}</h1>
            <p className="text-[11px] text-muted-foreground">{format(new Date(order.placed_at), "dd MMM yyyy, hh:mm a")}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Status Progress */}
        <Card className="p-5">
          <h3 className="font-bold text-sm text-foreground mb-4">Order Status</h3>
          <div className="space-y-4">
            {STAGES.filter(s => s.key !== "prescription_verification" || order.prescription_url).map((stage, i) => {
              const isActive = i <= currentIdx;
              const isCurrent = stage.key === order.status;
              const Icon = stage.icon;
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className={`text-sm ${isActive ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{stage.label}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Driver Info */}
        {driver && (
          <Card className="p-4">
            <h3 className="font-bold text-sm text-foreground mb-2">Delivery Driver</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{driver.name}</p>
                <p className="text-xs text-muted-foreground">{driver.vehicle_number || "—"}</p>
              </div>
              {driver.phone && (
                <a href={`tel:${driver.phone}`}>
                  <Button size="sm" variant="outline" className="gap-1"><Phone className="w-3 h-3" /> Call</Button>
                </a>
              )}
            </div>
          </Card>
        )}

        {/* Order Items */}
        <Card className="p-4">
          <h3 className="font-bold text-sm text-foreground mb-2">Items</h3>
          {(order.items || []).map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
              <span>{item.name} x{item.quantity}</span>
              <span className="font-semibold">₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-dashed border-border flex justify-between font-bold">
            <span>Total</span><span>₹{order.total}</span>
          </div>
        </Card>

        {/* Delivery Address */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <p className="text-foreground">{order.delivery_address || "—"}</p>
          </div>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default RemedooOrderTracking;
