import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Loader2, LogOut, RefreshCw, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ActiveSession {
  id: string;
  user_id: string;
  device_info: string | null;
  ip_address: string | null;
  last_active_at: string;
  created_at: string;
  is_active: boolean;
  profiles?: { full_name: string; email: string } | null;
}

export default function AdminSessions() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("active_sessions")
      .select("*, profiles:user_id(full_name, email)")
      .eq("is_active", true)
      .order("last_active_at", { ascending: false });

    if (error) {
      toast.error("Failed to load sessions");
    } else {
      setSessions((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleTerminate = async (sessionId: string) => {
    const { error } = await supabase
      .from("active_sessions")
      .update({ is_active: false })
      .eq("id", sessionId);

    if (error) {
      toast.error("Failed to terminate session");
    } else {
      toast.success("Session terminated");
      fetchSessions();
    }
  };

  const handleTerminateAll = async (userId: string) => {
    const { error } = await supabase
      .from("active_sessions")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      toast.error("Failed to terminate sessions");
    } else {
      toast.success("All sessions terminated for user");
      fetchSessions();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Session Management</h1>
            <p className="text-sm text-muted-foreground">View and manage active user sessions</p>
          </div>
        </div>
        <Button onClick={fetchSessions} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Monitor className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No active sessions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const profile = s.profiles as any;
            return (
              <div key={s.id} className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {profile?.full_name || profile?.email || s.user_id.slice(0, 8)}
                  </p>
                  {profile?.email && (
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {s.device_info && (
                      <Badge variant="secondary" className="text-xs">{s.device_info}</Badge>
                    )}
                    {s.ip_address && (
                      <Badge variant="outline" className="text-xs">{s.ip_address}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Last active: {format(new Date(s.last_active_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleTerminateAll(s.user_id)} className="text-xs">
                    Logout All
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleTerminate(s.id)} className="gap-1 text-xs">
                    <LogOut className="w-3.5 h-3.5" /> End
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
