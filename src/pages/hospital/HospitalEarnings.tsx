import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/exportCsv";
import { logAuditAction } from "@/lib/auditLog";
import { IndianRupee, TrendingUp, Calendar, Download, Filter, Percent } from "lucide-react";

export default function HospitalEarnings() {
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [hospital, setHospital] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data: hosp } = await supabase.from("hospitals").select("*").eq("user_id", session.user.id).maybeSingle();
      if (!hosp) { setLoading(false); return; }
      setHospital(hosp);

      const { data } = await supabase.from("hospital_earnings").select("*").eq("hospital_id", hosp.id).order("created_at", { ascending: false });
      setEarnings(data || []);
      setLoading(false);
      logAuditAction({ action: "view_earnings", entityType: "hospital_earnings" });
    };
    load();
  }, []);

  const filtered = earnings.filter(e => {
    const d = e.created_at.split("T")[0];
    return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
  });

  const totalRevenue = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalCommission = filtered.reduce((s, e) => s + Number(e.platform_commission || 0), 0);
  const totalNet = filtered.reduce((s, e) => s + Number(e.net_earning || 0), 0);

  const today = new Date().toISOString().split("T")[0];
  const todayNet = earnings.filter(e => e.created_at.startsWith(today)).reduce((s, e) => s + Number(e.net_earning || 0), 0);
  const monthStart = new Date(); monthStart.setDate(1);
  const monthStr = monthStart.toISOString().split("T")[0];
  const monthlyNet = earnings.filter(e => e.created_at.split("T")[0] >= monthStr).reduce((s, e) => s + Number(e.net_earning || 0), 0);

  const handleExport = () => {
    exportToCsv("hospital_earnings", filtered.map(e => ({
      Date: new Date(e.created_at).toLocaleDateString(),
      Type: e.type, Amount: `₹${e.amount}`, Commission: `₹${e.platform_commission}`, Net: `₹${e.net_earning}`, Description: e.description || "",
    })));
    logAuditAction({ action: "export_earnings_csv", entityType: "hospital_earnings" });
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <IndianRupee className="w-6 h-6 text-primary" /> Earnings
        </h1>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10">
          <IndianRupee className="w-5 h-5 text-primary mb-1" />
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-xl font-bold text-foreground">₹{totalRevenue.toLocaleString()}</p>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <Percent className="w-5 h-5 text-amber-500 mb-1" />
          <p className="text-xs text-muted-foreground">Platform Commission</p>
          <p className="text-xl font-bold text-foreground">₹{totalCommission.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{hospital?.platform_commission_percent || 10}%</p>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
          <TrendingUp className="w-5 h-5 text-emerald-500 mb-1" />
          <p className="text-xs text-muted-foreground">This Month</p>
          <p className="text-xl font-bold text-foreground">₹{monthlyNet.toLocaleString()}</p>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
          <Calendar className="w-5 h-5 text-blue-500 mb-1" />
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="text-xl font-bold text-foreground">₹{todayNet.toLocaleString()}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3"><Filter className="w-4 h-4 text-muted-foreground" /><p className="text-sm font-medium text-foreground">Filter by Date</p></div>
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        {(dateFrom || dateTo) && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{filtered.length} transactions · Net ₹{totalNet.toLocaleString()}</p>
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>
          </div>
        )}
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Transaction History</h2>
        {filtered.length === 0 ? (
          <Card className="p-8 text-center"><p className="text-muted-foreground">No earnings recorded yet</p></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(e => (
              <Card key={e.id} className="p-3 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.description || e.type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">+₹{Number(e.net_earning).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Commission: ₹{Number(e.platform_commission).toLocaleString()}</p>
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
