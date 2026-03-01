import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, CheckCircle, XCircle, Clock, Filter, IndianRupee } from "lucide-react";

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [txRef, setTxRef] = useState("");

  const load = async () => {
    const { data } = await supabase.from("payout_requests").select("*").order("requested_at", { ascending: false });
    setPayouts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = payouts.filter(p => statusFilter === "all" || p.status === statusFilter);

  const handleAction = async (status: "approved" | "rejected" | "paid") => {
    if (!selected) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const update: any = {
      status,
      admin_notes: adminNotes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.user.id,
    };
    if (status === "paid") {
      update.paid_at = new Date().toISOString();
      update.transaction_reference = txRef || null;
    }

    const { error } = await supabase.from("payout_requests").update(update).eq("id", selected.id);
    if (error) { toast.error(error.message); return; }

    // Update wallet balance on approval/payment
    if (status === "approved" || status === "paid") {
      await supabase.from("provider_wallets")
        .update({
          pending_withdrawal: 0,
          total_withdrawn: selected.amount,
          available_balance: 0,
        })
        .eq("provider_type", selected.provider_type)
        .eq("provider_id", selected.provider_id);
    }
    if (status === "rejected") {
      // Return balance
      const { data: wallet } = await supabase.from("provider_wallets")
        .select("*")
        .eq("provider_type", selected.provider_type)
        .eq("provider_id", selected.provider_id)
        .maybeSingle();
      if (wallet) {
        await supabase.from("provider_wallets").update({
          pending_withdrawal: Math.max(0, Number(wallet.pending_withdrawal) - selected.amount),
          available_balance: Number(wallet.available_balance) + selected.amount,
        }).eq("id", wallet.id);
      }
    }

    toast.success(`Payout ${status}`);
    setDialogOpen(false);
    setAdminNotes("");
    setTxRef("");
    load();
  };

  const statusColor = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (s) {
      case "approved": case "paid": return "default";
      case "rejected": return "destructive";
      case "pending": return "outline";
      default: return "secondary";
    }
  };

  const totalPending = payouts.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="w-48 h-8 rounded" />
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" /> Payout Management
        </h1>
        <Badge variant="outline" className="text-sm">
          <IndianRupee className="w-3 h-3 mr-1" />
          ₹{totalPending.toLocaleString()} pending
        </Badge>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-48">
          <Filter className="w-4 h-4 mr-1" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No payout requests found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <Card key={p.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground capitalize">{p.provider_type}</p>
                    <Badge variant={statusColor(p.status)}>{p.status}</Badge>
                  </div>
                  <p className="text-xl font-bold text-primary">₹{Number(p.amount).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested: {new Date(p.requested_at).toLocaleDateString()}
                    {p.transaction_reference && ` · Ref: ${p.transaction_reference}`}
                  </p>
                  {p.admin_notes && <p className="text-xs text-muted-foreground">📝 {p.admin_notes}</p>}
                </div>
                {p.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setSelected(p); setDialogOpen(true); }}>
                      Review
                    </Button>
                  </div>
                )}
                {p.status === "approved" && (
                  <Button size="sm" variant="outline" onClick={() => { setSelected(p); setDialogOpen(true); }}>
                    Mark Paid
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Payout — ₹{Number(selected?.amount || 0).toLocaleString()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Admin Notes</Label>
              <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
            {selected?.status === "approved" && (
              <div>
                <Label>Transaction Reference</Label>
                <Input value={txRef} onChange={e => setTxRef(e.target.value)} placeholder="Bank transfer reference..." />
              </div>
            )}
          </div>
          <DialogFooter className="flex-wrap gap-2">
            {selected?.status === "pending" && (
              <>
                <Button variant="destructive" onClick={() => handleAction("rejected")}>
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button onClick={() => handleAction("approved")}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Approve
                </Button>
              </>
            )}
            {selected?.status === "approved" && (
              <Button onClick={() => handleAction("paid")}>
                <IndianRupee className="w-4 h-4 mr-1" /> Mark as Paid
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
