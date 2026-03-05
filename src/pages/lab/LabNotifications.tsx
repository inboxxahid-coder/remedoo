import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Check } from "lucide-react";

export default function LabNotifications() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data } = await supabase.from("notifications").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(50);
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const channel = supabase.channel("lab-notifications").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => load()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", session.user.id).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("All marked as read");
  };

  const unread = notifications.filter(n => !n.read).length;
  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> Notifications</h1>
        {unread > 0 && <Button variant="outline" size="sm" onClick={markAllRead}><Check className="w-4 h-4 mr-1" /> Mark all read ({unread})</Button>}
      </div>
      {notifications.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No notifications</p></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <Card key={n.id} className={`p-4 cursor-pointer transition-shadow hover:shadow-sm ${!n.read ? "border-primary/30 bg-primary/5" : ""}`} onClick={() => !n.read && markRead(n.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><p className="font-medium text-foreground text-sm">{n.title}</p>{!n.read && <Badge variant="default" className="text-xs">New</Badge>}</div>
                  {n.message && <p className="text-xs text-muted-foreground">{n.message}</p>}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(n.created_at).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
