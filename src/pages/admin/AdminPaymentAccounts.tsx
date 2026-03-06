import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, CheckCircle2, XCircle, Clock, AlertTriangle, Shield, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminPaymentAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [reviewDialog, setReviewDialog] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    const [accRes, crRes] = await Promise.all([
      supabase.from("provider_payment_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_change_requests").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setAccounts(accRes.data || []);
    setChangeRequests(crRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = accounts.filter(a => {
    if (typeFilter !== "all" && a.provider_type !== typeFilter) return false;
    if (statusFilter !== "all" && a.approval_status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (a.upi_id || "").toLowerCase().includes(s) ||
        (a.account_holder_name || "").toLowerCase().includes(s) ||
        (a.bank_name || "").toLowerCase().includes(s) ||
        a.provider_type.includes(s);
    }
    return true;
  });

  const pendingCount = accounts.filter(a => a.approval_status === "pending").length;
  const approvedCount = accounts.filter(a => a.approval_status === "approved").length;
  const suspiciousCount = accounts.filter(a => a.change_count >= 3).length;

  const handleReview = async (status: "approved" | "rejected") => {
    if (!reviewDialog) return;
    setProcessing(true);

    const { error } = await supabase.from("provider_payment_accounts").update({
      approval_status: status,
      is_active: status === "approved",
      admin_notes: adminNotes || null,
      reviewed_at: new Date().toISOString(),
    } as any).eq("id", reviewDialog.id);

    if (error) { toast.error(error.message); setProcessing(false); return; }

    // Also update the latest change request if exists
    const latestCr = changeRequests.find(cr => cr.payment_account_id === reviewDialog.id && cr.status === "pending");
    if (latestCr) {
      await supabase.from("payment_change_requests").update({
        status,
        admin_notes: adminNotes || null,
        reviewed_at: new Date().toISOString(),
      } as any).eq("id", latestCr.id);
    }

    toast.success(`Payment account ${status}`);
    setReviewDialog(null);
    setAdminNotes("");
    setProcessing(false);
    load();
  };

  const handleFlag = async (accountId: string) => {
    await supabase.from("provider_payment_accounts").update({
      approval_status: "rejected",
      is_active: false,
      admin_notes: "Flagged for suspicious activity",
    } as any).eq("id", accountId);
    toast.success("Account flagged and disabled");
    load();
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="w-56 h-8" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <CreditCard className="w-6 h-6 text-primary" /> Payment Account Management
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <Clock className="w-5 h-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending Review</p>
        </Card>
        <Card className="p-4 text-center">
          <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold">{approvedCount}</p>
          <p className="text-xs text-muted-foreground">Verified</p>
        </Card>
        <Card className="p-4 text-center">
          <AlertTriangle className="w-5 h-5 mx-auto text-destructive mb-1" />
          <p className="text-2xl font-bold">{suspiciousCount}</p>
          <p className="text-xs text-muted-foreground">Suspicious (3+ changes)</p>
        </Card>
        <Card className="p-4 text-center">
          <Shield className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{accounts.length}</p>
          <p className="text-xs text-muted-foreground">Total Accounts</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by UPI, name, bank..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="doctor">Doctor</SelectItem>
            <SelectItem value="hospital">Hospital</SelectItem>
            <SelectItem value="lab">Lab</SelectItem>
            <SelectItem value="pharmacy">Pharmacy</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Payment Accounts ({filtered.length})</TabsTrigger>
          <TabsTrigger value="changes">Change Requests ({changeRequests.filter(cr => cr.status === "pending").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          {filtered.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No payment accounts found</p></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(a => (
                <Card key={a.id} className={`p-4 ${a.change_count >= 3 ? "border-destructive/30" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="capitalize text-xs">{a.provider_type}</Badge>
                        <Badge variant={a.approval_status === "approved" ? "default" : a.approval_status === "rejected" ? "destructive" : "secondary"} className="text-xs capitalize">
                          {a.approval_status}
                        </Badge>
                        {a.change_count >= 3 && <Badge variant="destructive" className="text-xs">⚠ {a.change_count} changes</Badge>}
                      </div>
                      <div className="text-sm text-foreground">
                        {a.payment_method === "upi" ? (
                          <p><span className="text-muted-foreground">UPI:</span> {a.upi_id}</p>
                        ) : (
                          <>
                            <p><span className="text-muted-foreground">Account:</span> {a.account_holder_name} — {a.bank_name}</p>
                            <p className="text-xs text-muted-foreground">A/C: ****{(a.bank_account_number || "").slice(-4)} · IFSC: {a.ifsc_code}</p>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Provider ID: {a.provider_id?.slice(0, 8)}... · Updated: {new Date(a.updated_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setReviewDialog(a); setAdminNotes(a.admin_notes || ""); }}>
                        <Eye className="w-3 h-3 mr-1" /> Review
                      </Button>
                      {a.approval_status !== "rejected" && (
                        <Button size="sm" variant="destructive" onClick={() => handleFlag(a.id)}>Flag</Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="changes" className="mt-4 space-y-3">
          {changeRequests.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No change requests</p></Card>
          ) : changeRequests.map(cr => (
            <Card key={cr.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="capitalize text-xs">{cr.provider_type}</Badge>
                    <Badge variant={cr.status === "approved" ? "default" : cr.status === "rejected" ? "destructive" : "secondary"} className="text-xs capitalize">{cr.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(cr.old_details as any)?.payment_method || "New"} → {(cr.new_details as any)?.payment_method}
                    {" · "}{new Date(cr.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => { setReviewDialog(null); setAdminNotes(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Payment Account</DialogTitle>
          </DialogHeader>
          {reviewDialog && (
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <p><strong>Type:</strong> <span className="capitalize">{reviewDialog.provider_type}</span></p>
                <p><strong>Method:</strong> {reviewDialog.payment_method === "upi" ? "UPI" : "Bank Account"}</p>
                {reviewDialog.payment_method === "upi" ? (
                  <p><strong>UPI ID:</strong> {reviewDialog.upi_id}</p>
                ) : (
                  <>
                    <p><strong>Holder:</strong> {reviewDialog.account_holder_name}</p>
                    <p><strong>Account:</strong> {reviewDialog.bank_account_number}</p>
                    <p><strong>IFSC:</strong> {reviewDialog.ifsc_code}</p>
                    <p><strong>Bank:</strong> {reviewDialog.bank_name}</p>
                  </>
                )}
                <p><strong>Changes:</strong> {reviewDialog.change_count}</p>
              </div>
              <div>
                <Label>Admin Notes</Label>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Optional notes..." />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => handleReview("rejected")} disabled={processing}>
              <XCircle className="w-4 h-4 mr-1" /> Reject
            </Button>
            <Button onClick={() => handleReview("approved")} disabled={processing}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
