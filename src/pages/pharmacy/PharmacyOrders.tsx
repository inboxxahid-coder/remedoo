import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PharmacyOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: pharmacy } = await supabase.from("pharmacies").select("id").eq("user_id", session.user.id).maybeSingle();
    if (!pharmacy) { setLoading(false); return; }
    const { data } = await supabase.from("orders").select("*").eq("pharmacy_id", pharmacy.id).order("placed_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Order ${status}`); load(); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Orders</h1>
      {orders.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No orders</p>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Card key={order.id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold text-foreground">₹{order.total}</p>
                  <p className="text-sm text-muted-foreground">{new Date(order.placed_at).toLocaleDateString()}</p>
                  <p className="text-xs text-muted-foreground">{order.payment_method} • {order.payment_status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={order.status === "delivered" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"}>
                    {order.status}
                  </Badge>
                  {order.status === "placed" && <Button size="sm" onClick={() => updateStatus(order.id, "confirmed")}>Confirm</Button>}
                  {order.status === "confirmed" && <Button size="sm" onClick={() => updateStatus(order.id, "out_for_delivery")}>Ship</Button>}
                  {order.status === "out_for_delivery" && <Button size="sm" onClick={() => updateStatus(order.id, "delivered")}>Delivered</Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
