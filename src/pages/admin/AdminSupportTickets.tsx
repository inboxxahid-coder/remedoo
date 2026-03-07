import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Filter, Clock } from "lucide-react";
import SupportChat from "@/components/support/SupportChat";

export default function AdminSupportTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [chatTicket, setChatTicket] = useState<any>(null);
  const [userId, setUserId] = useState("");

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setUserId(session.user.id);
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = tickets.filter(t => statusFilter === "all" || t.status === statusFilter);

  const handleCloseTicket = async () => {
    if (!chatTicket) return;
    const { error } = await supabase.from("support_tickets").update({
      status: "resolved",
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    }).eq("id", chatTicket.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Query resolved & closed");
    setChatTicket(null);
    load();
  };

  const priorityColor = (p: string) => {
    switch (p) { case "urgent": case "high": return "destructive"; case "medium": return "outline"; default: return "secondary"; }
  };

  const statusBadge = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (s) { case "resolved": case "closed": return "default"; case "in_progress": return "secondary"; default: return "outline"; }
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
        <SelectTrigger className="w-48"><Filter className="w-4 h-4 mr-1" /><SelectValue /></SelectTrigger>
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
            <Card key={t.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setChatTicket(t)}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{t.subject}</p>
                    <Badge variant={statusBadge(t.status)}>{t.status.replace("_", " ")}</Badge>
                    <Badge variant={priorityColor(t.priority) as any} className="text-xs">{t.priority}</Badge>
                    <Badge variant="outline" className="text-xs">{t.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{t.description}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); setChatTicket(t); }}>
                  Open Chat
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!chatTicket} onOpenChange={(o) => { if (!o) setChatTicket(null); }}>
        <DialogContent className="p-0 max-w-lg h-[70vh] flex flex-col overflow-hidden">
          {chatTicket && (
            <SupportChat
              ticketId={chatTicket.id}
              ticketSubject={chatTicket.subject}
              ticketStatus={chatTicket.status}
              currentUserId={userId}
              isAdmin
              onClose={() => setChatTicket(null)}
              onCloseTicket={chatTicket.status !== "resolved" && chatTicket.status !== "closed" ? handleCloseTicket : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
