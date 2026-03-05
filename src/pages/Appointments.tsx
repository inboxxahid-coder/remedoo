import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, AlertCircle, CalendarClock, Hash, Star, Download } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import PatientQueueView from "@/components/patient/PatientQueueView";
import ReviewDialog from "@/components/patient/ReviewDialog";
import { generateAppointmentInvoice } from "@/lib/generateAppointmentInvoice";

type AppointmentWithProvider = {
  id: string;
  service_type: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  provider_name: string;
  token_number: number | null;
  doctor_id: string | null;
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
  const [rescheduleApt, setRescheduleApt] = useState<AppointmentWithProvider | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AppointmentWithProvider | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [newTime, setNewTime] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  // OTP state
  const [otpStep, setOtpStep] = useState<"confirm" | "otp" | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpChannels, setOtpChannels] = useState<string[]>([]);
  const [reviewTarget, setReviewTarget] = useState<AppointmentWithProvider | null>(null);

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00",
  ];

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

  const handleCancelClick = (apt: AppointmentWithProvider) => {
    setCancelTarget(apt);
    setOtpStep("confirm");
    setOtpCode("");
    setOtpChannels([]);
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;

    // For confirmed appointments, check if OTP is required
    if (cancelTarget.status === "confirmed") {
      setOtpSending(true);
      try {
        const { data, error } = await supabase.functions.invoke("send-cancellation-otp", {
          body: { appointment_id: cancelTarget.id },
        });

        if (error) throw error;

        if (data?.otp_required) {
          setOtpChannels(data.channels_used || []);
          setOtpStep("otp");
          toast.info(`OTP sent via ${(data.channels_used || []).join(", ")}`);
        } else {
          // OTP not required by admin, cancel directly
          cancelAppointment(cancelTarget.id);
          closeCancelDialog();
        }
      } catch (err: any) {
        console.error("OTP send error:", err);
        toast.error("Failed to send OTP. Please try again.");
      } finally {
        setOtpSending(false);
      }
    } else {
      // Pending appointments - cancel directly
      cancelAppointment(cancelTarget.id);
      closeCancelDialog();
    }
  };

  const handleOtpVerify = async () => {
    if (!cancelTarget || otpCode.length !== 6) return;
    setOtpVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-cancellation-otp", {
        body: { appointment_id: cancelTarget.id, otp_code: otpCode },
      });

      if (error) throw error;

      if (data?.verified) {
        toast.success("Appointment cancelled successfully");
        closeCancelDialog();
        loadAppointments();
      } else {
        toast.error(data?.error || "Invalid OTP");
      }
    } catch (err: any) {
      console.error("OTP verify error:", err);
      toast.error("Verification failed. Please try again.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const closeCancelDialog = () => {
    setCancelTarget(null);
    setOtpStep(null);
    setOtpCode("");
    setOtpChannels([]);
  };

  const openReschedule = (apt: AppointmentWithProvider) => {
    setRescheduleApt(apt);
    setNewDate(new Date(apt.appointment_date + "T00:00:00"));
    setNewTime(apt.appointment_time.slice(0, 5));
  };

  const handleReschedule = async () => {
    if (!rescheduleApt || !newDate || !newTime) return;
    setRescheduling(true);
    const dateStr = format(newDate, "yyyy-MM-dd");
    const { error } = await supabase
      .from("appointments")
      .update({ appointment_date: dateStr, appointment_time: newTime })
      .eq("id", rescheduleApt.id);
    setRescheduling(false);
    if (error) toast.error("Failed to reschedule");
    else {
      toast.success("Appointment rescheduled");
      setRescheduleApt(null);
      loadAppointments();
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const upcoming = appointments.filter((a) => a.appointment_date >= today && a.status !== "cancelled");
  const past = appointments.filter((a) => a.appointment_date < today || a.status === "cancelled");
  const display = tab === "upcoming" ? upcoming : past;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-primary page-header px-5 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground">Appointments</h1>
          <span className="ml-auto text-primary-foreground/60 text-xs font-medium">{appointments.length} total</span>
        </div>
        <div className="flex gap-2">
          {(["upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t ? "bg-primary-foreground text-primary shadow-sm" : "bg-primary-foreground/15 text-primary-foreground"
              }`}
            >
              {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-3 animate-pulse">
              <div className="flex justify-between"><div className="h-4 w-1/3 bg-muted rounded" /><div className="h-5 w-16 bg-muted rounded-full" /></div>
              <div className="flex gap-4"><div className="h-3 w-24 bg-muted rounded" /><div className="h-3 w-16 bg-muted rounded" /></div>
            </div>
          ))
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
              <div key={apt.id} onClick={() => navigate(`/appointment/${apt.id}`)} className="bg-card rounded-2xl border border-border p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
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
                {apt.token_number && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-primary font-medium">
                    <Hash className="w-3 h-3" /> Token #{apt.token_number}
                  </div>
                )}
                {apt.token_number && apt.doctor_id && apt.status === "confirmed" && (
                  <PatientQueueView
                    appointmentId={apt.id}
                    doctorId={apt.doctor_id}
                    appointmentDate={apt.appointment_date}
                  />
                )}
                {(apt.status === "pending" || apt.status === "confirmed") && tab === "upcoming" && (
                  <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs rounded-lg" onClick={() => openReschedule(apt)}>
                      <CalendarClock className="w-3.5 h-3.5 mr-1" />Reschedule
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs rounded-lg border-emergency text-emergency" onClick={() => handleCancelClick(apt)}>
                      Cancel
                    </Button>
                  </div>
                )}
                {apt.status === "completed" && (
                  <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs rounded-lg" onClick={() => setReviewTarget(apt)}>
                      <Star className="w-3.5 h-3.5 mr-1" />Rate
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs rounded-lg" onClick={async () => {
                      try {
                        // Fetch full appointment details
                        const { data: fullApt } = await supabase
                          .from("appointments")
                          .select("*, doctors(name, phone, specialization, consultation_fee), hospitals(name, phone, location), labs(name, phone, location), pharmacies(name, phone, location)")
                          .eq("id", apt.id)
                          .single();

                        // Fetch patient profile
                        const { data: { session } } = await supabase.auth.getSession();
                        let profile: any = null;
                        if (session) {
                          const { data: p } = await supabase
                            .from("profiles")
                            .select("full_name, phone, email")
                            .eq("user_id", session.user.id)
                            .maybeSingle();
                          profile = p;
                        }

                        // Fetch prescription + items if exists
                        let prescriptionItems: any[] = [];
                        let diagnosis: string | null = null;
                        const { data: prescription } = await supabase
                          .from("prescriptions")
                          .select("*, prescription_items(*)")
                          .eq("appointment_id", apt.id)
                          .maybeSingle();
                        if (prescription) {
                          diagnosis = prescription.diagnosis;
                          prescriptionItems = (prescription as any).prescription_items || [];
                        }

                        const doctor = (fullApt as any)?.doctors;
                        const hospital = (fullApt as any)?.hospitals;
                        const lab = (fullApt as any)?.labs;
                        const pharmacy = (fullApt as any)?.pharmacies;
                        const provider = doctor || hospital || lab || pharmacy;

                        await generateAppointmentInvoice({
                          appointmentId: apt.id,
                          providerName: apt.provider_name,
                          providerType: apt.service_type,
                          providerPhone: provider?.phone || null,
                          providerLocation: provider?.location || null,
                          patientName: profile?.full_name || "Patient",
                          patientPhone: profile?.phone || null,
                          patientEmail: profile?.email || null,
                          appointmentDate: apt.appointment_date,
                          appointmentTime: apt.appointment_time,
                          consultationFee: doctor?.consultation_fee || 0,
                          paymentMethod: fullApt?.payment_method || "at_clinic",
                          paymentStatus: fullApt?.payment_status || "paid",
                          tokenNumber: apt.token_number,
                          department: fullApt?.department || doctor?.specialization || null,
                          consultationNotes: fullApt?.consultation_notes || null,
                          diagnosis,
                          prescriptionItems,
                          followUpDate: fullApt?.follow_up_date || null,
                        });
                      } catch (err) {
                        console.error("Invoice generation error:", err);
                        toast.error("Failed to generate invoice");
                      }
                    }}>
                      <Download className="w-3.5 h-3.5 mr-1" />Invoice
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleApt} onOpenChange={(o) => !o && setRescheduleApt(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>{rescheduleApt?.provider_name} — {rescheduleApt?.service_type}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Select Date</p>
              <CalendarPicker
                mode="single"
                selected={newDate}
                onSelect={setNewDate}
                disabled={(date) => date < new Date(new Date().toDateString())}
                className={cn("p-3 pointer-events-auto rounded-xl border mx-auto")}
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Select Time</p>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewTime(t)}
                    className={cn(
                      "px-2 py-1.5 text-xs rounded-lg border transition-colors",
                      newTime === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <Button
              className="w-full gradient-primary text-primary-foreground"
              disabled={!newDate || !newTime || rescheduling}
              onClick={handleReschedule}
            >
              {rescheduling ? "Rescheduling..." : "Confirm Reschedule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation + OTP Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && closeCancelDialog()}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
          {otpStep === "confirm" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  {cancelTarget?.status === "confirmed" ? (
                    <>
                      ⚠️ This appointment is already <strong>confirmed</strong>. If you paid online, please note that <strong>refunds will not be processed</strong> for cancelled confirmed appointments.
                      <br /><br />
                      {cancelTarget?.status === "confirmed" && "An OTP will be sent to verify your identity before cancellation."}
                    </>
                  ) : (
                    "Are you sure you want to cancel this appointment? This action cannot be undone."
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={closeCancelDialog}>Go Back</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={otpSending}
                  onClick={(e) => {
                    e.preventDefault();
                    handleCancelConfirm();
                  }}
                >
                  {otpSending ? "Sending OTP..." : "Yes, Cancel"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}

          {otpStep === "otp" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Enter Verification Code</AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  A 6-digit OTP has been sent via{" "}
                  <strong>{otpChannels.join(", ")}</strong>. Enter it below to confirm cancellation.
                  <br /><br />
                  <span className="text-destructive font-medium">
                    ⚠️ Refunds will not be reflected for confirmed appointments.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="flex justify-center py-4">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel onClick={closeCancelDialog}>Go Back</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={otpCode.length !== 6 || otpVerifying}
                  onClick={(e) => {
                    e.preventDefault();
                    handleOtpVerify();
                  }}
                >
                  {otpVerifying ? "Verifying..." : "Confirm Cancellation"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Review Dialog */}
      {reviewTarget && (
        <ReviewDialog
          open={!!reviewTarget}
          onOpenChange={(open) => !open && setReviewTarget(null)}
          providerId={reviewTarget.doctor_id || reviewTarget.id}
          providerType={reviewTarget.service_type}
          providerName={reviewTarget.provider_name}
          appointmentId={reviewTarget.id}
          onReviewSubmitted={loadAppointments}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Appointments;
