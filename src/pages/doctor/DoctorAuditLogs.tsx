import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Clock } from "lucide-react";

export default function DoctorAuditLogs() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data } = await supabase
        .from("audit_logs" as any)
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      setLogs(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const actionColor = (action: string) => {
    if (action.includes("delete") || action.includes("cancel") || action.includes("reject")) return "destructive";
    if (action.includes("create") || action.includes("confirm") || action.includes("complete")) return "default";
    return "secondary";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-40 h-8 rounded" />
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Activity Log</h1>
      </div>
      <p className="text-sm text-muted-foreground">All actions are logged for security and compliance.</p>

      {logs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No activity logs yet</p>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-2">
            {logs.map((log: any) => (
              <Card key={log.id} className="p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={actionColor(log.action) as any} className="text-xs">
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{log.entity_type}</span>
                    </div>
                    {log.entity_id && (
                      <p className="text-xs text-muted-foreground">ID: {log.entity_id.slice(0, 8)}...</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
