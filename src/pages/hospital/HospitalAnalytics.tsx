import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart3, Activity, BedDouble, Clock } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "#f59e0b", "#10b981", "#6366f1", "#ec4899"];

export default function HospitalAnalytics() {
  const [loading, setLoading] = useState(true);
  const [hospital, setHospital] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: hosp } = await supabase.from("hospitals").select("*").eq("user_id", session.user.id).maybeSingle();
      if (!hosp) { setLoading(false); return; }
      setHospital(hosp);

      const [aptRes, emerRes, deptRes, docRes] = await Promise.all([
        supabase.from("appointments").select("*").eq("hospital_id", hosp.id).order("appointment_date", { ascending: false }).limit(500),
        supabase.from("emergency_requests").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("departments").select("*").eq("hospital_id", hosp.id),
        supabase.from("doctors").select("*").eq("hospital_id", hosp.id),
      ]);
      setAppointments(aptRes.data || []);
      setEmergencies(emerRes.data || []);
      setDepartments(deptRes.data || []);
      setDoctors(docRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  // Appointment trend - last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en", { weekday: "short" });
    const count = appointments.filter(a => a.appointment_date === dateStr).length;
    return { name: label, appointments: count };
  });

  // Status distribution
  const statusMap: Record<string, number> = {};
  appointments.forEach(a => { statusMap[a.status] = (statusMap[a.status] || 0) + 1; });
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  // Emergency response
  const resolvedEmergencies = emergencies.filter(e => e.response_time_minutes);
  const avgResponse = resolvedEmergencies.length > 0 ? Math.round(resolvedEmergencies.reduce((s, e) => s + Number(e.response_time_minutes), 0) / resolvedEmergencies.length) : 0;

  // Bed utilization
  const bedUtil = hospital?.total_beds ? Math.round(((hospital.total_beds - (hospital.available_beds || 0)) / hospital.total_beds) * 100) : 0;
  const icuUtil = hospital?.total_icu_beds ? Math.round(((hospital.total_icu_beds - (hospital.available_icu_beds || 0)) / hospital.total_icu_beds) * 100) : 0;

  // Department distribution
  const deptDocCount = departments.map(d => ({
    name: d.name,
    doctors: doctors.filter(doc => doc.department_id === d.id).length,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-primary" /> Reports & Analytics
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <Activity className="w-5 h-5 text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{appointments.length}</p>
          <p className="text-xs text-muted-foreground">Total Appointments</p>
        </Card>
        <Card className="p-4">
          <Clock className="w-5 h-5 text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{avgResponse} min</p>
          <p className="text-xs text-muted-foreground">Avg Emergency Response</p>
        </Card>
        <Card className="p-4">
          <BedDouble className="w-5 h-5 text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{bedUtil}%</p>
          <p className="text-xs text-muted-foreground">Bed Utilization</p>
        </Card>
        <Card className="p-4">
          <BedDouble className="w-5 h-5 text-rose-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{icuUtil}%</p>
          <p className="text-xs text-muted-foreground">ICU Utilization</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4">Appointments (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="appointments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4">Appointment Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {deptDocCount.length > 0 && (
          <Card className="p-5 md:col-span-2">
            <h3 className="font-semibold text-foreground mb-4">Doctors per Department</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptDocCount}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="doctors" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  );
}
