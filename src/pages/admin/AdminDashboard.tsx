import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Stethoscope, Building2, ShoppingBag, CalendarCheck, Store } from "lucide-react";

interface StatCard {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatCard[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [doctors, hospitals, labs, pharmacies, appointments, orders, profiles] = await Promise.all([
        supabase.from("doctors").select("id", { count: "exact", head: true }),
        supabase.from("hospitals").select("id", { count: "exact", head: true }),
        supabase.from("labs").select("id", { count: "exact", head: true }),
        supabase.from("pharmacies").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      setStats([
        { label: "Users", value: profiles.count ?? 0, icon: Users, color: "bg-primary/10 text-primary" },
        { label: "Doctors", value: doctors.count ?? 0, icon: Stethoscope, color: "bg-success/10 text-success" },
        { label: "Hospitals", value: hospitals.count ?? 0, icon: Building2, color: "bg-warning/10 text-warning" },
        { label: "Pharmacies", value: pharmacies.count ?? 0, icon: Store, color: "bg-accent text-accent-foreground" },
        { label: "Appointments", value: appointments.count ?? 0, icon: CalendarCheck, color: "bg-primary/10 text-primary" },
        { label: "Orders", value: orders.count ?? 0, icon: ShoppingBag, color: "bg-emergency/10 text-emergency" },
      ]);
    };
    fetchStats();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
