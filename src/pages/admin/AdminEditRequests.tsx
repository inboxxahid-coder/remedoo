import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, FileEdit, Eye } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";

export default function AdminEditRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("consultation_edit_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-edit-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "consultation_edit_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAction = async (status: "approved" | "rejected") => {
    if (!selected) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("consultation_edit_requests")
      .update({
        status,
        admin_notes: adminNotes || null,
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
      } as any)
      .eq("id", selected.id);

    if (error) { toast.error(error.message); return; }

    // If approved, apply the edit to the appointment
    if (status === "approved") {
      await supabase
        .from("appointments")
        .update({ [selected.field_name]: selected.new_value } as any)
        .eq("id", selected.appointment_id);
      toast.success("Edit approved and applied");
    } else {
      toast.success("Edit request rejected");
    }

    setReviewDialog(false);
    setAdminNotes("");
    load();
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "pending": return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case "approved": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1"><CheckCircle className="w-3 h-3" /> Approved</Badge>;
      case "rejected": return <Badge className="bg-red-500/10 text-red-600 border-red-200 gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
      default: return <Badge variant="secondary">{s}</Badge>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <FileEdit className="w-5 h-5 text-primary" />
          Consultation Edit Requests
        </h1>
        <Badge variant="outline">{requests.filter(r => r.status === "pending").length} pending</Badge>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No edit requests</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Old Value</TableHead>
                    <TableHead>New Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{format(parseISO(r.created_at), "MMM d, h:mm a")}</TableCell>
                      <TableCell className="font-medium capitalize">{r.field_name.replace(/_/g, " ")}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{r.old_value || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{r.new_value}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => { setSelected(r); setAdminNotes(r.admin_notes || ""); setReviewDialog(true); }}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-border">
              {requests.map((r) => (
                <div key={r.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{r.field_name.replace(/_/g, " ")}</span>
                    {statusBadge(r.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">Old: {r.old_value || "—"}</p>
                  <p className="text-xs text-foreground">New: {r.new_value}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(r.created_at), "MMM d, h:mm a")}</p>
                  <Button size="sm" variant="outline" onClick={() => { setSelected(r); setAdminNotes(r.admin_notes || ""); setReviewDialog(true); }}>
                    Review
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Edit Request</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Field</p>
                  <p className="text-sm font-medium capitalize">{selected.field_name.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Requested</p>
                  <p className="text-sm">{format(parseISO(selected.created_at), "MMM d, yyyy h:mm a")}</p>
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Old Value</p>
                <p className="text-sm">{selected.old_value || "—"}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">New Value</p>
                <p className="text-sm">{selected.new_value}</p>
              </div>
              {selected.status === "pending" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Admin Notes (optional)</p>
                  <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Add notes..." />
                </div>
              )}
              {selected.admin_notes && selected.status !== "pending" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Admin Notes</p>
                  <p className="text-sm">{selected.admin_notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selected?.status === "pending" ? (
              <>
                <Button variant="outline" onClick={() => handleAction("rejected")}>
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button onClick={() => handleAction("approved")}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Approve & Apply
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setReviewDialog(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
