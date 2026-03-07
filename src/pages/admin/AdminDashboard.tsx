import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users, Stethoscope, Building2, ShoppingBag, CalendarCheck, Store, AlertTriangle, IndianRupee, FlaskConical, Clock, TrendingUp, ArrowRight, CheckSquare, Download } from "lucide-react";
import PlatformHealthAnalytics from "@/components/admin/PlatformHealthAnalytics";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { downloadDemoCredentialsPdf } from "@/lib/generateDemoCredentialsPdf";

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  subtitle?: string;
  path?: string;
  trend?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingBreakdown, setPendingBreakdown] = useState({ doctors: 0, hospitals: 0, labs: 0, pharmacies: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

      const [
        doctors, hospitals, labs, pharmacies, appointments, orders, profiles,
        emergencies, todayAppts, monthAppts, revenue,
        pendingDoctors, pendingHospitals, pendingLabs, pendingPharmacies,
        activeEmergencies
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
        supabase.from("emergency_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "dispatched"]),
      ]);

      const totalRevenue = (revenue.data || []).reduce((sum, o) => sum + (o.total || 0), 0);
      const totalPending = (pendingDoctors.count ?? 0) + (pendingHospitals.count ?? 0) + (pendingLabs.count ?? 0) + (pendingPharmacies.count ?? 0);

      setPendingBreakdown({
        doctors: pendingDoctors.count ?? 0,
        hospitals: pendingHospitals.count ?? 0,
        labs: pendingLabs.count ?? 0,
        pharmacies: pendingPharmacies.count ?? 0,
      });

      setStats([
        { label: "Total Users", value: profiles.count ?? 0, icon: Users, gradient: "from-[hsl(215,65%,30%)] to-[hsl(215,65%,45%)]", iconBg: "bg-white/20", path: "/admin/users" },
        { label: "Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, gradient: "from-[hsl(152,55%,38%)] to-[hsl(152,55%,50%)]", iconBg: "bg-white/20", path: "/admin/revenue" },
        { label: "Appointments Today", value: todayAppts.count ?? 0, icon: CalendarCheck, gradient: "from-[hsl(262,50%,48%)] to-[hsl(262,50%,60%)]", iconBg: "bg-white/20", subtitle: `${monthAppts.count ?? 0} this month`, path: "/admin/appointments" },
        { label: "Pending Approvals", value: totalPending, icon: Clock, gradient: "from-[hsl(30,80%,50%)] to-[hsl(30,80%,62%)]", iconBg: "bg-white/20", path: "/admin/approvals" },
        { label: "Active Emergencies", value: activeEmergencies.count ?? 0, icon: AlertTriangle, gradient: "from-[hsl(0,70%,52%)] to-[hsl(0,70%,62%)]", iconBg: "bg-white/20", path: "/admin/emergencies" },
        { label: "Total Orders", value: orders.count ?? 0, icon: ShoppingBag, gradient: "from-[hsl(330,60%,48%)] to-[hsl(330,60%,60%)]", iconBg: "bg-white/20", path: "/admin/orders" },
      ]);
      setLoading(false);
    };
    fetchStats();
  }, []);

  const quickLinks = [
    { label: "Doctors", value: "Manage", icon: Stethoscope, path: "/admin/doctors", bg: "bg-[hsl(152,50%,92%)] dark:bg-[hsl(152,30%,18%)]", color: "text-[hsl(152,55%,40%)]" },
    { label: "Hospitals", value: "Manage", icon: Building2, path: "/admin/hospitals", bg: "bg-[hsl(205,80%,92%)] dark:bg-[hsl(205,40%,18%)]", color: "text-[hsl(205,65%,45%)]" },
    { label: "Labs", value: "Manage", icon: FlaskConical, path: "/admin/labs", bg: "bg-[hsl(262,50%,93%)] dark:bg-[hsl(262,30%,18%)]", color: "text-[hsl(262,60%,52%)]" },
    { label: "Pharmacies", value: "Manage", icon: Store, path: "/admin/pharmacies", bg: "bg-[hsl(30,80%,92%)] dark:bg-[hsl(30,40%,18%)]", color: "text-[hsl(30,80%,50%)]" },
    { label: "Approvals", value: `${pendingBreakdown.doctors + pendingBreakdown.hospitals + pendingBreakdown.labs + pendingBreakdown.pharmacies} pending`, icon: CheckSquare, path: "/admin/approvals", bg: "bg-[hsl(45,80%,92%)] dark:bg-[hsl(45,30%,18%)]", color: "text-[hsl(45,85%,40%)]" },
    { label: "Emergencies", value: "Monitor", icon: AlertTriangle, path: "/admin/emergencies", bg: "bg-destructive/10", color: "text-destructive" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active emergencies alert */}
      {stats.find(s => s.label === "Active Emergencies" && Number(s.value) > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 cursor-pointer hover:bg-destructive/15 transition-colors"
          onClick={() => navigate("/admin/emergencies")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-destructive text-sm">Active Emergency Cases</p>
                <p className="text-xs text-destructive/80">Requires immediate attention</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-destructive" />
          </div>
        </motion.div>
      )}

      {/* KPI Cards — gradient style */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            onClick={() => stat.path && navigate(stat.path)}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-5 cursor-pointer hover:shadow-lg transition-shadow group`}
          >
            <div className="absolute top-3 right-3 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <stat.icon className="w-5 h-5 text-white/90" />
            </div>
            <p className="text-white/70 text-xs font-medium">{stat.label}</p>
            <p className="text-2xl md:text-3xl font-extrabold text-white mt-1">{stat.value}</p>
            {stat.subtitle && (
              <p className="text-white/60 text-[11px] mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {stat.subtitle}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Quick Access Grid */}
      <div>
        <h3 className="font-bold text-foreground text-base mb-3">Quick Access</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {quickLinks.map((item, idx) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl ${item.bg} hover:shadow-md transition-all`}
            >
              <div className="w-11 h-11 rounded-xl bg-card shadow-sm flex items-center justify-center">
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <span className="text-xs font-semibold text-foreground text-center leading-tight">{item.label}</span>
              <span className="text-[10px] text-muted-foreground">{item.value}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Pending Approvals breakdown */}
      {(pendingBreakdown.doctors + pendingBreakdown.hospitals + pendingBreakdown.labs + pendingBreakdown.pharmacies) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-2xl border border-border p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-[hsl(30,80%,50%)]" /> Pending Approvals
            </h3>
            <button
              onClick={() => navigate("/admin/approvals")}
              className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Doctors", count: pendingBreakdown.doctors, icon: Stethoscope, color: "text-[hsl(152,55%,40%)]", bg: "bg-[hsl(152,50%,92%)] dark:bg-[hsl(152,30%,18%)]" },
              { label: "Hospitals", count: pendingBreakdown.hospitals, icon: Building2, color: "text-[hsl(205,65%,45%)]", bg: "bg-[hsl(205,80%,92%)] dark:bg-[hsl(205,40%,18%)]" },
              { label: "Labs", count: pendingBreakdown.labs, icon: FlaskConical, color: "text-[hsl(262,60%,52%)]", bg: "bg-[hsl(262,50%,93%)] dark:bg-[hsl(262,30%,18%)]" },
              { label: "Pharmacies", count: pendingBreakdown.pharmacies, icon: Store, color: "text-[hsl(30,80%,50%)]", bg: "bg-[hsl(30,80%,92%)] dark:bg-[hsl(30,40%,18%)]" },
            ].map(item => (
              <div key={item.label} className={`${item.bg} rounded-xl p-3 text-center`}>
                <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-1`} />
                <p className="text-xl font-bold text-foreground">{item.count}</p>
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Platform Health Analytics */}
      <PlatformHealthAnalytics />
    </div>
  );
}
