import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { RotateCcw, CheckCircle, Clock, XCircle, IndianRupee } from "lucide-react";
import { toast } from "sonner";

export default function AdminRefunds() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    let query = supabase.from("appointments")
      .select("id, patient_id, appointment_date, appointment_time, service_type, status, payment_status, payment_method, doctors(name), hospitals(name), labs(name), profiles!appointments_patient_id_fkey(full_name)")
      .eq("status", "cancelled")
      .eq("payment_method", "online")
      .order("updated_at", { ascending: false })
      .limit(200);
    
    const { data } = await query;
    setRefunds(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateRefundStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ payment_status: status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Refund ${status}`);
    load();
  };

  const filtered = filter === "all" ? refunds : refunds.filter(r => r.payment_status === filter);

  const stats = {
    total: refunds.length,
    pending: refunds.filter(r => r.payment_status === "paid" || r.payment_status === "pending").length,
    refunded: refunds.filter(r => r.payment_status === "refunded").length,
    failed: refunds.filter(r => r.payment_status === "failed").length,
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><RotateCcw className="w-6 h-6 text-primary" /> Refund Management</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Cancellations", value: stats.total, icon: IndianRupee },
          { label: "Pending Refund", value: stats.pending, icon: Clock },
          { label: "Refunded", value: stats.refunded, icon: CheckCircle },
          { label: "Failed", value: stats.failed, icon: XCircle },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <s.icon className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-48"><SelectValue placeholder="Filter" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="paid">Pending Refund</SelectItem>
          <SelectItem value="refunded">Refunded</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No refunds to show</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const providerName = (r.doctors as any)?.name || (r.hospitals as any)?.name || (r.labs as any)?.name || "—";
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{(r.profiles as any)?.full_name || r.patient_id.slice(0, 8)}</span>
                      <Badge variant="outline" className="capitalize">{r.service_type}</Badge>
                      <Badge variant={r.payment_status === "refunded" ? "default" : r.payment_status === "failed" ? "destructive" : "secondary"} className="capitalize">
                        {r.payment_status === "paid" ? "Pending Refund" : r.payment_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Provider: {providerName} • {r.appointment_date} at {r.appointment_time}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {r.payment_status !== "refunded" && (
                      <Button size="sm" variant="default" onClick={() => updateRefundStatus(r.id, "refunded")}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Refunded
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
