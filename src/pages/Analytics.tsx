import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Pill, AlertTriangle, Heart, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(168,72%,40%)", "hsl(38,92%,55%)", "hsl(0,85%,55%)", "hsl(152,60%,42%)", "hsl(220,70%,55%)"];

const Analytics = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ appointments: 0, upcoming: 0, completed: 0, orders: 0, totalSpent: 0, emergencies: 0, favorites: 0 });
  const [appointmentData, setAppointmentData] = useState<any[]>([]);
  const [spendingData, setSpendingData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const uid = session.user.id;

      const [appts, orders, emergencies, favs] = await Promise.all([
        supabase.from("appointments").select("*").eq("patient_id", uid),
        supabase.from("orders").select("*").eq("user_id", uid),
        supabase.from("emergency_requests").select("*").eq("patient_id", uid),
        supabase.from("favorites").select("*").eq("user_id", uid),
      ]);

      const apptList = appts.data || [];
      const orderList = orders.data || [];
      const emergencyList = emergencies.data || [];
      const favList = favs.data || [];

      const now = new Date().toISOString().split("T")[0];
      const upcoming = apptList.filter(a => a.appointment_date >= now && a.status !== "cancelled").length;
      const completed = apptList.filter(a => a.status === "completed").length;
      const totalSpent = orderList.reduce((s, o) => s + Number(o.total || 0), 0);

      setStats({ appointments: apptList.length, upcoming, completed, orders: orderList.length, totalSpent, emergencies: emergencyList.length, favorites: favList.length });

      // Appointments by month
      const apptMonths: Record<string, number> = {};
      apptList.forEach(a => {
        const m = new Date(a.appointment_date).toLocaleDateString("en", { month: "short" });
        apptMonths[m] = (apptMonths[m] || 0) + 1;
      });
      setAppointmentData(Object.entries(apptMonths).map(([name, value]) => ({ name, value })));

      // Spending over time
      const spendMonths: Record<string, number> = {};
      orderList.forEach(o => {
        const m = new Date(o.created_at).toLocaleDateString("en", { month: "short" });
        spendMonths[m] = (spendMonths[m] || 0) + Number(o.total || 0);
      });
      setSpendingData(Object.entries(spendMonths).map(([name, value]) => ({ name, value })));

      // Appointment status breakdown
      const statuses: Record<string, number> = {};
      apptList.forEach(a => { statuses[a.status] = (statuses[a.status] || 0) + 1; });
      setStatusData(Object.entries(statuses).map(([name, value]) => ({ name, value })));

      setLoading(false);
    };
    load();
  }, [navigate]);

  const statCards = [
    { icon: Calendar, label: "Appointments", value: stats.appointments, color: "bg-primary" },
    { icon: TrendingUp, label: "Upcoming", value: stats.upcoming, color: "bg-success" },
    { icon: Pill, label: "Orders", value: stats.orders, color: "bg-warning" },
    { icon: AlertTriangle, label: "Emergencies", value: stats.emergencies, color: "bg-emergency" },
    { icon: Heart, label: "Favorites", value: stats.favorites, color: "bg-accent" },
  ];

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading analytics...</div>;

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="gradient-primary page-header px-5 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3">
          <button aria-label="Go back" onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-lg font-bold text-primary-foreground">Analytics</h1>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          {statCards.map(s => (
            <div key={s.label} className="bg-card rounded-2xl border border-border p-3 text-center">
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mx-auto mb-2`}>
                <s.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
          <div className="bg-card rounded-2xl border border-border p-3 text-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <p className="text-xl font-bold text-foreground">₹{stats.totalSpent.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Spent</p>
          </div>
        </div>

        {/* Appointments Chart */}
        {appointmentData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="font-semibold text-sm mb-3">Appointments by Month</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={appointmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(168,72%,40%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Spending Trend */}
        {spendingData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="font-semibold text-sm mb-3">Spending Trend</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={spendingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(168,72%,40%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Appointment Status */}
        {statusData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="font-semibold text-sm mb-3">Appointment Status</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
