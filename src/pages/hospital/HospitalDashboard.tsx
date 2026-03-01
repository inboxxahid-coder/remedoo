import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, Stethoscope, BedDouble, Activity, Siren, IndianRupee, TrendingUp, Heart, Ambulance, Building, Percent, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function HospitalDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    appointments: 0, doctors: 0, totalBeds: 0, availableBeds: 0,
    totalIcu: 0, availableIcu: 0, activeEmergencies: 0, totalEmergenciesToday: 0,
    todayAppointments: 0, upcomingAppointments: 0, departments: 0,
    totalRevenue: 0, commission: 0, netEarnings: 0, monthlyRevenue: 0,
    ambulanceFleet: 0, ambulanceAvailable: 0,
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
      const monthStart = new Date(); monthStart.setDate(1);
      const monthStr = monthStart.toISOString().split("T")[0];

      const [aptRes, docRes, emerRes, todayAptRes, upcomingAptRes, deptRes, earningsRes, monthEarningsRes, ambRes, todayEmerRes] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
        supabase.from("doctors").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
        supabase.from("emergency_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "dispatched"]),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id).eq("appointment_date", today),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id).gte("appointment_date", today).in("status", ["pending", "confirmed"]),
        supabase.from("departments").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
        supabase.from("hospital_earnings").select("amount, platform_commission, net_earning").eq("hospital_id", hospital.id),
        supabase.from("hospital_earnings").select("net_earning").eq("hospital_id", hospital.id).gte("created_at", monthStr),
        supabase.from("ambulances").select("id, status").eq("hospital_id", hospital.id),
        supabase.from("emergency_requests").select("id", { count: "exact", head: true }).gte("created_at", today),
      ]);

      const allEarnings = earningsRes.data || [];
      const totalRevenue = allEarnings.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const commission = allEarnings.reduce((s: number, e: any) => s + Number(e.platform_commission || 0), 0);
      const netEarnings = allEarnings.reduce((s: number, e: any) => s + Number(e.net_earning || 0), 0);
      const monthlyRevenue = (monthEarningsRes.data || []).reduce((s: number, e: any) => s + Number(e.net_earning || 0), 0);
      const ambData = ambRes.data || [];

      setStats({
        appointments: aptRes.count || 0,
        doctors: docRes.count || 0,
        totalBeds: hospital.total_beds || 0,
        availableBeds: hospital.available_beds || 0,
        totalIcu: hospital.total_icu_beds || 0,
        availableIcu: hospital.available_icu_beds || 0,
        activeEmergencies: emerRes.count || 0,
        totalEmergenciesToday: todayEmerRes.count || 0,
        todayAppointments: todayAptRes.count || 0,
        upcomingAppointments: upcomingAptRes.count || 0,
        departments: deptRes.count || 0,
        totalRevenue, commission, netEarnings, monthlyRevenue,
        ambulanceFleet: ambData.length,
        ambulanceAvailable: ambData.filter((a: any) => a.status === "available").length,
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

  const kpiCards = [
    { label: "Today's Appointments", value: stats.todayAppointments, icon: CalendarCheck, color: "text-primary", bg: "from-primary/5 to-primary/10" },
    { label: "Upcoming Appointments", value: stats.upcomingAppointments, icon: Activity, color: "text-blue-500", bg: "from-blue-500/5 to-blue-500/10" },
    { label: "Active Emergencies", value: stats.activeEmergencies, icon: Siren, color: "text-destructive", bg: "from-destructive/5 to-destructive/10" },
    { label: "Emergencies Today", value: stats.totalEmergenciesToday, icon: Siren, color: "text-amber-500", bg: "from-amber-500/5 to-amber-500/10" },
    { label: "Available Beds", value: `${stats.availableBeds}/${stats.totalBeds}`, icon: BedDouble, color: "text-primary", bg: "from-primary/5 to-primary/10" },
    { label: "ICU Available", value: `${stats.availableIcu}/${stats.totalIcu}`, icon: Heart, color: "text-destructive", bg: "from-destructive/5 to-destructive/10" },
    { label: "Doctors", value: stats.doctors, icon: Stethoscope, color: "text-emerald-600", bg: "from-emerald-500/5 to-emerald-500/10" },
    { label: "Departments", value: stats.departments, icon: Building, color: "text-violet-500", bg: "from-violet-500/5 to-violet-500/10" },
    { label: "Ambulance Fleet", value: `${stats.ambulanceAvailable}/${stats.ambulanceFleet}`, icon: Ambulance, color: "text-blue-500", bg: "from-blue-500/5 to-blue-500/10" },
  ];

  const quickLinks = [
    { label: "Emergency", path: "/hospital/emergencies", icon: Siren, color: "text-destructive" },
    { label: "Beds & ICU", path: "/hospital/beds", icon: BedDouble, color: "text-primary" },
    { label: "Doctors", path: "/hospital/doctors", icon: Stethoscope, color: "text-emerald-600" },
    { label: "Appointments", path: "/hospital/appointments", icon: CalendarCheck, color: "text-blue-500" },
    { label: "Earnings", path: "/hospital/earnings", icon: IndianRupee, color: "text-primary" },
    { label: "Ambulance", path: "/hospital/ambulance-fleet", icon: Ambulance, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Hospital Dashboard</h1>

      {/* Emergency Alert */}
      {stats.activeEmergencies > 0 && (
        <Card className="p-4 border-destructive/30 bg-destructive/5 cursor-pointer" onClick={() => navigate("/hospital/emergencies")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Siren className="w-5 h-5 text-destructive animate-pulse" />
              <p className="font-semibold text-destructive">{stats.activeEmergencies} Active Emergency Case{stats.activeEmergencies > 1 ? "s" : ""}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-destructive" />
          </div>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpiCards.map(c => (
          <Card key={c.label} className={`p-4 bg-gradient-to-br ${c.bg} border-0`}>
            <c.icon className={`w-5 h-5 ${c.color} mb-1`} />
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      {/* Revenue Summary */}
      <Card className="p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <IndianRupee className="w-5 h-5 text-primary" /> Revenue Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-bold text-foreground">₹{stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="w-3 h-3" /> Commission Deducted</p>
            <p className="text-xl font-bold text-amber-500">₹{stats.commission.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net Earnings</p>
            <p className="text-xl font-bold text-emerald-600">₹{stats.netEarnings.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> This Month</p>
            <p className="text-xl font-bold text-primary">₹{stats.monthlyRevenue.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      {/* Quick Access */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">Quick Access</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {quickLinks.map(q => (
            <Button key={q.label} variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => navigate(q.path)}>
              <q.icon className={`w-5 h-5 ${q.color}`} />
              <span className="text-xs">{q.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
