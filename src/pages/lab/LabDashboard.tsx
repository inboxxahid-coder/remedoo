import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarCheck, Clock, CheckCircle, TestTube, Droplets, IndianRupee,
  TrendingUp, Users, Beaker, Activity, ArrowRight, BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { readPageCache, writePageCache } from "@/lib/pageCache";

export default function LabDashboard() {
  const navigate = useNavigate();
  const snap = readPageCache<any>("lab_dashboard");
  const [loading, setLoading] = useState(!snap);
  const [lab, setLab] = useState<any>(snap?.lab ?? null);
  const [stats, setStats] = useState(snap?.stats ?? {
    total: 0, pending: 0, completed: 0, todayCount: 0,
    totalTests: 0, samplesPending: 0, samplesCollected: 0,
    totalRevenue: 0, monthlyRevenue: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>(snap?.recentAppointments ?? []);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: labData } = await supabase.from("labs").select("*").eq("user_id", session.user.id).maybeSingle();
      if (!labData) { setLoading(false); return; }
      setLab(labData);

      const today = new Date().toISOString().split("T")[0];
      const monthStart = new Date(); monthStart.setDate(1);
      const monthStr = monthStart.toISOString().split("T")[0];

      const [aptsRes, todayRes, testsRes, samplesRes, recentRes] = await Promise.all([
        supabase.from("appointments").select("status, payment_status").eq("lab_id", labData.id),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("lab_id", labData.id).eq("appointment_date", today),
        supabase.from("lab_tests").select("id", { count: "exact", head: true }).eq("lab_id", labData.id),
        supabase.from("lab_sample_collections").select("status").eq("lab_id", labData.id),
        supabase.from("appointments").select("id, appointment_date, appointment_time, status, service_type").eq("lab_id", labData.id).order("appointment_date", { ascending: false }).limit(5),
      ]);

      const apts = aptsRes.data || [];
      const samples = samplesRes.data || [];
      const completed = apts.filter(a => a.status === "completed");

      setStats({
        total: apts.length,
        pending: apts.filter(a => a.status === "pending").length,
        completed: completed.length,
        todayCount: todayRes.count || 0,
        totalTests: testsRes.count || 0,
        samplesPending: samples.filter(s => s.status === "scheduled" || s.status === "pending").length,
        samplesCollected: samples.filter(s => s.status === "collected" || s.status === "completed").length,
        totalRevenue: 0,
        monthlyRevenue: 0,
      });

      setRecentAppointments(recentRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-56 h-8 rounded" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Today's Tests", value: stats.todayCount, icon: CalendarCheck, gradient: "from-primary/10 to-primary/5", color: "text-primary", path: "/lab/appointments" },
    { label: "Pending", value: stats.pending, icon: Clock, gradient: "from-amber-500/10 to-amber-500/5", color: "text-amber-500", path: "/lab/appointments" },
    { label: "Completed", value: stats.completed, icon: CheckCircle, gradient: "from-emerald-500/10 to-emerald-500/5", color: "text-emerald-500", path: "/lab/appointments" },
    { label: "Total Tests", value: stats.totalTests, icon: TestTube, gradient: "from-violet-500/10 to-violet-500/5", color: "text-violet-500", path: "/lab/tests" },
    { label: "Samples Pending", value: stats.samplesPending, icon: Droplets, gradient: "from-blue-500/10 to-blue-500/5", color: "text-blue-500", path: "/lab/samples" },
    { label: "Collected", value: stats.samplesCollected, icon: Beaker, gradient: "from-teal-500/10 to-teal-500/5", color: "text-teal-500", path: "/lab/samples" },
  ];

  const quickLinks = [
    { label: "Appointments", path: "/lab/appointments", icon: CalendarCheck },
    { label: "Tests", path: "/lab/tests", icon: TestTube },
    { label: "Samples", path: "/lab/samples", icon: Droplets },
    { label: "Earnings", path: "/lab/earnings", icon: IndianRupee },
    { label: "Analytics", path: "/lab/analytics", icon: BarChart3 },
    { label: "Reviews", path: "/lab/reviews", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lab Dashboard</h1>
        {lab && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {lab.name} · ⭐ {lab.rating ?? "N/A"}
          </p>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpiCards.map((c, idx) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card
              className={`p-4 bg-gradient-to-br ${c.gradient} border-0 cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => navigate(c.path)}
            >
              <c.icon className={`w-5 h-5 ${c.color} mb-1`} />
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Access */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">Quick Access</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {quickLinks.map(q => (
            <Button key={q.label} variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => navigate(q.path)}>
              <q.icon className="w-5 h-5 text-primary" />
              <span className="text-xs">{q.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Recent Appointments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Recent Activity
          </h3>
          <button onClick={() => navigate("/lab/appointments")} className="text-xs text-primary font-semibold flex items-center gap-1">
            See all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {recentAppointments.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No recent appointments</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentAppointments.map(apt => (
              <Card key={apt.id} className="p-3.5 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate("/lab/appointments")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-foreground">{apt.service_type || "Lab Test"}</p>
                    <p className="text-xs text-muted-foreground">
                      📅 {new Date(apt.appointment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {apt.appointment_time}
                    </p>
                  </div>
                  <Badge variant={apt.status === "completed" ? "secondary" : apt.status === "confirmed" ? "default" : "outline"}>
                    {apt.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
