import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Hash, User, FileText, Download, MapPin, Pill, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [apt, setApt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prescription, setPrescription] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login", { replace: true }); return; }

      const { data } = await supabase
        .from("appointments")
        .select("*, doctors(name, specialization, phone, consultation_fee, image_url), hospitals(name, location, phone), labs(name, location, phone), pharmacies(name, location, phone)")
        .eq("id", id!)
        .eq("patient_id", session.user.id)
        .single();

      if (!data) { toast.error("Appointment not found"); navigate(-1); return; }
      setApt(data);

      // Fetch prescription if exists
      const { data: rx } = await supabase
        .from("prescriptions")
        .select("*, prescription_items(*)")
        .eq("appointment_id", id!)
        .maybeSingle();
      setPrescription(rx);

      setLoading(false);
    };
    load();
  }, [id, navigate]);

  const statusBadge = (s: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      confirmed: "default", completed: "secondary", cancelled: "destructive",
    };
    return map[s] || "outline";
  };

  const handleDownloadPrescription = async () => {
    if (!apt?.prescription_url) return;
    const { data } = await supabase.storage.from("prescriptions").createSignedUrl(apt.prescription_url, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Could not generate download link");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!apt) return null;

  const provider = apt.doctors || apt.hospitals || apt.labs || apt.pharmacies;
  const providerName = provider?.name || "Unknown";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-primary page-header px-5 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-primary-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-primary-foreground">Appointment Details</h1>
            <p className="text-primary-foreground/70 text-xs">#{apt.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4">
        {/* Provider Card */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                   <h2
                     className={`font-bold text-foreground ${apt.doctor_id ? "underline decoration-primary/40 cursor-pointer hover:text-primary transition-colors" : ""}`}
                     onClick={() => apt.doctor_id && navigate(`/doctor/${apt.doctor_id}`)}
                   >
                     {providerName}
                   </h2>
                   <p className="text-xs text-muted-foreground capitalize">{apt.service_type}</p>
                  {apt.doctors?.specialization && (
                    <p className="text-xs text-primary">{apt.doctors.specialization}</p>
                  )}
                </div>
                <Badge variant={statusBadge(apt.status)}>{apt.status}</Badge>
              </div>
              {provider?.phone && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  📞 {provider.phone}
                </p>
              )}
              {provider?.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {provider.location}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3">Schedule</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium text-foreground">{format(new Date(apt.appointment_date), "MMM d, yyyy")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-sm font-medium text-foreground">{apt.appointment_time?.slice(0, 5)}</p>
              </div>
            </div>
            {apt.token_number && (
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Token</p>
                  <p className="text-sm font-medium text-foreground">#{apt.token_number}</p>
                </div>
              </div>
            )}
            {apt.department && (
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm font-medium text-foreground">{apt.department}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-primary" /> Payment
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Method</p>
              <p className="font-medium text-foreground">{apt.payment_method === "online" ? "💳 Online" : "💵 At Clinic"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={apt.payment_status === "paid" ? "default" : "outline"} className="text-xs">
                {apt.payment_status}
              </Badge>
            </div>
            {apt.doctors?.consultation_fee > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Fee</p>
                <p className="font-medium text-foreground">₹{apt.doctors.consultation_fee}</p>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {(apt.notes || apt.consultation_notes) && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
            {apt.notes && (
              <div>
                <p className="text-xs font-medium text-foreground">Your Notes</p>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2 mt-1">{apt.notes}</p>
              </div>
            )}
            {apt.consultation_notes && (
              <div>
                <p className="text-xs font-medium text-foreground">Consultation Notes</p>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2 mt-1">{apt.consultation_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Follow-up */}
        {apt.follow_up_date && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-medium text-foreground">Follow-up Date</p>
            <p className="text-sm text-primary font-medium mt-1">{format(new Date(apt.follow_up_date), "MMM d, yyyy")}</p>
          </div>
        )}

        {/* Prescription Download */}
        {apt.prescription_url && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-success" /> Prescription
            </h3>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleDownloadPrescription}>
              <Download className="w-3.5 h-3.5" /> Download Prescription
            </Button>
          </div>
        )}

        {/* Prescription Items from prescription table */}
        {prescription && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Pill className="w-4 h-4 text-primary" /> Prescription Details
            </h3>
            {prescription.diagnosis && (
              <div>
                <p className="text-xs text-muted-foreground">Diagnosis</p>
                <p className="text-sm font-medium text-foreground">{prescription.diagnosis}</p>
              </div>
            )}
            {prescription.prescription_items?.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {prescription.prescription_items.map((item: any) => (
                  <div key={item.id} className="bg-muted/50 rounded-lg p-2 flex items-center gap-2 text-sm">
                    <Pill className="w-3.5 h-3.5 text-success shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">{item.medicine_name}</span>
                      <span className="text-muted-foreground"> — {item.dosage} · {item.frequency} · {item.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rejection reason */}
        {apt.status === "cancelled" && apt.rejection_reason && (
          <div className="bg-destructive/5 rounded-2xl border border-destructive/20 p-4">
            <p className="text-xs font-medium text-destructive">Rejection Reason</p>
            <p className="text-sm text-foreground mt-1">{apt.rejection_reason}</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
