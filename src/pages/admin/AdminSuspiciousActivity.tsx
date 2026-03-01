import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldAlert, Filter, CheckCircle, Eye } from "lucide-react";

export default function AdminSuspiciousActivity() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("all");

  const load = async () => {
    const { data } = await supabase.from("suspicious_activity_logs").select("*").order("created_at", { ascending: false }).limit(200);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l => severityFilter === "all" || l.severity === severityFilter);

  const handleResolve = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("suspicious_activity_logs").update({
      resolved: true,
      resolved_by: session.user.id,
      resolved_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Marked resolved"); load(); }
  };

  const severityColor = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (s) {
      case "critical": case "high": return "destructive";
      case "medium": return "outline";
      default: return "secondary";
    }
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="w-48 h-8 rounded" />
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-destructive" /> Suspicious Activity
        </h1>
        <Badge variant="destructive">{logs.filter(l => !l.resolved).length} unresolved</Badge>
      </div>

      <Select value={severityFilter} onValueChange={setSeverityFilter}>
        <SelectTrigger className="w-48">
          <Filter className="w-4 h-4 mr-1" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Severity</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No suspicious activity detected</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(log => (
            <Card key={log.id} className={`p-4 ${!log.resolved ? "border-destructive/30" : ""}`}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={severityColor(log.severity)}>{log.severity}</Badge>
                    <Badge variant="outline" className="text-xs">{log.activity_type.replace("_", " ")}</Badge>
                    {log.resolved && <Badge variant="default" className="text-xs">Resolved</Badge>}
                  </div>
                  <p className="text-sm text-foreground">{log.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                    {log.ip_address && ` · IP: ${log.ip_address}`}
                  </p>
                </div>
                {!log.resolved && (
                  <Button size="sm" variant="outline" onClick={() => handleResolve(log.id)}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Resolve
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
