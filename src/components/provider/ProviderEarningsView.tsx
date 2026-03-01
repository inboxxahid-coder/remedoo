import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/exportCsv";
import { logAuditAction } from "@/lib/auditLog";
import { toast } from "sonner";
import { IndianRupee, TrendingUp, Calendar, Download, Filter, Percent, Wallet, ArrowUpRight } from "lucide-react";

interface Props {
  providerType: "doctor" | "pharmacy" | "lab";
  providerId: string | null;
  userId: string | null;
}

export default function ProviderEarningsView({ providerType, providerId, userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!providerId) return;
    const load = async () => {
      const [earningsRes, walletRes] = await Promise.all([
        supabase.from("provider_earnings").select("*")
          .eq("provider_type", providerType).eq("provider_id", providerId)
          .order("created_at", { ascending: false }),
        supabase.from("provider_wallets").select("*")
          .eq("provider_type", providerType).eq("provider_id", providerId)
          .maybeSingle(),
      ]);
      setEarnings(earningsRes.data || []);
      setWallet(walletRes.data);
      setLoading(false);
    };
    load();
  }, [providerId, providerType]);

  const filtered = earnings.filter(e => {
    const d = e.created_at.split("T")[0];
    return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
  });

  const totalGross = filtered.reduce((s, e) => s + Number(e.gross_amount || 0), 0);
  const totalCommission = filtered.reduce((s, e) => s + Number(e.commission_amount || 0), 0);
  const totalNet = filtered.reduce((s, e) => s + Number(e.net_amount || 0), 0);

  const handleRequestPayout = async () => {
    if (!userId || !providerId) return;
    const amt = Number(payoutAmount);
    if (!amt || amt <= 0 || amt > Number(wallet?.available_balance || 0)) {
      toast.error("Invalid amount or exceeds available balance");
      return;
    }
    setRequesting(true);
    const { error } = await supabase.from("payout_requests").insert({
      provider_type: providerType,
      provider_id: providerId,
      user_id: userId,
      amount: amt,
      bank_details: bankDetails ? { info: bankDetails } : null,
    });
    if (error) { toast.error(error.message); setRequesting(false); return; }

    // Update wallet pending
    await supabase.from("provider_wallets").update({
      pending_withdrawal: Number(wallet?.pending_withdrawal || 0) + amt,
      available_balance: Number(wallet?.available_balance || 0) - amt,
    }).eq("provider_type", providerType).eq("provider_id", providerId);

    toast.success("Withdrawal request submitted");
    logAuditAction({ action: "request_payout", entityType: "payout", details: { amount: amt } });
    setShowPayoutDialog(false);
    setPayoutAmount("");
    setBankDetails("");
    setRequesting(false);

    // Refresh wallet
    const { data: w } = await supabase.from("provider_wallets").select("*")
      .eq("provider_type", providerType).eq("provider_id", providerId).maybeSingle();
    setWallet(w);
  };

  const handleExport = () => {
    exportToCsv(`${providerType}_earnings`, filtered.map(e => ({
      Date: new Date(e.created_at).toLocaleDateString(),
      Description: e.description || e.reference_type,
      Gross: `₹${e.gross_amount}`,
      Commission: `₹${e.commission_amount} (${e.commission_percent}%)`,
      Net: `₹${e.net_amount}`,
    })));
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="w-40 h-8 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">Earnings & Payouts</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          {wallet && Number(wallet.available_balance) > 0 && (
            <Button size="sm" onClick={() => setShowPayoutDialog(true)}>
              <Wallet className="w-4 h-4 mr-1" /> Withdraw
            </Button>
          )}
        </div>
      </div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10">
          <IndianRupee className="w-5 h-5 text-primary mb-1" />
          <p className="text-xs text-muted-foreground">Total Earned</p>
          <p className="text-xl font-bold text-foreground">₹{Number(wallet?.total_earned || 0).toLocaleString()}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
          <Wallet className="w-5 h-5 text-emerald-500 mb-1" />
          <p className="text-xs text-muted-foreground">Available</p>
          <p className="text-xl font-bold text-foreground">₹{Number(wallet?.available_balance || 0).toLocaleString()}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <ArrowUpRight className="w-5 h-5 text-amber-500 mb-1" />
          <p className="text-xs text-muted-foreground">Withdrawn</p>
          <p className="text-xl font-bold text-foreground">₹{Number(wallet?.total_withdrawn || 0).toLocaleString()}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
          <Percent className="w-5 h-5 text-blue-500 mb-1" />
          <p className="text-xs text-muted-foreground">Total Commission</p>
          <p className="text-xl font-bold text-foreground">₹{totalCommission.toLocaleString()}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Filter by Date</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        {(dateFrom || dateTo) && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{filtered.length} transactions · Net ₹{totalNet.toLocaleString()}</p>
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>
          </div>
        )}
      </Card>

      {/* Transaction History */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Transaction History</h2>
        {filtered.length === 0 ? (
          <Card className="p-8 text-center"><p className="text-muted-foreground">No earnings yet</p></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(e => (
              <Card key={e.id} className="p-3 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.description || e.reference_type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">+₹{Number(e.net_amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Gross ₹{Number(e.gross_amount).toLocaleString()} · {e.commission_percent}% fee
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Payout Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Available balance: <strong>₹{Number(wallet?.available_balance || 0).toLocaleString()}</strong>
            </p>
            <div>
              <Label>Amount (₹) *</Label>
              <Input type="number" min={1} max={wallet?.available_balance || 0} value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder="Enter amount..." />
            </div>
            <div>
              <Label>Bank Details / UPI</Label>
              <Textarea value={bankDetails} onChange={e => setBankDetails(e.target.value)} placeholder="Account number, IFSC, or UPI ID..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>Cancel</Button>
            <Button onClick={handleRequestPayout} disabled={requesting}>
              {requesting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
