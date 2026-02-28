import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Clock, Truck, Package, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Order = {
  id: string;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  estimated_delivery: string;
  placed_at: string;
  confirmed_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  pharmacy_id: string;
};

type OrderItem = {
  id: string;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

const steps = [
  { key: "placed", label: "Order Placed", icon: Package, timeField: "placed_at" as const },
  { key: "confirmed", label: "Confirmed", icon: Check, timeField: "confirmed_at" as const },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck, timeField: "out_for_delivery_at" as const },
  { key: "delivered", label: "Delivered", icon: Check, timeField: "delivered_at" as const },
];

const OrderTracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [pharmacyName, setPharmacyName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [oRes, iRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id!).single(),
        supabase.from("order_items").select("*").eq("order_id", id!),
      ]);
      if (oRes.data) {
        setOrder(oRes.data as Order);
        const { data: pData } = await supabase.from("pharmacies").select("name").eq("id", oRes.data.pharmacy_id).single();
        if (pData) setPharmacyName(pData.name);
      }
      if (iRes.data) setItems(iRes.data);
      setLoading(false);
    };
    load();

    // Realtime subscription for order updates
    const channel = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, (payload) => {
        setOrder(payload.new as Order);
        const status = (payload.new as Order).status;
        if (status === "confirmed") toast.success("Your order has been confirmed!");
        if (status === "out_for_delivery") toast.success("Your order is out for delivery!");
        if (status === "delivered") toast.success("Your order has been delivered!");
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!order) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Order not found</div>;

  const statusIndex = steps.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled";

  const formatTime = (ts: string | null) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate("/dashboard")} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">Order Tracking</h1>
            <p className="text-primary-foreground/70 text-xs">#{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        {!isCancelled && (
          <div className="bg-primary-foreground/15 rounded-xl p-3 mt-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary-foreground" />
            <div>
              <p className="text-primary-foreground text-sm font-medium">Estimated Delivery</p>
              <p className="text-primary-foreground/80 text-xs">{order.estimated_delivery || "25-35 min"}</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 mt-4 space-y-4">
        {/* Status tracker */}
        <div className="bg-card rounded-2xl border border-border p-5">
          {isCancelled ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">❌</span>
              </div>
              <h3 className="font-semibold text-destructive">Order Cancelled</h3>
              <p className="text-xs text-muted-foreground mt-1">{formatTime(order.cancelled_at)}</p>
            </div>
          ) : (
            <div className="space-y-0">
              {steps.map((step, i) => {
                const isCompleted = i <= statusIndex;
                const isCurrent = i === statusIndex;
                const Icon = step.icon;
                const timestamp = order[step.timeField];
                return (
                  <div key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`w-0.5 h-8 ${isCompleted && i < statusIndex ? "bg-primary" : "bg-border"}`} />
                      )}
                    </div>
                    <div className="pb-6">
                      <p className={`text-sm font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                      {timestamp && <p className="text-xs text-muted-foreground">{formatTime(timestamp)}</p>}
                      {isCurrent && !order.delivered_at && <p className="text-xs text-primary font-medium mt-0.5">In progress...</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pharmacy info */}
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-xl">💊</div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm">{pharmacyName}</h3>
            <p className="text-xs text-muted-foreground">Pharmacy</p>
          </div>
          <button className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="w-4 h-4 text-primary" />
          </button>
        </div>

        {/* Delivery address */}
        {order.delivery_address && (
          <div className="bg-card rounded-2xl border border-border p-4 flex items-start gap-3">
            <MapPin className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground text-sm">Delivery Address</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{order.delivery_address}</p>
            </div>
          </div>
        )}

        {/* Order items */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="font-semibold text-foreground text-sm mb-3">Order Items</h2>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm text-foreground">{item.medicine_name}</p>
                <p className="text-xs text-muted-foreground">Qty: {item.quantity} × ₹{item.unit_price}</p>
              </div>
              <span className="text-sm font-medium text-foreground">₹{item.total_price}</span>
            </div>
          ))}
          <div className="border-t border-border mt-2 pt-2 space-y-1">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Subtotal</span><span>₹{order.subtotal}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Delivery</span><span>{order.delivery_fee === 0 ? "FREE" : `₹${order.delivery_fee}`}</span></div>
            <div className="flex justify-between font-bold text-sm pt-1"><span>Total</span><span>₹{order.total}</span></div>
          </div>
        </div>

        {/* Payment info */}
        <div className="bg-card rounded-2xl border border-border p-4 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-foreground">{order.payment_method === "cod" ? "💵 Cash on Delivery" : "💳 Online Payment"}</p>
            <p className="text-xs text-muted-foreground capitalize">Status: {order.payment_status}</p>
          </div>
          <span className="font-bold text-foreground">₹{order.total}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
