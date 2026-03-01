import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Filter, CheckCircle, AlertTriangle } from "lucide-react";

export default function AdminSupportTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [response, setResponse] = useState("");

  const load = async () => {
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = tickets.filter(t => statusFilter === "all" || t.status === statusFilter);

  const handleResolve = async () => {
    if (!selected || !response.trim()) { toast.error("Please provide a response"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("support_tickets").update({
      status: "resolved",
      admin_response: response,
      resolved_by: session.user.id,
      resolved_at: new Date().toISOString(),
    }).eq("id", selected.id);

    if (error) { toast.error(error.message); return; }
    toast.success("Ticket resolved");
    setDialogOpen(false);
    setResponse("");
    load();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Ticket ${status}`); load(); }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "urgent": return "destructive";
      case "high": return "destructive";
      case "medium": return "outline";
      default: return "secondary";
    }
  };

  const statusBadge = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (s) {
      case "resolved": case "closed": return "default";
      case "in_progress": return "secondary";
      default: return "outline";
    }
  };

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
          <MessageSquare className="w-6 h-6 text-primary" /> Support Tickets
        </h1>
        <Badge variant="outline">{tickets.filter(t => t.status === "open").length} open</Badge>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-48">
          <Filter className="w-4 h-4 mr-1" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No tickets found</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <Card key={t.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{t.subject}</p>
                    <Badge variant={statusBadge(t.status)}>{t.status.replace("_", " ")}</Badge>
                    <Badge variant={priorityColor(t.priority) as any} className="text-xs">{t.priority}</Badge>
                    <Badge variant="outline" className="text-xs">{t.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                  {t.admin_response && (
                    <p className="text-xs text-primary mt-1">💬 Response: {t.admin_response}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {t.status === "open" && (
                    <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(t.id, "in_progress")}>
                      Take Up
                    </Button>
                  )}
                  {(t.status === "open" || t.status === "in_progress") && (
                    <Button size="sm" onClick={() => { setSelected(t); setResponse(""); setDialogOpen(true); }}>
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve: {selected?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{selected?.description}</p>
            <div>
              <Label>Admin Response *</Label>
              <Textarea value={response} onChange={e => setResponse(e.target.value)} placeholder="Your response to the user..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleResolve}>
              <CheckCircle className="w-4 h-4 mr-1" /> Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
