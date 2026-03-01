import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { CalendarCheck, Stethoscope, BedDouble, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function HospitalDashboard() {
  const [stats, setStats] = useState({ appointments: 0, doctors: 0, beds: 0 });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: hospital } = await supabase.from("hospitals").select("id, beds").eq("user_id", session.user.id).maybeSingle();
      if (!hospital) return;

      const { count: aptCount } = await supabase.from("appointments").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id);
      const { count: docCount } = await supabase.from("doctors").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id);

      setStats({ appointments: aptCount || 0, doctors: docCount || 0, beds: hospital.beds || 0 });
    };
    load();
  }, []);

  const cards = [
    { label: "Appointments", value: stats.appointments, icon: CalendarCheck, color: "text-primary" },
    { label: "Doctors", value: stats.doctors, icon: Stethoscope, color: "text-success" },
    { label: "Total Beds", value: stats.beds, icon: BedDouble, color: "text-warning" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Hospital Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
