import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, CalendarCheck, ShoppingBag, TrendingUp, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

export default function AdminAnalyticsDetailed() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0, doctors: 0, hospitals: 0, labs: 0, pharmacies: 0,
    appointments: 0, orders: 0, emergencies: 0,
  });
  const [appointmentsByDay, setAppointmentsByDay] = useState<any[]>([]);
  const [topDoctors, setTopDoctors] = useState<any[]>([]);
  const [providerDistribution, setProviderDistribution] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [usersRes, doctorsRes, hospitalsRes, labsRes, pharmaciesRes, apptRes, ordersRes, emerRes, topDocRes] = await Promise.all([
        supabase.from("profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("doctors").select("id", { count: "exact", head: true }),
        supabase.from("hospitals").select("id", { count: "exact", head: true }),
        supabase.from("labs").select("id", { count: "exact", head: true }),
        supabase.from("pharmacies").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id, appointment_date, status", { count: "exact" }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("emergency_requests").select("id", { count: "exact", head: true }),
        supabase.from("doctors").select("id, name, rating, specialization").order("rating", { ascending: false }).limit(10),
      ]);

      setStats({
        users: usersRes.count || 0,
        doctors: doctorsRes.count || 0,
        hospitals: hospitalsRes.count || 0,
        labs: labsRes.count || 0,
        pharmacies: pharmaciesRes.count || 0,
        appointments: apptRes.count || 0,
        orders: ordersRes.count || 0,
        emergencies: emerRes.count || 0,
      });

      // Aggregate appointments by date (last 30 days)
      const appts = apptRes.data || [];
      const byDay: Record<string, number> = {};
      appts.forEach(a => {
        const d = a.appointment_date;
        byDay[d] = (byDay[d] || 0) + 1;
      });
      const last30 = Object.entries(byDay)
        .map(([date, count]) => ({ date: date.slice(5), count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);
      setAppointmentsByDay(last30);

      setTopDoctors(topDocRes.data || []);
      setProviderDistribution([
        { name: "Doctors", value: doctorsRes.count || 0 },
        { name: "Hospitals", value: hospitalsRes.count || 0 },
        { name: "Labs", value: labsRes.count || 0 },
        { name: "Pharmacies", value: pharmaciesRes.count || 0 },
      ]);

      setLoading(false);
    };
    load();
  }, []);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> Analytics & Reports</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: stats.users, icon: Users },
          { label: "Appointments", value: stats.appointments, icon: CalendarCheck },
          { label: "Orders", value: stats.orders, icon: ShoppingBag },
          { label: "Emergencies", value: stats.emergencies, icon: TrendingUp },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <s.icon className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4">Appointments per Day</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={appointmentsByDay}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4">Provider Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={providerDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {providerDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Top Rated Doctors</h3>
        <div className="space-y-2">
          {topDoctors.map((d, i) => (
            <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
              <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.specialization || "General"}</p>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-sm font-semibold">{d.rating || 0}</span>
              </div>
            </div>
          ))}
          {topDoctors.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No doctors found</p>}
        </div>
      </Card>
    </div>
  );
}
