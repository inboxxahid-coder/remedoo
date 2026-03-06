import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Users, CalendarCheck, ShoppingBag, FlaskConical, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DailyMetric {
  date: string;
  appointments: number;
  orders: number;
}

export default function PlatformHealthAnalytics() {
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState({ users: 0, appointments: 0, orders: 0, labTests: 0, emergencies: 0 });
  const [yesterdayStats, setYesterdayStats] = useState({ appointments: 0, orders: 0 });
  const [weeklyData, setWeeklyData] = useState<DailyMetric[]>([]);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

      const [
        todayAppts, todayOrders, todayEmergencies, todayLabTests,
        yesterdayAppts, yesterdayOrders,
        weekAppts, weekOrders, recentProfiles,
      ] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("appointment_date", today),
        supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("emergency_requests").select("id", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("appointment_date", today).not("lab_id", "is", null),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("appointment_date", yesterday),
        supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", yesterday).lt("created_at", today),
        supabase.from("appointments").select("appointment_date").gte("appointment_date", weekAgo).lte("appointment_date", today),
        supabase.from("orders").select("created_at").gte("created_at", weekAgo),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", today),
      ]);

      setTodayStats({
        users: recentProfiles.count ?? 0,
        appointments: todayAppts.count ?? 0,
        orders: todayOrders.count ?? 0,
        labTests: todayLabTests.count ?? 0,
        emergencies: todayEmergencies.count ?? 0,
      });

      setYesterdayStats({
        appointments: yesterdayAppts.count ?? 0,
        orders: yesterdayOrders.count ?? 0,
      });

      // Build weekly chart data
      const byDay: Record<string, { appointments: number; orders: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
        byDay[d] = { appointments: 0, orders: 0 };
      }
      (weekAppts.data || []).forEach(a => {
        const d = a.appointment_date;
        if (byDay[d]) byDay[d].appointments++;
      });
      (weekOrders.data || []).forEach(o => {
        const d = o.created_at?.split("T")[0];
        if (d && byDay[d]) byDay[d].orders++;
      });
      setWeeklyData(Object.entries(byDay).map(([date, v]) => ({
        date: date.slice(5),
        ...v,
      })));

      setLoading(false);
    };
    load();
  }, []);

  const trend = (today: number, yesterday: number) => {
    if (yesterday === 0) return today > 0 ? "+100%" : "0%";
    const pct = Math.round(((today - yesterday) / yesterday) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}%`;
  };

  if (loading) {
    return <div className="h-64 rounded-2xl bg-muted animate-pulse" />;
  }

  const metrics = [
    { label: "New Users Today", value: todayStats.users, icon: Users, color: "text-[hsl(215,65%,45%)]", bg: "bg-[hsl(215,65%,92%)] dark:bg-[hsl(215,30%,18%)]" },
    { label: "Appointments Today", value: todayStats.appointments, icon: CalendarCheck, color: "text-[hsl(262,60%,52%)]", bg: "bg-[hsl(262,50%,93%)] dark:bg-[hsl(262,30%,18%)]", trend: trend(todayStats.appointments, yesterdayStats.appointments) },
    { label: "Orders Today", value: todayStats.orders, icon: ShoppingBag, color: "text-[hsl(330,60%,48%)]", bg: "bg-[hsl(330,50%,93%)] dark:bg-[hsl(330,30%,18%)]", trend: trend(todayStats.orders, yesterdayStats.orders) },
    { label: "Lab Tests Today", value: todayStats.labTests, icon: FlaskConical, color: "text-[hsl(152,55%,40%)]", bg: "bg-[hsl(152,50%,92%)] dark:bg-[hsl(152,30%,18%)]" },
    { label: "Emergencies Today", value: todayStats.emergencies, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-5"
    >
      <h3 className="font-bold text-foreground text-base flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" /> Platform Health
      </h3>

      {/* Daily KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {metrics.map(m => (
          <div key={m.label} className={`${m.bg} rounded-xl p-3 text-center`}>
            <m.icon className={`w-5 h-5 ${m.color} mx-auto mb-1`} />
            <p className="text-xl font-bold text-foreground">{m.value}</p>
            <p className="text-[11px] text-muted-foreground">{m.label}</p>
            {m.trend && (
              <p className={`text-[10px] mt-0.5 flex items-center justify-center gap-0.5 ${m.trend.startsWith("+") ? "text-[hsl(152,55%,40%)]" : "text-destructive"}`}>
                {m.trend.startsWith("+") ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {m.trend} vs yesterday
              </p>
            )}
          </div>
        ))}
      </div>

      {/* 7-day chart */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Last 7 Days</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="appointments" name="Appointments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="orders" name="Orders" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
