import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Stethoscope, Building2, ShoppingBag, CalendarCheck, Store, AlertTriangle, IndianRupee, FlaskConical, Clock } from "lucide-react";

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

      const [
        doctors, hospitals, labs, pharmacies, appointments, orders, profiles,
        emergencies, todayAppts, monthAppts, revenue,
        pendingDoctors, pendingHospitals, pendingLabs, pendingPharmacies
      ] = await Promise.all([
        supabase.from("doctors").select("id", { count: "exact", head: true }),
        supabase.from("hospitals").select("id", { count: "exact", head: true }),
        supabase.from("labs").select("id", { count: "exact", head: true }),
        supabase.from("pharmacies").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("emergency_requests").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("appointment_date", today),
        supabase.from("appointments").select("id", { count: "exact", head: true }).gte("appointment_date", monthStart),
        supabase.from("orders").select("total").not("status", "eq", "cancelled"),
        supabase.from("doctors").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("hospitals").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("labs").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("pharmacies").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
      ]);

      const totalRevenue = (revenue.data || []).reduce((sum, o) => sum + (o.total || 0), 0);
      const totalPending = (pendingDoctors.count ?? 0) + (pendingHospitals.count ?? 0) + (pendingLabs.count ?? 0) + (pendingPharmacies.count ?? 0);

      setStats([
        { label: "Total Users", value: profiles.count ?? 0, icon: Users, color: "bg-primary/10 text-primary" },
        { label: "Doctors", value: doctors.count ?? 0, icon: Stethoscope, color: "bg-emerald-500/10 text-emerald-600" },
        { label: "Hospitals", value: hospitals.count ?? 0, icon: Building2, color: "bg-blue-500/10 text-blue-600" },
        { label: "Labs", value: labs.count ?? 0, icon: FlaskConical, color: "bg-violet-500/10 text-violet-600" },
        { label: "Pharmacies", value: pharmacies.count ?? 0, icon: Store, color: "bg-amber-500/10 text-amber-600" },
        { label: "Appointments Today", value: todayAppts.count ?? 0, icon: CalendarCheck, color: "bg-primary/10 text-primary", subtitle: `${monthAppts.count ?? 0} this month` },
        { label: "Total Orders", value: orders.count ?? 0, icon: ShoppingBag, color: "bg-rose-500/10 text-rose-600" },
        { label: "Emergency Requests", value: emergencies.count ?? 0, icon: AlertTriangle, color: "bg-red-500/10 text-red-600" },
        { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, color: "bg-emerald-500/10 text-emerald-600" },
        { label: "Pending Approvals", value: totalPending, icon: Clock, color: "bg-orange-500/10 text-orange-600", subtitle: `${pendingDoctors.count ?? 0}D / ${pendingHospitals.count ?? 0}H / ${pendingLabs.count ?? 0}L / ${pendingPharmacies.count ?? 0}P` },
      ]);
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard Overview</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 shadow-sm animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted" />
                <div className="space-y-2">
                  <div className="h-6 w-16 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                {stat.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
