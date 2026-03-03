import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import {
  ArrowLeft, CalendarCheck, CreditCard, Banknote, Clock,
  CheckCircle, XCircle, User, Hash, IndianRupee, FileText, Upload, Download
} from "lucide-react";
import PatientHistory from "@/components/doctor/PatientHistory";

export default function DoctorAppointmentDetail() {
  const navigate = useNavigate();
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [apt, setApt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [uploadingPrescription, setUploadingPrescription] = useState(false);
  const prescriptionFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!appointmentId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }

    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .single();

    if (!data) { toast.error("Appointment not found"); navigate(-1 as any); return; }
    setApt(data);

    // Fetch patient profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, email")
      .eq("user_id", data.patient_id)
      .maybeSingle();
    setPatientProfile(profile);

    // Fetch provider name
    if (data.doctor_id) {
      const { data: doc } = await supabase.from("doctors").select("name, consultation_fee").eq("id", data.doctor_id).maybeSingle();
      if (doc) setProviderName(doc.name);
    }

    setLoading(false);
  }, [appointmentId, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async () => {
    if (!apt) return;
    const { error } = await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", apt.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Appointment confirmed!");
    logAuditAction({ action: "appointment_confirmed", entityType: "appointment", entityId: apt.id, details: { payment_method: apt.payment_method, payment_status: apt.payment_status } });
    load();
  };

  const handleReject = async () => {
    if (!apt || !rejectionReason.trim()) { toast.error("Please provide a rejection reason"); return; }
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled", rejection_reason: rejectionReason } as any)
      .eq("id", apt.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Appointment rejected");
    logAuditAction({ action: "appointment_cancelled", entityType: "appointment", entityId: apt.id, details: { reason: rejectionReason } });
    setShowReject(false);
    load();
  };

  const handlePrescriptionUpload = async (file: File) => {
    if (!apt) return;
    setUploadingPrescription(true);
    try {
      const filePath = `${apt.patient_id}/${apt.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("prescriptions")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("appointments")
        .update({ prescription_url: filePath })
        .eq("id", apt.id);
      if (updateError) throw updateError;

      toast.success("Prescription uploaded successfully");
      logAuditAction({ action: "prescription_uploaded", entityType: "appointment", entityId: apt.id });
      load();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingPrescription(false);
    }
  };

  const paymentMethodLabel = (method: string) => {
    switch (method) {
      case "online": return "Online Payment";
      case "at_clinic": return "Pay at Clinic";
      default: return method;
    }
  };

  const paymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-green-500/10 text-green-600 border-green-200">✅ Paid</Badge>;
      case "pending": return <Badge variant="outline" className="text-yellow-600 border-yellow-300">⏳ Pending</Badge>;
      case "failed": return <Badge variant="destructive">❌ Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "confirmed": return <Badge className="bg-green-500/10 text-green-600">Confirmed</Badge>;
      case "completed": return <Badge variant="secondary">Completed</Badge>;
      case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="w-48 h-8" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!apt) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/doctor/appointments")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-bold text-foreground">Appointment Details</h1>
      </div>

      {/* Status Banner */}
      {apt.status === "pending" && apt.payment_method === "online" && apt.payment_status === "paid" && (
        <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Patient has paid online. This appointment was auto-confirmed.
            </p>
          </div>
        </Card>
      )}

      {apt.status === "pending" && apt.payment_method === "at_clinic" && (
        <Card className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              Patient will pay at clinic. Please review and confirm or reject.
            </p>
          </div>
        </Card>
      )}

      {apt.status === "pending" && apt.payment_method === "online" && apt.payment_status !== "paid" && (
        <Card className="p-4 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
              Patient chose online payment but hasn't paid yet. Waiting for payment.
            </p>
          </div>
        </Card>
      )}

      {/* Appointment Info */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            {apt.service_type}
          </h2>
          {statusBadge(apt.status)}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium text-foreground">📅 {apt.appointment_date}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Time</p>
            <p className="font-medium text-foreground">🕐 {apt.appointment_time}</p>
          </div>
          {apt.token_number && (
            <div>
              <p className="text-muted-foreground">Token</p>
              <p className="font-medium text-foreground flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> {apt.token_number}
              </p>
            </div>
          )}
          {apt.department && (
            <div>
              <p className="text-muted-foreground">Department</p>
              <p className="font-medium text-foreground">{apt.department}</p>
            </div>
          )}
        </div>

        {apt.notes && (
          <div>
            <p className="text-muted-foreground text-sm">Patient Notes</p>
            <p className="text-sm bg-muted/50 p-3 rounded-lg mt-1">{apt.notes}</p>
          </div>
        )}
      </Card>

      {/* Patient Info */}
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Patient Information
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium">{patientProfile?.full_name || "N/A"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="font-medium">{patientProfile?.phone || "N/A"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{patientProfile?.email || "N/A"}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
          <FileText className="w-3.5 h-3.5 mr-1" /> View Patient History
        </Button>
      </Card>

      {/* Payment Info */}
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-primary" /> Payment Details
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Payment Method</p>
            <p className="font-medium flex items-center gap-1.5">
              {apt.payment_method === "online" ? (
                <CreditCard className="w-4 h-4 text-primary" />
              ) : (
                <Banknote className="w-4 h-4 text-green-600" />
              )}
              {paymentMethodLabel(apt.payment_method)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Payment Status</p>
            {paymentStatusBadge(apt.payment_status)}
          </div>
        </div>
      </Card>

      {/* Actions */}
      {apt.status === "pending" && (
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-foreground">Actions</h3>

          {!showReject ? (
            <div className="flex gap-3">
              <Button className="flex-1" onClick={handleConfirm}>
                <CheckCircle className="w-4 h-4 mr-1" /> Confirm Appointment
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => setShowReject(true)}>
                <XCircle className="w-4 h-4 mr-1" /> Reject
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Provide reason for rejection..."
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowReject(false)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={handleReject}>Confirm Reject</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Prescription Upload */}
      {(apt.status === "confirmed" || apt.status === "completed") && (
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Prescription
          </h3>
          {apt.prescription_url && (
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
              <FileText className="w-4 h-4 text-success" />
              <span className="text-sm text-foreground flex-1">Prescription uploaded</span>
              <Button size="sm" variant="ghost" onClick={async () => {
                const { data } = await supabase.storage.from("prescriptions").createSignedUrl(apt.prescription_url!, 300);
                if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                else toast.error("Could not generate download link");
              }}>
                <Download className="w-3.5 h-3.5 mr-1" /> View
              </Button>
            </div>
          )}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            ref={prescriptionFileRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePrescriptionUpload(file);
              e.target.value = "";
            }}
          />
          <Button
            variant={apt.prescription_url ? "outline" : "default"}
            size="sm"
            disabled={uploadingPrescription}
            onClick={() => prescriptionFileRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            {uploadingPrescription ? "Uploading..." : apt.prescription_url ? "Re-upload Prescription" : "Upload Prescription"}
          </Button>
        </Card>
      )}

      {/* Rejection reason if cancelled */}
      {apt.status === "cancelled" && apt.rejection_reason && (
        <Card className="p-5 border-destructive/30">
          <p className="text-sm text-destructive font-medium">❌ Rejection Reason:</p>
          <p className="text-sm mt-1">{apt.rejection_reason}</p>
        </Card>
      )}

      {/* Patient History Dialog */}
      {apt.patient_id && (
        <PatientHistory
          open={showHistory}
          onOpenChange={setShowHistory}
          patientId={apt.patient_id}
          doctorId={apt.doctor_id || ""}
        />
      )}
    </div>
  );
}
