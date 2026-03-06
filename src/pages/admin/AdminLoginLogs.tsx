import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Search, Clock, User, Activity } from "lucide-react";

export default function AdminLoginLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let query = supabase.from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      
      if (typeFilter !== "all") {
        query = query.eq("entity_type", typeFilter);
      }

      const { data } = await query;
      setLogs(data || []);
      setLoading(false);
    };
    load();
  }, [typeFilter]);

  const filtered = search.trim()
    ? logs.filter(l => l.action?.toLowerCase().includes(search.toLowerCase()) || l.entity_type?.toLowerCase().includes(search.toLowerCase()) || l.user_id?.includes(search))
    : logs;

  const actionColor = (action: string) => {
    if (action.includes("login") || action.includes("Login")) return "default";
    if (action.includes("delete") || action.includes("Delete") || action.includes("cancel")) return "destructive";
    if (action.includes("update") || action.includes("Update") || action.includes("edit")) return "secondary";
    return "outline";
  };

  const stats = {
    total: logs.length,
    logins: logs.filter(l => l.action?.toLowerCase().includes("login")).length,
    updates: logs.filter(l => l.action?.toLowerCase().includes("update")).length,
    deletes: logs.filter(l => l.action?.toLowerCase().includes("delete")).length,
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Shield className="w-6 h-6 text-primary" /> Security & Audit Logs</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Logs", value: stats.total, icon: Activity },
          { label: "Logins", value: stats.logins, icon: User },
          { label: "Updates", value: stats.updates, icon: Clock },
          { label: "Deletions", value: stats.deletes, icon: Shield },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <s.icon className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 h-10 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..." className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Entity Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="appointment">Appointments</SelectItem>
            <SelectItem value="profile">Profiles</SelectItem>
            <SelectItem value="schedule">Schedule</SelectItem>
            <SelectItem value="prescription">Prescriptions</SelectItem>
            <SelectItem value="order">Orders</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No logs found</p></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(l => (
            <Card key={l.id} className="p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={actionColor(l.action) as any} className="text-xs">{l.action}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{l.entity_type}</Badge>
                  <span className="text-xs text-muted-foreground">User: {l.user_id?.slice(0, 8)}...</span>
                  {l.entity_id && <span className="text-xs text-muted-foreground">Entity: {l.entity_id.slice(0, 8)}...</span>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
              </div>
              {l.details && Object.keys(l.details).length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{JSON.stringify(l.details)}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
