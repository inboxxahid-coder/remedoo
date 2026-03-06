import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Loader2, Truck, Eye, FileCheck, FileX, AlertCircle, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  placed: "bg-blue-100 text-blue-800",
  prescription_verification: "bg-amber-100 text-amber-800",
  prescription_approved: "bg-emerald-100 text-emerald-800",
  prescription_rejected: "bg-red-100 text-red-800",
  preparing: "bg-violet-100 text-violet-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  refund_initiated: "bg-amber-100 text-amber-800",
  refund_completed: "bg-emerald-100 text-emerald-800",
};

export default function AdminRemedooOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [filter, setFilter] = useState("all");
  const [rxDialogOrder, setRxDialogOrder] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

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

  const updateStatus = async (id: string, status: string, extra?: Record<string, any>) => {
    const { error } = await supabase.from("remedoo_orders").update({ status, ...extra } as any).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Order ${status.replace(/_/g, " ")}`); load(); }
  };

  const approvePrescription = async (orderId: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    await updateStatus(orderId, "placed", {
      prescription_status: "approved",
      prescription_verified_by: user?.id,
      prescription_verified_at: new Date().toISOString(),
    });
    setRxDialogOrder(null);
  };

  const rejectPrescription = async (orderId: string) => {
    if (!rejectionReason.trim()) { toast.error("Please provide a reason"); return; }
    const user = (await supabase.auth.getUser()).data.user;
    await updateStatus(orderId, "prescription_rejected", {
      prescription_status: "rejected",
      prescription_verified_by: user?.id,
      prescription_verified_at: new Date().toISOString(),
      prescription_rejection_reason: rejectionReason,
    });
    setRxDialogOrder(null);
    setRejectionReason("");
  };

  const initiateRefund = async (order: any) => {
    await updateStatus(order.id, "cancelled", {
      cancelled_at: new Date().toISOString(),
      refund_status: "initiated",
      refund_amount: order.total,
    });
  };

  const completeRefund = async (orderId: string) => {
    const { error } = await supabase.from("remedoo_orders").update({
      refund_status: "completed",
    } as any).eq("id", orderId);
    if (error) toast.error(error.message);
    else { toast.success("Refund completed"); load(); }
  };

  const assignDriver = async (orderId: string, driverId: string) => {
    const order = orders.find(o => o.id === orderId);
    const { error } = await supabase.from("delivery_orders").upsert({
      order_id: orderId,
      driver_id: driverId,
      delivery_address: order?.delivery_address,
      status: "assigned",
    } as any, { onConflict: "order_id" });
    if (error) toast.error(error.message);
    else {
      await updateStatus(orderId, "out_for_delivery");
      await supabase.from("delivery_drivers").update({ status: "on_delivery" }).eq("id", driverId);
      toast.success("Driver assigned");
    }
  };

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const rxPendingCount = orders.filter(o => o.status === "prescription_verification").length;

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

      {/* Prescription Alert */}
      {rxPendingCount > 0 && (
        <Card className="p-4 mb-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 text-amber-600 cursor-pointer" onClick={() => setFilter("prescription_verification")}>
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{rxPendingCount} orders awaiting prescription verification</span>
          </div>
        </Card>
      )}

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {["all", "placed", "prescription_verification", "preparing", "out_for_delivery", "delivered", "cancelled"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
              filter === s ? "bg-foreground text-background" : "bg-card border border-border text-foreground"
            }`}>
            {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            {s === "prescription_verification" && rxPendingCount > 0 ? ` (${rxPendingCount})` : ""}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(order => {
          const hasRxItems = (order.items || []).some((i: any) => i.requires_prescription);
          return (
            <Card key={order.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-sm text-foreground">#{order.id.slice(0, 8)}</p>
                    <Badge className={`text-[10px] ${STATUS_COLORS[order.status] || ""}`}>{order.status.replace(/_/g, " ")}</Badge>
                    {hasRxItems && <Badge variant="outline" className="text-[10px]">Rx Order</Badge>}
                    {order.refund_status && (
                      <Badge className={`text-[10px] ${order.refund_status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        Refund: {order.refund_status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">₹{order.total} • {order.payment_method.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(order.placed_at), "dd MMM yyyy, hh:mm a")}</p>
                  {order.prescription_rejection_reason && (
                    <p className="text-xs text-destructive mt-1">Rejection: {order.prescription_rejection_reason}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}><Eye className="w-3 h-3 mr-1" /> View</Button>

                  {/* Prescription verification */}
                  {order.status === "prescription_verification" && (
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => setRxDialogOrder(order)}>
                      <FileCheck className="w-3 h-3 mr-1" /> Verify Rx
                    </Button>
                  )}

                  {/* Normal flow */}
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

                  {/* Cancel / Refund */}
                  {["placed", "preparing"].includes(order.status) && !order.refund_status && (
                    <Button size="sm" variant="destructive" onClick={() => initiateRefund(order)}>Cancel & Refund</Button>
                  )}
                  {order.refund_status === "initiated" && (
                    <Button size="sm" variant="outline" onClick={() => completeRefund(order.id)}>
                      <RotateCcw className="w-3 h-3 mr-1" /> Complete Refund
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-10">No orders found</p>}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Order Details</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 text-sm">
              <p><strong>Order ID:</strong> {selectedOrder.id.slice(0, 8)}</p>
              <p><strong>Status:</strong> {selectedOrder.status.replace(/_/g, " ")}</p>
              <p><strong>Total:</strong> ₹{selectedOrder.total} (Subtotal: ₹{selectedOrder.subtotal} + Delivery: ₹{selectedOrder.delivery_fee})</p>
              <p><strong>Address:</strong> {selectedOrder.delivery_address || "—"}</p>
              <p><strong>Notes:</strong> {selectedOrder.notes || "—"}</p>
              {selectedOrder.prescription_url && (
                <p><strong>Prescription:</strong> <a href="#" className="text-primary underline">View uploaded file</a></p>
              )}
              {selectedOrder.refund_status && (
                <p><strong>Refund:</strong> {selectedOrder.refund_status} — ₹{selectedOrder.refund_amount}</p>
              )}
              <div>
                <strong>Items:</strong>
                <ul className="mt-1 space-y-1">
                  {(selectedOrder.items || []).map((item: any, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                      {item.name} x{item.quantity} — ₹{item.price * item.quantity}
                      {item.requires_prescription && <Badge variant="outline" className="text-[9px]">Rx</Badge>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Prescription Verification Dialog */}
      <Dialog open={!!rxDialogOrder} onOpenChange={() => { setRxDialogOrder(null); setRejectionReason(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verify Prescription</DialogTitle></DialogHeader>
          {rxDialogOrder && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm font-medium text-foreground mb-2">Order #{rxDialogOrder.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground mb-2">Prescription medicines in this order:</p>
                <ul className="space-y-1">
                  {(rxDialogOrder.items || []).filter((i: any) => i.requires_prescription).map((item: any, idx: number) => (
                    <li key={idx} className="text-xs text-foreground">• {item.name} x{item.quantity}</li>
                  ))}
                </ul>
              </div>

              {rxDialogOrder.prescription_url ? (
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-sm font-medium text-foreground mb-1">Uploaded Prescription</p>
                  <p className="text-xs text-primary">File: {rxDialogOrder.prescription_url}</p>
                </div>
              ) : (
                <Card className="p-4 border-destructive/30 bg-destructive/5">
                  <p className="text-sm text-destructive font-medium">No prescription uploaded!</p>
                </Card>
              )}

              <div className="flex gap-3">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => approvePrescription(rxDialogOrder.id)}>
                  <FileCheck className="w-4 h-4 mr-2" /> Approve
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => {
                  if (!rejectionReason) {
                    document.getElementById("rx-reject-reason")?.focus();
                    toast.error("Enter rejection reason first");
                    return;
                  }
                  rejectPrescription(rxDialogOrder.id);
                }}>
                  <FileX className="w-4 h-4 mr-2" /> Reject
                </Button>
              </div>
              <div>
                <Label className="text-xs">Rejection Reason (required to reject)</Label>
                <Textarea id="rx-reject-reason" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                  placeholder="e.g. Prescription expired, illegible, missing doctor signature..." />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
