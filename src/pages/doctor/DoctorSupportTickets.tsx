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
import { MessageSquare, Plus, Clock } from "lucide-react";
import SupportChat from "@/components/support/SupportChat";

export default function DoctorSupportTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", category: "general", priority: "medium" });
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [chatTicket, setChatTicket] = useState<any>(null);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUserId(session.user.id);
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.description.trim()) { toast.error("Subject and description required"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setSaving(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: session.user.id, subject: form.subject, description: form.description,
      category: form.category, priority: form.priority, sender_type: "doctor",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
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

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><MessageSquare className="w-6 h-6 text-primary" /> Support Tickets</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1" /> New Ticket</Button>
      </div>
      {tickets.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No support tickets yet.</p></Card>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <Card key={t.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setChatTicket(t)}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-primary font-bold">#{t.ticket_number}</span>
                <p className="font-semibold text-foreground">{t.subject}</p>
                <Badge variant={statusColor(t.status)}>{t.status.replace("_", " ")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">{t.description}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(t.created_at).toLocaleString()}</p>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Subject *</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief summary..." /></div>
            <div><Label>Description *</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your issue..." rows={4} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="payment">Payment</SelectItem><SelectItem value="appointment">Appointment</SelectItem><SelectItem value="technical">Technical</SelectItem></SelectContent></Select></div>
              <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? "Submitting..." : "Submit Ticket"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!chatTicket} onOpenChange={(o) => { if (!o) setChatTicket(null); }}>
        <DialogContent className="p-0 max-w-lg h-[70vh] flex flex-col overflow-hidden">
          {chatTicket && (
            <SupportChat ticketId={chatTicket.id} ticketSubject={chatTicket.subject} ticketDescription={chatTicket.description} ticketNumber={chatTicket.ticket_number} ticketStatus={chatTicket.status} currentUserId={userId}
              onClose={() => setChatTicket(null)}
              onCloseTicket={chatTicket.status !== "resolved" && chatTicket.status !== "closed" ? handleCloseTicket : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
