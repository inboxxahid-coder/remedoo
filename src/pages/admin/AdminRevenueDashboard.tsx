import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { IndianRupee, TrendingUp, Percent, Users, Building2, Pill, FlaskConical } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#6366f1", "#ec4899"];

export default function AdminRevenueDashboard() {
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [hospitalEarnings, setHospitalEarnings] = useState<any[]>([]);
  const [orderRevenue, setOrderRevenue] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [provRes, hospRes, orderRes] = await Promise.all([
        supabase.from("provider_earnings").select("*").order("created_at", { ascending: false }),
        supabase.from("hospital_earnings").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("total, status").not("status", "eq", "cancelled"),
      ]);
      setEarnings(provRes.data || []);
      setHospitalEarnings(hospRes.data || []);
      setOrderRevenue((orderRes.data || []).reduce((s, o) => s + Number(o.total || 0), 0));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="w-56 h-8 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    </div>
  );

  // Aggregate
  const totalProviderGross = earnings.reduce((s, e) => s + Number(e.gross_amount || 0), 0);
  const totalProviderCommission = earnings.reduce((s, e) => s + Number(e.commission_amount || 0), 0);
  const totalHospitalGross = hospitalEarnings.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalHospitalCommission = hospitalEarnings.reduce((s, e) => s + Number(e.platform_commission || 0), 0);

  const totalPlatformRevenue = totalProviderCommission + totalHospitalCommission;
  const totalGross = totalProviderGross + totalHospitalGross;

  // By provider type
  const byType: Record<string, { gross: number; commission: number }> = {};
  earnings.forEach(e => {
    const t = e.provider_type;
    if (!byType[t]) byType[t] = { gross: 0, commission: 0 };
    byType[t].gross += Number(e.gross_amount || 0);
    byType[t].commission += Number(e.commission_amount || 0);
  });
  // Add hospital
  byType["hospital"] = { gross: totalHospitalGross, commission: totalHospitalCommission };

  const pieData = Object.entries(byType).map(([name, v]) => ({ name, value: v.commission }));
  const barData = Object.entries(byType).map(([name, v]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), gross: v.gross, commission: v.commission }));

  const kpis = [
    { label: "Total GMV", value: `₹${totalGross.toLocaleString()}`, icon: IndianRupee, color: "text-primary bg-primary/10" },
    { label: "Platform Revenue", value: `₹${totalPlatformRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10" },
    { label: "Avg Commission", value: totalGross > 0 ? `${((totalPlatformRevenue / totalGross) * 100).toFixed(1)}%` : "0%", icon: Percent, color: "text-amber-500 bg-amber-500/10" },
    { label: "Total Transactions", value: earnings.length + hospitalEarnings.length, icon: Users, color: "text-blue-500 bg-blue-500/10" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <IndianRupee className="w-6 h-6 text-primary" /> Platform Revenue
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="p-4">
            <div className={`w-10 h-10 rounded-xl ${k.color} flex items-center justify-center mb-2`}>
              <k.icon className="w-5 h-5" />
            </div>
            <p className="text-xl font-bold text-foreground">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4">Revenue by Provider Type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
              <Bar dataKey="gross" name="Gross" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="commission" name="Commission" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4">Commission Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
