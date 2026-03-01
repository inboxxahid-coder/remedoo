import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TestTube, MapPin, Clock, Phone, User, CheckCircle, Filter, Calendar
} from "lucide-react";

export default function LabSampleCollections() {
  const [labId, setLabId] = useState<string | null>(null);
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [collectorName, setCollectorName] = useState("");
  const [collectorPhone, setCollectorPhone] = useState("");

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: lab } = await supabase.from("labs").select("id").eq("user_id", session.user.id).maybeSingle();
    if (!lab) { setLoading(false); return; }
    setLabId(lab.id);
    const { data } = await supabase.from("lab_sample_collections").select("*").eq("lab_id", lab.id).order("scheduled_date", { ascending: false });
    setSamples(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = samples.filter(s => statusFilter === "all" || s.status === statusFilter);

  const updateStatus = async (id: string, status: string, extra?: Record<string, any>) => {
    const { error } = await supabase.from("lab_sample_collections").update({ status, ...extra }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Sample ${status}`);
    load();
  };

  const handleAssignCollector = () => {
    if (!selected || !collectorName.trim()) { toast.error("Collector name required"); return; }
    updateStatus(selected.id, "scheduled", { collector_name: collectorName, collector_phone: collectorPhone || null });
    setDialogOpen(false);
    setCollectorName("");
    setCollectorPhone("");
  };

  const statusColor = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (s) {
      case "collected": case "completed": return "default";
      case "processing": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const todayCount = samples.filter(s => s.scheduled_date === new Date().toISOString().split("T")[0] && s.status !== "cancelled").length;
  const homeCount = samples.filter(s => s.collection_type === "home" && s.status === "scheduled").length;

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TestTube className="w-6 h-6 text-primary" /> Sample Collections
        </h1>
        <div className="flex gap-2">
          <Badge variant="outline">{todayCount} today</Badge>
          {homeCount > 0 && <Badge variant="secondary">{homeCount} home pickups</Badge>}
        </div>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-48">
          <Filter className="w-4 h-4 mr-1" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="collected">Collected</SelectItem>
          <SelectItem value="processing">Processing</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No sample collections found</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <Card key={s.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{s.test_name}</p>
                    <Badge variant={statusColor(s.status)}>{s.status}</Badge>
                    <Badge variant={s.collection_type === "home" ? "secondary" : "outline"} className="text-xs">
                      {s.collection_type === "home" ? "🏠 Home" : "🏥 Walk-in"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {s.scheduled_date} {s.scheduled_time && `· ${s.scheduled_time}`}
                  </p>
                  <p className="text-xs text-muted-foreground">Sample: {s.sample_type} · v{s.report_version}</p>
                  {s.collection_type === "home" && s.collection_address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {s.collection_address}
                    </p>
                  )}
                  {s.collector_name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" /> Collector: {s.collector_name}
                      {s.collector_phone && ` · ${s.collector_phone}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {s.status === "scheduled" && s.collection_type === "home" && !s.collector_name && (
                    <Button size="sm" variant="outline" onClick={() => { setSelected(s); setDialogOpen(true); }}>
                      Assign Collector
                    </Button>
                  )}
                  {s.status === "scheduled" && (
                    <Button size="sm" onClick={() => updateStatus(s.id, "collected", { collected_at: new Date().toISOString() })}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Collected
                    </Button>
                  )}
                  {s.status === "collected" && (
                    <Button size="sm" onClick={() => updateStatus(s.id, "processing")}>
                      Start Processing
                    </Button>
                  )}
                  {s.status === "processing" && (
                    <Button size="sm" onClick={() => updateStatus(s.id, "completed")}>
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Collector</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Collector Name *</Label>
              <Input value={collectorName} onChange={e => setCollectorName(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={collectorPhone} onChange={e => setCollectorPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignCollector}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
