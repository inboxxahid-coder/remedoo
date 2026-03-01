import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import {
  Search, Filter, CalendarCheck, FileText, CalendarPlus, MessageSquare,
  Upload, ChevronLeft, ChevronRight, CheckCircle, Pill, User, Hash,
  LockKeyhole, FilePenLine
} from "lucide-react";
import PrescriptionBuilder from "@/components/doctor/PrescriptionBuilder";
import PatientHistory from "@/components/doctor/PatientHistory";
import LiveQueue from "@/components/doctor/LiveQueue";

const PAGE_SIZE = 10;

export default function DoctorAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  // Dialog states
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showEditRequestDialog, setShowEditRequestDialog] = useState(false);
  const [editRequestValue, setEditRequestValue] = useState("");
  const [consultationNotes, setConsultationNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPrescriptionBuilder, setShowPrescriptionBuilder] = useState(false);
  const [showPatientHistory, setShowPatientHistory] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState("");
  const [doctorSpecialization, setDoctorSpecialization] = useState("");

  const LOCK_HOURS = 24;

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: doctor } = await supabase
      .from("doctors")
      .select("id, name, specialization")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!doctor) { setLoading(false); return; }
    setDoctorId(doctor.id);
    setDoctorName(doctor.name || "");
    setDoctorSpecialization(doctor.specialization || "");

    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("doctor_id", doctor.id)
      .order("appointment_date", { ascending: false });

    setAppointments(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = appointments.filter(apt => {
    const matchesStatus = statusFilter === "all" || apt.status === statusFilter;
    const matchesSearch = !search ||
      apt.service_type?.toLowerCase().includes(search.toLowerCase()) ||
      apt.notes?.toLowerCase().includes(search.toLowerCase()) ||
      apt.appointment_date?.includes(search);
    const matchesDateFrom = !dateFrom || apt.appointment_date >= dateFrom;
    const matchesDateTo = !dateTo || apt.appointment_date <= dateTo;
    return matchesStatus && matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const updateStatus = async (id: string, status: string, extra?: Record<string, any>) => {
    const today = new Date().toISOString().split("T")[0];
    const apt = appointments.find(a => a.id === id);

    // Prevent modifying locked completed records
    if (apt && isLocked(apt)) {
      toast.error("This record is locked. Please submit an edit request instead.");
      return;
    }

    // Prevent modifying past completed records
    if (apt?.status === "completed" && apt.appointment_date < today) {
      toast.error("Cannot modify past completed appointments");
      return;
    }

    const updateData: any = { status, ...extra };
    const { error } = await supabase.from("appointments").update(updateData).eq("id", id);
    if (error) { toast.error(error.message); return; }

    toast.success(`Appointment ${status}`);
    logAuditAction({
      action: `appointment_${status}`,
      entityType: "appointment",
      entityId: id,
      details: { status, ...extra },
    });
    load();
  };

  const handleAccept = (id: string) => updateStatus(id, "confirmed");

  const handleReject = () => {
    if (!selectedApt || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    updateStatus(selectedApt.id, "cancelled", { rejection_reason: rejectionReason } as any);
    setShowRejectDialog(false);
    setRejectionReason("");
  };

  const handleComplete = () => {
    if (!selectedApt) return;
    const extra: any = { completed_at: new Date().toISOString() };
    if (consultationNotes.trim()) extra.consultation_notes = consultationNotes;
    if (followUpDate) extra.follow_up_date = followUpDate;
    updateStatus(selectedApt.id, "completed", extra);
    setShowNotesDialog(false);
    setConsultationNotes("");
    setFollowUpDate("");
  };

  const isLocked = (apt: any) => {
    if (apt.status !== "completed") return false;
    const completedAt = apt.completed_at ? new Date(apt.completed_at) : new Date(apt.updated_at);
    const hoursSince = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60);
    return hoursSince >= LOCK_HOURS;
  };

  const handleRequestEdit = async () => {
    if (!selectedApt || !editRequestValue.trim() || !doctorId) {
      toast.error("Please provide updated notes");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("consultation_edit_requests").insert({
      appointment_id: selectedApt.id,
      doctor_id: doctorId,
      requested_by: session.user.id,
      field_name: "consultation_notes",
      old_value: (selectedApt as any).consultation_notes || null,
      new_value: editRequestValue,
    } as any);

    if (error) { toast.error(error.message); return; }
    toast.success("Edit request submitted for admin approval");
    logAuditAction({ action: "request_edit_locked_notes", entityType: "appointment", entityId: selectedApt.id });
    setShowEditRequestDialog(false);
    setEditRequestValue("");
  };

  const handleReschedule = () => {
    if (!selectedApt || !newDate || !newTime) {
      toast.error("Please provide new date and time");
      return;
    }
    updateStatus(selectedApt.id, "pending", {
      appointment_date: newDate,
      appointment_time: newTime,
    });
    setShowRescheduleDialog(false);
    setNewDate("");
    setNewTime("");
  };

  const handleUploadPrescription = async (aptId: string) => {
    if (!prescriptionFile) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(prescriptionFile.type)) {
      toast.error("Only PDF, JPEG, PNG, WEBP files allowed");
      return;
    }
    if (prescriptionFile.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }

    setUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUploading(false); return; }

    const filePath = `${session.user.id}/${aptId}_${Date.now()}.${prescriptionFile.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage
      .from("prescriptions")
      .upload(filePath, prescriptionFile);

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("prescriptions").getPublicUrl(filePath);

    await supabase.from("appointments").update({ prescription_url: publicUrl } as any).eq("id", aptId);
    toast.success("Prescription uploaded");
    logAuditAction({ action: "upload_prescription", entityType: "appointment", entityId: aptId });
    setPrescriptionFile(null);
    setUploading(false);
    load();
  };

  const statusColor = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (s) {
      case "confirmed": return "default";
      case "completed": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-48 h-8 rounded" />
        <div className="flex gap-3">
          <Skeleton className="flex-1 h-10 rounded-xl" />
          <Skeleton className="w-32 h-10 rounded-xl" />
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
        <Badge variant="outline" className="text-sm">
          <CalendarCheck className="w-3.5 h-3.5 mr-1" />
          {filtered.length} results
        </Badge>
      </div>

      {/* Live Queue Panel */}
      {doctorId && <LiveQueue doctorId={doctorId} />}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger>
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} placeholder="From" />
        <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} placeholder="To" />
      </div>

      {/* List */}
      {paginated.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No appointments found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginated.map(apt => (
            <Card key={apt.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{apt.service_type}</p>
                    <Badge variant={statusColor(apt.status)}>{apt.status}</Badge>
                    {apt.token_number && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Hash className="w-3 h-3" /> Token {apt.token_number}
                      </Badge>
                    )}
                  </div>
                   <p className="text-sm text-muted-foreground">
                     📅 {apt.appointment_date} · 🕐 {apt.appointment_time}
                   </p>
                   <div className="flex items-center gap-1.5 flex-wrap">
                     <span className="text-xs text-muted-foreground">
                       {apt.payment_method === "online" ? "💳 Online" : "🏥 At Clinic"}
                     </span>
                     {apt.payment_method === "online" && (
                       <Badge variant={apt.payment_status === "paid" ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                         {apt.payment_status === "paid" ? "Paid" : "Unpaid"}
                       </Badge>
                     )}
                   </div>
                  {apt.notes && <p className="text-xs text-muted-foreground">📝 {apt.notes}</p>}
                  {(apt as any).consultation_notes && (
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-primary">💊 Notes: {(apt as any).consultation_notes}</p>
                      {isLocked(apt) && <LockKeyhole className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  )}
                  {(apt as any).follow_up_date && (
                    <p className="text-xs text-muted-foreground">📋 Follow-up: {(apt as any).follow_up_date}</p>
                  )}
                  {(apt as any).rejection_reason && (
                    <p className="text-xs text-destructive">❌ Reason: {(apt as any).rejection_reason}</p>
                  )}
                  {(apt as any).prescription_url && (
                    <a href={(apt as any).prescription_url} target="_blank" rel="noopener" className="text-xs text-primary underline">
                      📄 View Prescription
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Patient History Button - always visible */}
                  <Button size="sm" variant="ghost" onClick={() => { setSelectedPatientId(apt.patient_id); setShowPatientHistory(true); }}>
                    <User className="w-3.5 h-3.5 mr-1" /> History
                  </Button>
                  {apt.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => navigate(`/doctor/appointments/${apt.id}`)}>
                        Review & Confirm
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => { setSelectedApt(apt); setShowRejectDialog(true); }}>
                        Reject
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedApt(apt); setShowRescheduleDialog(true); }}>
                        Reschedule
                      </Button>
                    </>
                  )}
                  {apt.status === "confirmed" && (
                    <>
                      <Button size="sm" onClick={() => { setSelectedApt(apt); setConsultationNotes((apt as any).consultation_notes || ""); setFollowUpDate((apt as any).follow_up_date || ""); setShowNotesDialog(true); }}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Complete
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedApt(apt); setShowRescheduleDialog(true); }}>
                        Reschedule
                      </Button>
                    </>
                  )}
                  {(apt.status === "confirmed" || apt.status === "completed") && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedApt(apt); setShowPrescriptionBuilder(true); }}>
                        <Pill className="w-3.5 h-3.5 mr-1" /> Write Rx
                      </Button>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        id={`rx-${apt.id}`}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) { setPrescriptionFile(f); handleUploadPrescription(apt.id); }
                        }}
                      />
                      <Button size="sm" variant="ghost" onClick={() => document.getElementById(`rx-${apt.id}`)?.click()} disabled={uploading}>
                        <Upload className="w-3.5 h-3.5 mr-1" /> Upload
                      </Button>
                    </div>
                  )}
                  {apt.status === "completed" && isLocked(apt) && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                      setSelectedApt(apt);
                      setEditRequestValue((apt as any).consultation_notes || "");
                      setShowEditRequestDialog(true);
                    }}>
                      <FilePenLine className="w-3.5 h-3.5 mr-1" /> Request Edit
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason for rejection *</Label>
            <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Provide reason..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete with Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Consultation Notes</Label>
              <Textarea value={consultationNotes} onChange={e => setConsultationNotes(e.target.value)} placeholder="Add consultation notes..." />
            </div>
            <div>
              <Label>Follow-up Date</Label>
              <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>Cancel</Button>
            <Button onClick={handleComplete}>Mark Completed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>New Date</Label>
              <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
            <div>
              <Label>New Time</Label>
              <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>Cancel</Button>
            <Button onClick={handleReschedule}>Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prescription Builder */}
      {selectedApt && doctorId && (
        <PrescriptionBuilder
          open={showPrescriptionBuilder}
          onOpenChange={setShowPrescriptionBuilder}
          appointment={selectedApt}
          doctorId={doctorId}
          doctorName={doctorName}
          specialization={doctorSpecialization}
        />
      )}

      {/* Patient History */}
      {selectedPatientId && doctorId && (
        <PatientHistory
          open={showPatientHistory}
          onOpenChange={setShowPatientHistory}
          patientId={selectedPatientId}
          doctorId={doctorId}
        />
      )}

      {/* Edit Request Dialog for Locked Notes */}
      <Dialog open={showEditRequestDialog} onOpenChange={setShowEditRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockKeyhole className="w-4 h-4 text-muted-foreground" />
              Request Edit — Locked Record
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This record is locked ({LOCK_HOURS}h after completion). Your edit request will be sent to an admin for approval.
            </p>
            <div>
              <Label>Current Notes</Label>
              <p className="text-sm bg-muted/50 p-2 rounded-lg mt-1">{selectedApt?.consultation_notes || "No notes"}</p>
            </div>
            <div>
              <Label>Updated Notes *</Label>
              <Textarea value={editRequestValue} onChange={e => setEditRequestValue(e.target.value)} placeholder="Enter updated consultation notes..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditRequestDialog(false)}>Cancel</Button>
            <Button onClick={handleRequestEdit}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
