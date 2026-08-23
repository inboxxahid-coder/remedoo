import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarCheck, Clock, Star, TrendingUp, IndianRupee, Calendar,
  Users, AlertTriangle, CheckCircle2, XCircle, Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { logAuditAction } from "@/lib/auditLog";
import { readPageCache, writePageCache } from "@/lib/pageCache";

type DocSnapshot = {
  doctor: any;
  stats: any;
  todayAppointments: any[];
  totalRevenue: number;
  monthlyRevenue: number;
};

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const snap = readPageCache<DocSnapshot>("doctor_dashboard");
  const [loading, setLoading] = useState(!snap);
  const [doctor, setDoctor] = useState<any>(snap?.doctor ?? null);
  const [stats, setStats] = useState(snap?.stats ?? {
    total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0,
    todayCount: 0, upcomingCount: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState<any[]>(snap?.todayAppointments ?? []);
  const [totalRevenue, setTotalRevenue] = useState(snap?.totalRevenue ?? 0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(snap?.monthlyRevenue ?? 0);
  const [emergencies, setEmergencies] = useState<any[]>([]);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data: doc } = await supabase
      .from("doctors")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!doc) { setLoading(false); return; }
    setDoctor(doc);

    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("doctor_id", doc.id)
      .order("appointment_date", { ascending: true });

    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split("T")[0];

    if (appointments) {
      const completed = appointments.filter(a => a.status === "completed");
      const todayAppts = appointments
        .filter(a => a.appointment_date === today && a.status !== "cancelled")
        .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
      const upcoming = appointments.filter(a => a.appointment_date >= today && a.status === "confirmed");
      const monthCompleted = completed.filter(a => a.appointment_date >= monthStartStr);

      const nextStats = {
        total: appointments.length,
        pending: appointments.filter(a => a.status === "pending").length,
        confirmed: appointments.filter(a => a.status === "confirmed").length,
        completed: completed.length,
        cancelled: appointments.filter(a => a.status === "cancelled").length,
        todayCount: todayAppts.length,
        upcomingCount: upcoming.length,
      };
      const nextTotalRevenue = completed.length * (doc.consultation_fee ?? 0);
      const nextMonthlyRevenue = monthCompleted.length * (doc.consultation_fee ?? 0);

      setStats(nextStats);
      setTodayAppointments(todayAppts);
      setTotalRevenue(nextTotalRevenue);
      setMonthlyRevenue(nextMonthlyRevenue);
      writePageCache("doctor_dashboard", {
        doctor: doc,
        stats: nextStats,
        todayAppointments: todayAppts,
        totalRevenue: nextTotalRevenue,
        monthlyRevenue: nextMonthlyRevenue,
      });
    }

    setLoading(false);

    // Emergency alerts for hospital-attached doctors (non-critical, after paint)
    if (doc.hospital_id && doc.emergency_available) {
      const { data: emergencyData } = await supabase
        .from("emergency_requests")
        .select("*")
        .in("status", ["pending", "dispatched"])
        .order("created_at", { ascending: false })
        .limit(5);
      setEmergencies(emergencyData || []);
    }

    logAuditAction({ action: "view_dashboard", entityType: "dashboard" });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-56 h-8 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  const statCards = [
    { label: "Today", value: stats.todayCount, icon: CalendarCheck, color: "text-primary", bg: "bg-primary/10", path: "/doctor/appointments" },
    { label: "Upcoming", value: stats.upcomingCount, icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10", path: "/doctor/appointments" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", path: "/doctor/appointments" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", path: "/doctor/appointments" },
  ];

  const quickNav = [
    { label: "Appointments", path: "/doctor/appointments", icon: CalendarCheck },
    { label: "Schedule", path: "/doctor/schedule", icon: Calendar },
    { label: "Earnings", path: "/doctor/earnings", icon: IndianRupee },
    { label: "Profile", path: "/doctor/profile", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome, Dr. {doctor?.name?.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">{doctor?.specialization} · ⭐ {doctor?.rating ?? 0}</p>
        </div>
        {doctor?.account_status !== "active" && (
          <Badge variant="destructive">Account {doctor?.account_status}</Badge>
        )}
      </div>

      {/* Emergency Alerts */}
      {emergencies.length > 0 && (
        <Card className="p-4 border-destructive/50 bg-destructive/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
            <h2 className="font-semibold text-destructive">Emergency Alerts ({emergencies.length})</h2>
          </div>
          <div className="space-y-2">
            {emergencies.slice(0, 3).map(e => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">Emergency #{e.id.slice(0, 8)} — {e.status}</span>
                <Button size="sm" variant="destructive" onClick={() => navigate("/doctor/emergencies")}>
                  View
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(c => (
          <Card key={c.label} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(c.path)}>
            <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/doctor/earnings")}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">₹{totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/doctor/earnings")}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold text-foreground">₹{monthlyRevenue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickNav.map(q => (
          <Button
            key={q.path}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate(q.path)}
          >
            <q.icon className="w-5 h-5 text-primary" />
            <span className="text-sm">{q.label}</span>
          </Button>
        ))}
      </div>

      {/* Today's Appointments */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Today's Schedule ({todayAppointments.length})
        </h2>
        {todayAppointments.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No appointments scheduled for today</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {todayAppointments.map(apt => (
              <Card key={apt.id} className="p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-foreground">{apt.service_type}</p>
                    <p className="text-sm text-muted-foreground">
                      🕐 {apt.appointment_time}
                      {apt.notes && ` · ${apt.notes}`}
                    </p>
                  </div>
                  <Badge variant={apt.status === "confirmed" ? "default" : apt.status === "completed" ? "secondary" : "outline"}>
                    {apt.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Lifetime Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Appts</p>
          </div>
          <div>
            <p className="text-lg font-bold text-destructive">{stats.cancelled}</p>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </div>
          <div>
            <p className="text-lg font-bold text-primary">₹{doctor?.consultation_fee ?? 0}</p>
            <p className="text-xs text-muted-foreground">Per Visit</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
