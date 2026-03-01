import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/exportCsv";
import { logAuditAction } from "@/lib/auditLog";
import { IndianRupee, TrendingUp, Calendar, Download, Filter } from "lucide-react";

export default function DoctorEarnings() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [consultationFee, setConsultationFee] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: doctor } = await supabase
        .from("doctors")
        .select("id, consultation_fee")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!doctor) { setLoading(false); return; }
      setConsultationFee(doctor.consultation_fee ?? 0);

      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("doctor_id", doctor.id)
        .eq("status", "completed")
        .order("appointment_date", { ascending: false });

      setAppointments(data || []);
      setLoading(false);
      logAuditAction({ action: "view_earnings", entityType: "earnings" });
    };
    load();
  }, []);

  const filtered = appointments.filter(apt => {
    const matchFrom = !dateFrom || apt.appointment_date >= dateFrom;
    const matchTo = !dateTo || apt.appointment_date <= dateTo;
    return matchFrom && matchTo;
  });

  const totalRevenue = filtered.length * consultationFee;
  const today = new Date().toISOString().split("T")[0];
  const todayEarnings = appointments.filter(a => a.appointment_date === today).length * consultationFee;

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];
  const monthlyEarnings = appointments.filter(a => a.appointment_date >= monthStartStr).length * consultationFee;

  const handleExportCsv = () => {
    const rows = filtered.map(a => ({
      Date: a.appointment_date,
      Time: a.appointment_time,
      Service: a.service_type,
      Amount: `₹${consultationFee}`,
      Status: a.status,
    }));
    exportToCsv("doctor_earnings", rows);
    logAuditAction({ action: "export_earnings_csv", entityType: "earnings" });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-40 h-8 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">Earnings</h1>
        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Lifetime</p>
              <p className="text-xl font-bold text-foreground">₹{(appointments.length * consultationFee).toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-xl font-bold text-foreground">₹{monthlyEarnings.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="text-xl font-bold text-foreground">₹{todayEarnings.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Filter by Date</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        {(dateFrom || dateTo) && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{filtered.length} transactions · ₹{totalRevenue.toLocaleString()}</p>
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>
          </div>
        )}
      </Card>

      {/* Transaction History */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Transaction History</h2>
        {filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No completed appointments found</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(apt => (
              <Card key={apt.id} className="p-3 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{apt.service_type}</p>
                    <p className="text-xs text-muted-foreground">{apt.appointment_date} · {apt.appointment_time}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">+₹{consultationFee}</p>
                    <Badge variant="secondary" className="text-xs">Completed</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
