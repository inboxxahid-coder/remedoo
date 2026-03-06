import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { logAuditAction } from "@/lib/auditLog";
import { toast } from "sonner";
import { CreditCard, Building, CheckCircle2, Clock, XCircle, AlertTriangle, Save, Shield } from "lucide-react";

interface Props {
  providerType: "doctor" | "hospital" | "lab" | "pharmacy";
  providerId: string | null;
  userId: string | null;
}

export default function ProviderPaymentSettings({ providerType, providerId, userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<"upi" | "bank_account">("upi");
  const [upiId, setUpiId] = useState("");
  const [holderName, setHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");

  useEffect(() => {
    if (!providerId || !userId) { setLoading(false); return; }
    const load = async () => {
      const [accRes, crRes] = await Promise.all([
        supabase.from("provider_payment_accounts").select("*")
          .eq("provider_type", providerType).eq("provider_id", providerId).maybeSingle(),
        supabase.from("payment_change_requests").select("*")
          .eq("provider_type", providerType).eq("provider_id", providerId)
          .order("created_at", { ascending: false }).limit(5),
      ]);
      if (accRes.data) {
        const a = accRes.data;
        setAccount(a);
        setPaymentMethod(a.payment_method as any);
        setUpiId(a.upi_id || "");
        setHolderName(a.account_holder_name || "");
        setAccountNumber(a.bank_account_number || "");
        setIfscCode(a.ifsc_code || "");
        setBankName(a.bank_name || "");
      }
      setChangeRequests(crRes.data || []);
      setLoading(false);
    };
    load();
  }, [providerId, providerType, userId]);

  const handleSave = async () => {
    if (!providerId || !userId) return;

    if (paymentMethod === "upi" && !upiId.trim()) {
      toast.error("Please enter your UPI ID"); return;
    }
    if (paymentMethod === "bank_account" && (!holderName.trim() || !accountNumber.trim() || !ifscCode.trim() || !bankName.trim())) {
      toast.error("Please fill all bank account fields"); return;
    }

    setSaving(true);
    const payload = {
      provider_type: providerType,
      provider_id: providerId,
      user_id: userId,
      payment_method: paymentMethod,
      upi_id: paymentMethod === "upi" ? upiId.trim() : null,
      account_holder_name: holderName.trim() || null,
      bank_account_number: paymentMethod === "bank_account" ? accountNumber.trim() : null,
      ifsc_code: paymentMethod === "bank_account" ? ifscCode.trim() : null,
      bank_name: paymentMethod === "bank_account" ? bankName.trim() : null,
      approval_status: "pending" as const,
      is_active: false,
    };

    if (account) {
      // Log change request
      await supabase.from("payment_change_requests").insert({
        payment_account_id: account.id,
        provider_type: providerType,
        provider_id: providerId,
        user_id: userId,
        old_details: {
          payment_method: account.payment_method,
          upi_id: account.upi_id,
          account_holder_name: account.account_holder_name,
          bank_account_number: account.bank_account_number,
          ifsc_code: account.ifsc_code,
          bank_name: account.bank_name,
        },
        new_details: {
          payment_method: paymentMethod,
          upi_id: payload.upi_id,
          account_holder_name: payload.account_holder_name,
          bank_account_number: payload.bank_account_number,
          ifsc_code: payload.ifsc_code,
          bank_name: payload.bank_name,
        },
      } as any);

      const { error } = await supabase.from("provider_payment_accounts")
        .update({
          ...payload,
          change_count: (account.change_count || 0) + 1,
          last_change_at: new Date().toISOString(),
        } as any)
        .eq("id", account.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("provider_payment_accounts").insert(payload as any);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    toast.success("Payment details submitted for admin approval");
    logAuditAction({ action: "update_payment_details", entityType: "payment_account", details: { providerType } });

    // Refresh
    const { data } = await supabase.from("provider_payment_accounts").select("*")
      .eq("provider_type", providerType).eq("provider_id", providerId).maybeSingle();
    setAccount(data);
    setSaving(false);
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="w-48 h-8" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );

  const statusIcon = !account ? null :
    account.approval_status === "approved" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
    account.approval_status === "rejected" ? <XCircle className="w-4 h-4 text-destructive" /> :
    <Clock className="w-4 h-4 text-amber-500" />;

  const statusLabel = !account ? "Not Set Up" :
    account.approval_status === "approved" ? "Approved & Active" :
    account.approval_status === "rejected" ? "Rejected" : "Pending Approval";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" /> Payment Settings
        </h2>
        {account && (
          <Badge variant={account.approval_status === "approved" ? "default" : account.approval_status === "rejected" ? "destructive" : "secondary"} className="flex items-center gap-1">
            {statusIcon} {statusLabel}
          </Badge>
        )}
      </div>

      {account?.approval_status === "rejected" && account.admin_notes && (
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Rejection Reason</p>
              <p className="text-sm text-muted-foreground">{account.admin_notes}</p>
            </div>
          </div>
        </Card>
      )}

      {account?.approval_status === "pending" && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-500 mt-0.5" />
            <p className="text-sm text-muted-foreground">Your payment details are under admin review. You'll be notified once approved.</p>
          </div>
        </Card>
      )}

      <Card className="p-5 space-y-5">
        <div>
          <Label className="text-sm font-semibold mb-3 block">Payment Method</Label>
          <RadioGroup value={paymentMethod} onValueChange={v => setPaymentMethod(v as any)} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="upi" id="upi" />
              <Label htmlFor="upi" className="cursor-pointer">UPI</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="bank_account" id="bank" />
              <Label htmlFor="bank" className="cursor-pointer">Bank Account</Label>
            </div>
          </RadioGroup>
        </div>

        {paymentMethod === "upi" ? (
          <div>
            <Label>UPI ID *</Label>
            <Input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="name@upi or 9876543210@paytm" />
            <p className="text-xs text-muted-foreground mt-1">Enter your verified UPI ID for receiving payments</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Account Holder Name *</Label>
              <Input value={holderName} onChange={e => setHolderName(e.target.value)} placeholder="As per bank records" />
            </div>
            <div>
              <Label>Bank Account Number *</Label>
              <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>IFSC Code *</Label>
                <Input value={ifscCode} onChange={e => setIfscCode(e.target.value.toUpperCase())} placeholder="SBIN0001234" maxLength={11} />
              </div>
              <div>
                <Label>Bank Name *</Label>
                <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="State Bank of India" />
              </div>
            </div>
          </div>
        )}

        {paymentMethod === "bank_account" && (
          <div>
            <Label>Account Holder Name *</Label>
            <Input value={holderName} onChange={e => setHolderName(e.target.value)} placeholder="Full name as per bank" className={paymentMethod === "upi" ? "hidden" : ""} />
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Submitting..." : account ? "Update & Submit for Approval" : "Save Payment Details"}
        </Button>
      </Card>

      {/* Security Info */}
      <Card className="p-4">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Security Notice</p>
            <p className="text-xs text-muted-foreground">Payment details require admin approval before activation. All changes are logged for security. Frequent changes may be flagged for review.</p>
          </div>
        </div>
      </Card>

      {/* Change History */}
      {changeRequests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Change History</h3>
          <div className="space-y-2">
            {changeRequests.map(cr => (
              <Card key={cr.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant={cr.status === "approved" ? "default" : cr.status === "rejected" ? "destructive" : "secondary"} className="text-xs capitalize">{cr.status}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(cr.created_at).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(cr.new_details as any)?.payment_method === "upi" ? "UPI" : "Bank Account"}
                  </p>
                </div>
                {cr.admin_notes && <p className="text-xs text-muted-foreground mt-1">Note: {cr.admin_notes}</p>}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
