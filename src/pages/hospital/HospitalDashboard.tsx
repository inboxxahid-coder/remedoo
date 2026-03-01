import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Stethoscope, BedDouble, Activity, Siren, IndianRupee, TrendingUp, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function HospitalDashboard() {
  const [stats, setStats] = useState({
    appointments: 0, doctors: 0, totalBeds: 0, availableBeds: 0,
    totalIcu: 0, availableIcu: 0, activeEmergencies: 0, revenue: 0,
    todayAppointments: 0, departments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: hospital } = await supabase.from("hospitals")
        .select("id, total_beds, available_beds, total_icu_beds, available_icu_beds, platform_commission_percent")
        .eq("user_id", session.user.id).maybeSingle();
      if (!hospital) { setLoading(false); return; }

      const today = new Date().toISOString().split("T")[0];

      const [aptRes, docRes, emerRes, todayAptRes, deptRes, earningsRes] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
        supabase.from("doctors").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
        supabase.from("emergency_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "dispatched"]),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id).eq("appointment_date", today),
        supabase.from("departments").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
        supabase.from("hospital_earnings").select("net_earning").eq("hospital_id", hospital.id),
      ]);

      const totalEarnings = (earningsRes.data || []).reduce((s: number, e: any) => s + Number(e.net_earning || 0), 0);

      setStats({
        appointments: aptRes.count || 0,
        doctors: docRes.count || 0,
        totalBeds: hospital.total_beds || 0,
        availableBeds: hospital.available_beds || 0,
        totalIcu: hospital.total_icu_beds || 0,
        availableIcu: hospital.available_icu_beds || 0,
        activeEmergencies: emerRes.count || 0,
        revenue: totalEarnings,
        todayAppointments: todayAptRes.count || 0,
        departments: deptRes.count || 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const cards = [
    { label: "Today's Appointments", value: stats.todayAppointments, icon: CalendarCheck, color: "text-primary", bg: "from-primary/5 to-primary/10" },
    { label: "Total Appointments", value: stats.appointments, icon: Activity, color: "text-blue-500", bg: "from-blue-500/5 to-blue-500/10" },
    { label: "Doctors", value: stats.doctors, icon: Stethoscope, color: "text-emerald-500", bg: "from-emerald-500/5 to-emerald-500/10" },
    { label: "Available Beds", value: `${stats.availableBeds}/${stats.totalBeds}`, icon: BedDouble, color: "text-amber-500", bg: "from-amber-500/5 to-amber-500/10" },
    { label: "ICU Available", value: `${stats.availableIcu}/${stats.totalIcu}`, icon: Heart, color: "text-rose-500", bg: "from-rose-500/5 to-rose-500/10" },
    { label: "Active Emergencies", value: stats.activeEmergencies, icon: Siren, color: "text-destructive", bg: "from-destructive/5 to-destructive/10" },
    { label: "Departments", value: stats.departments, icon: TrendingUp, color: "text-violet-500", bg: "from-violet-500/5 to-violet-500/10" },
    { label: "Revenue", value: `₹${stats.revenue.toLocaleString()}`, icon: IndianRupee, color: "text-primary", bg: "from-primary/5 to-primary/10" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Hospital Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.label} className={`p-4 bg-gradient-to-br ${c.bg} border-0`}>
            <c.icon className={`w-6 h-6 ${c.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      {stats.activeEmergencies > 0 && (
        <Card className="mt-6 p-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2">
            <Siren className="w-5 h-5 text-destructive animate-pulse" />
            <p className="font-semibold text-destructive">{stats.activeEmergencies} Active Emergency Case{stats.activeEmergencies > 1 ? "s" : ""}</p>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Navigate to Emergency Control to manage active cases.</p>
        </Card>
      )}
    </div>
  );
}
