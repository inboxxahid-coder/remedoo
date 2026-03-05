import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/exportCsv";
import { ScrollText, Download, Search } from "lucide-react";

export default function LabAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("audit_logs").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(200);
      setLogs(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = logs.filter(l => l.action.toLowerCase().includes(search.toLowerCase()) || l.entity_type.toLowerCase().includes(search.toLowerCase()));

  const handleExport = () => {
    exportToCsv("lab_audit_logs", filtered.map(l => ({ Date: new Date(l.created_at).toLocaleString(), Action: l.action, Entity: l.entity_type, EntityId: l.entity_id || "", Details: JSON.stringify(l.details || {}) })));
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><ScrollText className="w-6 h-6 text-primary" /> Audit Logs</h1>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}><Download className="w-4 h-4 mr-1" /> Export</Button>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No audit logs</p></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(l => (
            <Card key={l.id} className="p-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div><p className="text-sm font-medium text-foreground">{l.action}</p><p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</p></div>
                <Badge variant="outline">{l.entity_type}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
