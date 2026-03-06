import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Send, Megaphone, Clock } from "lucide-react";
import { toast } from "sonner";

export default function AdminBroadcast() {
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", target_audience: "all" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("broadcast_notifications").select("*").order("created_at", { ascending: false });
    setBroadcasts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) { toast.error("Title and message required"); return; }
    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Not authenticated"); setSending(false); return; }

    // Save broadcast record
    const { error: broadcastError } = await supabase.from("broadcast_notifications").insert({
      title: form.title, message: form.message, target_audience: form.target_audience, sent_by: session.user.id
    });
    if (broadcastError) { toast.error(broadcastError.message); setSending(false); return; }

    // Get target users and create notifications
    let query = supabase.from("profiles").select("user_id");
    const { data: profiles } = await query;

    if (profiles && profiles.length > 0) {
      const notifications = profiles.map(p => ({
        user_id: p.user_id,
        type: "system" as const,
        title: form.title,
        message: form.message,
        path: "/notifications",
      }));

      // Insert in batches of 100
      for (let i = 0; i < notifications.length; i += 100) {
        await supabase.from("notifications").insert(notifications.slice(i, i + 100));
      }
    }

    toast.success(`Broadcast sent to ${profiles?.length || 0} users`);
    setDialogOpen(false);
    setForm({ title: "", message: "", target_audience: "all" });
    setSending(false);
    load();
  };

  const audienceBadge = (a: string) => {
    const labels: Record<string, string> = { all: "All Users", patients: "Patients", doctors: "Doctors", hospitals: "Hospitals", labs: "Labs", pharmacies: "Pharmacies" };
    return <Badge variant="outline" className="capitalize">{labels[a] || a}</Badge>;
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Megaphone className="w-6 h-6 text-primary" /> Broadcast Notifications</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Send className="w-4 h-4 mr-1" /> Send Broadcast</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Send Broadcast Notification</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Health Campaign Alert" /></div>
              <div><Label>Message</Label><Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Your message..." rows={4} /></div>
              <div><Label>Target Audience</Label>
                <Select value={form.target_audience} onValueChange={v => setForm(f => ({ ...f, target_audience: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="patients">Patients Only</SelectItem>
                    <SelectItem value="doctors">Doctors Only</SelectItem>
                    <SelectItem value="hospitals">Hospitals Only</SelectItem>
                    <SelectItem value="labs">Labs Only</SelectItem>
                    <SelectItem value="pharmacies">Pharmacies Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleSend} disabled={sending}>{sending ? "Sending..." : "Send Now"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {broadcasts.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No broadcasts sent yet</p></Card>
      ) : (
        <div className="space-y-3">
          {broadcasts.map(b => (
            <Card key={b.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{b.title}</span>
                    {audienceBadge(b.target_audience)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{b.message}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> {new Date(b.sent_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
