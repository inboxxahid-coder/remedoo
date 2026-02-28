import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type AppointmentWithProvider = {
  id: string;
  service_type: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  provider_name: string;
};

const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
  pending: { icon: AlertCircle, color: "text-warning", bg: "bg-warning/10" },
  confirmed: { icon: CheckCircle, color: "text-primary", bg: "bg-primary/10" },
  completed: { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  cancelled: { icon: XCircle, color: "text-emergency", bg: "bg-emergency/10" },
};

const Appointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<AppointmentWithProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const loadAppointments = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login", { replace: true }); return; }

    const { data } = await supabase
      .from("appointments")
      .select("*, doctors(name), hospitals(name), labs(name), pharmacies(name)")
      .eq("patient_id", session.user.id)
      .order("appointment_date", { ascending: false });

    if (data) {
      setAppointments(data.map((a: any) => ({
        ...a,
        provider_name:
          a.doctors?.name || a.hospitals?.name || a.labs?.name || a.pharmacies?.name || "Unknown",
      })));
    }
    setLoading(false);
  };

  useEffect(() => { loadAppointments(); }, [navigate]);

  const cancelAppointment = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error("Failed to cancel");
    else { toast.success("Appointment cancelled"); loadAppointments(); }
  };

  const today = new Date().toISOString().split("T")[0];
  const upcoming = appointments.filter((a) => a.appointment_date >= today && a.status !== "cancelled");
  const past = appointments.filter((a) => a.appointment_date < today || a.status === "cancelled");
  const display = tab === "upcoming" ? upcoming : past;

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground">Appointments</h1>
        </div>
        <div className="flex gap-2">
          {(["upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? "bg-primary-foreground text-primary" : "bg-primary-foreground/20 text-primary-foreground"
              }`}
            >
              {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : display.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No {tab} appointments</p>
            <Button onClick={() => navigate("/doctors")} className="mt-4 gradient-primary text-primary-foreground">Book Now</Button>
          </div>
        ) : (
          display.map((apt) => {
            const cfg = statusConfig[apt.status] || statusConfig.pending;
            const Icon = cfg.icon;
            return (
              <div key={apt.id} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{apt.provider_name}</h3>
                    <p className="text-xs text-primary capitalize">{apt.service_type}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${cfg.bg} ${cfg.color}`}>
                    <Icon className="w-3 h-3" />{apt.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{format(new Date(apt.appointment_date), "MMM d, yyyy")}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{apt.appointment_time}</span>
                </div>
                {apt.notes && <p className="text-xs text-muted-foreground mt-2 bg-muted rounded-lg p-2">{apt.notes}</p>}
                {apt.status === "pending" && tab === "upcoming" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs rounded-lg border-emergency text-emergency" onClick={() => cancelAppointment(apt.id)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Appointments;
