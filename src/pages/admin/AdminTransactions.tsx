import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Receipt, IndianRupee, ArrowUpRight, ArrowDownRight, Calendar, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { format, subDays, startOfDay, isAfter } from "date-fns";

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#06b6d4"];

export default function AdminTransactions() {
  const [providerEarnings, setProviderEarnings] = useState<any[]>([]);
  const [hospitalEarnings, setHospitalEarnings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let txQuery = supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(500);
      if (serviceFilter !== "all") txQuery = txQuery.eq("service_type", serviceFilter);

      const [peRes, heRes, txRes] = await Promise.all([
        supabase.from("provider_earnings").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("hospital_earnings").select("*, hospitals(name)").order("created_at", { ascending: false }).limit(200),
        txQuery,
      ]);
      setProviderEarnings(peRes.data || []);
      setHospitalEarnings(heRes.data || []);
      setTransactions(txRes.data || []);
      setLoading(false);
    };
    load();
  }, [serviceFilter]);

  if (loading) return <div className="space-y-4"><Skeleton className="w-56 h-8" /><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div></div>;

  const totalRevenue = providerEarnings.reduce((s, e) => s + (e.commission_amount || 0), 0) + hospitalEarnings.reduce((s, e) => s + (e.platform_commission || 0), 0);
  const totalPayout = providerEarnings.reduce((s, e) => s + (e.net_amount || 0), 0) + hospitalEarnings.reduce((s, e) => s + (e.net_earning || 0), 0);

  const txTotal = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
  const txCommission = transactions.reduce((s, t) => s + Number(t.platform_commission || 0), 0);
  const today = startOfDay(new Date());
  const todayTx = transactions.filter(t => isAfter(new Date(t.created_at), today)).reduce((s, t) => s + Number(t.amount || 0), 0);

  // Daily trend
  const dailyMap: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) dailyMap[format(subDays(new Date(), i), "MMM dd")] = 0;
  transactions.forEach(t => { const d = format(new Date(t.created_at), "MMM dd"); if (dailyMap[d] !== undefined) dailyMap[d] += Number(t.amount || 0); });
  const dailyData = Object.entries(dailyMap).map(([date, amount]) => ({ date, amount: Math.round(amount) }));

  // By service type
  const byService: Record<string, number> = {};
  transactions.forEach(t => { byService[t.service_type] = (byService[t.service_type] || 0) + Number(t.amount || 0); });
  const pieData = Object.entries(byService).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Receipt className="w-6 h-6 text-primary" /> Transaction History</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center"><IndianRupee className="w-5 h-5 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">₹{totalRevenue.toFixed(0)}</p><p className="text-xs text-muted-foreground">Platform Revenue</p></Card>
        <Card className="p-4 text-center"><ArrowDownRight className="w-5 h-5 mx-auto text-emerald-500 mb-1" /><p className="text-2xl font-bold">₹{totalPayout.toFixed(0)}</p><p className="text-xs text-muted-foreground">Provider Payouts</p></Card>
        <Card className="p-4 text-center"><TrendingUp className="w-5 h-5 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">₹{txCommission.toLocaleString()}</p><p className="text-xs text-muted-foreground">Ledger Commission</p></Card>
        <Card className="p-4 text-center"><Calendar className="w-5 h-5 mx-auto text-muted-foreground mb-1" /><p className="text-2xl font-bold">₹{todayTx.toLocaleString()}</p><p className="text-xs text-muted-foreground">Today</p></Card>
      </div>

      {/* Charts */}
      {transactions.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Revenue Trend (14 Days)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dailyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /></LineChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">By Service</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Legend /></PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger">Consolidated Ledger ({transactions.length})</TabsTrigger>
          <TabsTrigger value="provider">Provider Earnings ({providerEarnings.length})</TabsTrigger>
          <TabsTrigger value="hospital">Hospital Earnings ({hospitalEarnings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="mt-4 space-y-3">
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="consultation">Consultation</SelectItem>
              <SelectItem value="lab_test">Lab Test</SelectItem>
              <SelectItem value="pharmacy">Pharmacy</SelectItem>
              <SelectItem value="ambulance">Ambulance</SelectItem>
              <SelectItem value="video_consultation">Video</SelectItem>
            </SelectContent>
          </Select>
          {transactions.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No transactions in ledger yet</p></Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Service</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Commission</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Payout</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  </tr></thead>
                  <tbody>
                    {transactions.slice(0, 50).map(t => (
                      <tr key={t.id} className="border-t border-border">
                        <td className="p-3 text-xs text-muted-foreground">{format(new Date(t.created_at), "dd MMM yyyy")}</td>
                        <td className="p-3"><Badge variant="outline" className="capitalize text-xs">{(t.service_type || "").replace(/_/g, " ")}</Badge></td>
                        <td className="p-3 text-right font-medium">₹{Number(t.amount).toLocaleString()}</td>
                        <td className="p-3 text-right text-primary">₹{Number(t.platform_commission).toLocaleString()}</td>
                        <td className="p-3 text-right">₹{Number(t.provider_payout).toLocaleString()}</td>
                        <td className="p-3 text-center"><Badge variant={t.payment_status === "paid" ? "default" : "secondary"} className="text-xs">{t.payment_status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="provider" className="space-y-3 mt-4">
          {providerEarnings.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No transactions</p></Card>
          ) : providerEarnings.map(e => (
            <Card key={e.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{e.provider_type}</Badge>
                    <Badge variant="secondary" className="capitalize">{e.reference_type}</Badge>
                    <span className="text-xs text-muted-foreground">{e.description}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(e.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">₹{e.gross_amount}</p>
                  <p className="text-xs text-muted-foreground">Commission: ₹{e.commission_amount} ({e.commission_percent}%)</p>
                  <p className="text-xs text-emerald-600">Net: ₹{e.net_amount}</p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="hospital" className="space-y-3 mt-4">
          {hospitalEarnings.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No transactions</p></Card>
          ) : hospitalEarnings.map(e => (
            <Card key={e.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{(e.hospitals as any)?.name || "—"}</span>
                    <Badge variant="outline" className="capitalize">{e.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{e.description} • {new Date(e.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">₹{e.amount}</p>
                  <p className="text-xs text-muted-foreground">Commission: ₹{e.platform_commission}</p>
                  <p className="text-xs text-emerald-600">Net: ₹{e.net_earning}</p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
