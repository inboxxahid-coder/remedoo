import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Plus, Clock, ArrowLeft, Search } from "lucide-react";
import SupportChat from "@/components/support/SupportChat";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

export default function PatientSupportTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", category: "general", priority: "medium" });
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [chatTicket, setChatTicket] = useState<any>(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUserId(session.user.id);
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Realtime updates
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("patient-tickets-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.description.trim()) { toast.error("Subject and description required"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: existing } = await supabase.from("support_tickets").select("id").eq("user_id", session.user.id).in("status", ["open", "in_progress"]).limit(1);
    if (existing && existing.length > 0) { toast.error("You already have an open query. Please wait for it to be resolved."); return; }

    setSaving(true);
    const { data: newTicket, error } = await supabase.from("support_tickets").insert({
      user_id: session.user.id, subject: form.subject, description: form.description,
      category: form.category, priority: form.priority, sender_type: "patient",
    }).select().single();
    setSaving(false);
    if (error || !newTicket) { toast.error(error?.message || "Failed"); return; }

    // Send subject + description as the first chat message
    await supabase.from("support_ticket_messages").insert({
      ticket_id: newTicket.id,
      sender_id: session.user.id,
      sender_role: "user",
      message: `📋 **${form.subject.trim()}**\n\n${form.description.trim()}`,
    });

    toast.success("Ticket submitted");
    setDialogOpen(false);
    setForm({ subject: "", description: "", category: "general", priority: "medium" });
    load();
  };

  const handleCloseTicket = async () => {
    if (!chatTicket) return;
    const { error } = await supabase.from("support_tickets").update({ status: "closed" }).eq("id", chatTicket.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Query closed");
    setChatTicket(null);
    load();
  };

  const statusColor = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (s) { case "resolved": case "closed": return "default"; case "in_progress": return "secondary"; default: return "outline"; }
  };

  const hasOpenTicket = tickets.some(t => t.status === "open" || t.status === "in_progress");

  const filtered = tickets.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (t.ticket_number?.toString() || "").includes(q) ||
      (t.subject || "").toLowerCase().includes(q) ||
      (t.status || "").toLowerCase().includes(q)
    );
  });

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> My Queries
            </h1>
            <p className="text-xs text-muted-foreground">{tickets.length} total queries</p>
          </div>
          {!hasOpenTicket && (
            <Button size="sm" onClick={() => setDialogOpen(true)} className="text-xs">
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          )}
        </div>
        {/* Search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticket #, subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Ticket List */}
      <div className="px-4 pt-4 space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">
              {search ? "No queries match your search" : "No queries yet. Need help? Create a ticket."}
            </p>
            {!search && !hasOpenTicket && (
              <Button size="sm" onClick={() => setDialogOpen(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-1" /> Create Query
              </Button>
            )}
          </Card>
        ) : (
          filtered.map(t => (
            <Card
              key={t.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
              onClick={() => setChatTicket(t)}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">#{t.ticket_number}</span>
                  <Badge variant={statusColor(t.status)} className="text-[10px]">{t.status.replace("_", " ")}</Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{t.category}</Badge>
                </div>
                <p className="font-semibold text-foreground text-sm">{t.subject}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(t.created_at).toLocaleString()}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* New ticket dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Subject *</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief summary..." /></div>
            <div><Label>Description *</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your issue..." rows={4} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="payment">Payment</SelectItem><SelectItem value="appointment">Appointment</SelectItem><SelectItem value="order">Order</SelectItem><SelectItem value="technical">Technical</SelectItem></SelectContent></Select></div>
              <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? "Submitting..." : "Submit Ticket"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat dialog - larger */}
      <Dialog open={!!chatTicket} onOpenChange={(o) => { if (!o) { setChatTicket(null); load(); } }}>
        <DialogContent className="p-0 max-w-2xl h-[85vh] flex flex-col overflow-hidden">
          {chatTicket && (
            <SupportChat
              ticketId={chatTicket.id}
              ticketSubject={chatTicket.subject}
              ticketDescription={chatTicket.description}
              ticketNumber={chatTicket.ticket_number}
              ticketStatus={chatTicket.status}
              currentUserId={userId}
              onClose={() => { setChatTicket(null); load(); }}
              onCloseTicket={chatTicket.status !== "resolved" && chatTicket.status !== "closed" ? handleCloseTicket : undefined}
              onViewAllQueries={() => { setChatTicket(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
