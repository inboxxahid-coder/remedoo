import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Users, Clock, Star, TrendingUp, IndianRupee, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { format, isToday, parseISO } from "date-fns";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0 });
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [consultationFee, setConsultationFee] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: doctor } = await supabase
        .from("doctors")
        .select("id, consultation_fee")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!doctor) { setLoading(false); return; }
      setConsultationFee(doctor.consultation_fee ?? 0);

      const { data: appointments } = await supabase
        .from("appointments")
        .select("*")
        .eq("doctor_id", doctor.id)
        .order("appointment_date", { ascending: true });

      if (appointments) {
        setStats({
          total: appointments.length,
          pending: appointments.filter(a => a.status === "pending").length,
          confirmed: appointments.filter(a => a.status === "confirmed").length,
          completed: appointments.filter(a => a.status === "completed").length,
        });

        const today = new Date().toISOString().split("T")[0];
        setTodayAppointments(
          appointments
            .filter(a => a.appointment_date === today && a.status !== "cancelled")
            .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
        );

        const completedCount = appointments.filter(a => a.status === "completed").length;
        setTotalRevenue(completedCount * (doctor.consultation_fee ?? 0));
      }
      setLoading(false);
    };
    load();
  }, []);

  const statCards = [
    { label: "Total Appointments", value: stats.total, icon: CalendarCheck, color: "text-primary", bg: "bg-primary/10" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Confirmed", value: stats.confirmed, icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Completed", value: stats.completed, icon: Star, color: "text-muted-foreground", bg: "bg-muted/30" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-48 h-8 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Doctor Dashboard</h1>
        <Button variant="outline" size="sm" onClick={() => navigate("/doctor/appointments")}>
          <Calendar className="w-4 h-4 mr-1" /> All Appointments
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(c => (
          <Card key={c.label} className="p-4 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      {/* Revenue Card */}
      <Card className="p-5 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
            <IndianRupee className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue (Completed)</p>
            <p className="text-2xl font-bold text-foreground">₹{totalRevenue.toLocaleString()}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Per Consultation</p>
            <p className="text-sm font-semibold text-primary">₹{consultationFee}</p>
          </div>
        </div>
      </Card>

      {/* Today's Appointments */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" />
          Today's Appointments ({todayAppointments.length})
        </h2>
        {todayAppointments.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No appointments scheduled for today</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {todayAppointments.map(apt => (
              <Card key={apt.id} className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-foreground">{apt.service_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {apt.appointment_time}
                      {apt.notes && ` · ${apt.notes}`}
                    </p>
                  </div>
                  <Badge variant={apt.status === "confirmed" ? "default" : "secondary"}>
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
