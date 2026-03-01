import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { CalendarCheck, Users, Clock, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function DoctorDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0 });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: doctor } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!doctor) return;

      const { data: appointments } = await supabase
        .from("appointments")
        .select("status")
        .eq("doctor_id", doctor.id);

      if (appointments) {
        setStats({
          total: appointments.length,
          pending: appointments.filter(a => a.status === "pending").length,
          confirmed: appointments.filter(a => a.status === "confirmed").length,
          completed: appointments.filter(a => a.status === "completed").length,
        });
      }
    };
    load();
  }, []);

  const cards = [
    { label: "Total Appointments", value: stats.total, icon: CalendarCheck, color: "text-primary" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-warning" },
    { label: "Confirmed", value: stats.confirmed, icon: Users, color: "text-success" },
    { label: "Completed", value: stats.completed, icon: Star, color: "text-muted-foreground" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Doctor Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.label} className="p-4">
            <c.icon className={`w-6 h-6 ${c.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
