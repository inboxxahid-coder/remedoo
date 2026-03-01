import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function HospitalAppointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: hospital } = await supabase.from("hospitals").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!hospital) { setLoading(false); return; }
      const { data } = await supabase.from("appointments").select("*").eq("hospital_id", hospital.id).order("appointment_date", { ascending: false });
      setAppointments(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Hospital Appointments</h1>
      {appointments.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No appointments</p>
      ) : (
        <div className="space-y-3">
          {appointments.map(apt => (
            <Card key={apt.id} className="p-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold text-foreground">{apt.service_type}</p>
                <p className="text-sm text-muted-foreground">{apt.appointment_date} at {apt.appointment_time}</p>
              </div>
              <Badge variant={apt.status === "confirmed" ? "default" : "secondary"}>{apt.status}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
