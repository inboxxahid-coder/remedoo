import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!doctor) { setLoading(false); return; }

    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("doctor_id", doctor.id)
      .order("appointment_date", { ascending: false });

    setAppointments(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Appointment ${status}`); load(); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">My Appointments</h1>
      {appointments.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No appointments yet</p>
      ) : (
        <div className="space-y-3">
          {appointments.map(apt => (
            <Card key={apt.id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold text-foreground">{apt.service_type}</p>
                  <p className="text-sm text-muted-foreground">{apt.appointment_date} at {apt.appointment_time}</p>
                  {apt.notes && <p className="text-xs text-muted-foreground mt-1">{apt.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={apt.status === "confirmed" ? "default" : apt.status === "cancelled" ? "destructive" : "secondary"}>
                    {apt.status}
                  </Badge>
                  {apt.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(apt.id, "confirmed")}>Confirm</Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(apt.id, "cancelled")}>Cancel</Button>
                    </>
                  )}
                  {apt.status === "confirmed" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(apt.id, "completed")}>Complete</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
