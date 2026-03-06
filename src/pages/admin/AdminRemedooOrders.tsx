import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Loader2, Truck, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  placed: "bg-blue-100 text-blue-800",
  prescription_verification: "bg-amber-100 text-amber-800",
  preparing: "bg-violet-100 text-violet-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminRemedooOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    const [oRes, dRes] = await Promise.all([
      supabase.from("remedoo_orders").select("*").order("placed_at", { ascending: false }),
      supabase.from("delivery_drivers").select("*").eq("is_active", true),
    ]);
    setOrders(oRes.data || []);
    setDrivers(dRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("remedoo_orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Order ${status.replace("_", " ")}`); load(); }
  };

  const assignDriver = async (orderId: string, driverId: string) => {
    // Create or update delivery order
    const order = orders.find(o => o.id === orderId);
    const { error } = await supabase.from("delivery_orders").upsert({
      order_id: orderId,
      driver_id: driverId,
      delivery_address: order?.delivery_address,
      status: "assigned",
    }, { onConflict: "order_id" });
    if (error) toast.error(error.message);
    else {
      await updateStatus(orderId, "out_for_delivery");
      await supabase.from("delivery_drivers").update({ status: "on_delivery" }).eq("id", driverId);
      toast.success("Driver assigned");
    }
  };

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-primary/10"><ShoppingBag className="w-6 h-6 text-primary" /></div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Remedoo Orders</h1>
          <p className="text-sm text-muted-foreground">{orders.length} total orders</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {["all", "placed", "prescription_verification", "preparing", "out_for_delivery", "delivered", "cancelled"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
              filter === s ? "bg-foreground text-background" : "bg-card border border-border text-foreground"
            }`}
          >
            {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(order => (
          <Card key={order.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-sm text-foreground">#{order.id.slice(0, 8)}</p>
                  <Badge className={`text-[10px] ${STATUS_COLORS[order.status] || ""}`}>{order.status.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">₹{order.total} • {order.payment_method.toUpperCase()}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(order.placed_at), "dd MMM yyyy, hh:mm a")}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}><Eye className="w-3 h-3 mr-1" /> View</Button>
                {order.status === "placed" && (
                  <Button size="sm" onClick={() => updateStatus(order.id, "preparing")}>Accept</Button>
                )}
                {order.status === "preparing" && drivers.filter(d => d.status === "available").length > 0 && (
                  <Select onValueChange={(v) => assignDriver(order.id, v)}>
                    <SelectTrigger className="h-8 text-xs"><Truck className="w-3 h-3 mr-1" /><SelectValue placeholder="Assign driver" /></SelectTrigger>
                    <SelectContent>
                      {drivers.filter(d => d.status === "available").map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-10">No orders found</p>}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Order Details</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 text-sm">
              <p><strong>Order ID:</strong> {selectedOrder.id.slice(0, 8)}</p>
              <p><strong>Status:</strong> {selectedOrder.status.replace(/_/g, " ")}</p>
              <p><strong>Total:</strong> ₹{selectedOrder.total}</p>
              <p><strong>Address:</strong> {selectedOrder.delivery_address || "—"}</p>
              <p><strong>Notes:</strong> {selectedOrder.notes || "—"}</p>
              <div>
                <strong>Items:</strong>
                <ul className="mt-1 space-y-1">
                  {(selectedOrder.items || []).map((item: any, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      {item.name} x{item.quantity} — ₹{item.price * item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
