import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { CalendarCheck, FileText, User, Pill } from "lucide-react";

interface PatientHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  doctorId: string;
}

export default function PatientHistory({ open, onOpenChange, patientId, doctorId }: PatientHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    if (!open || !patientId) return;
    setLoading(true);

    const load = async () => {
      const [profileRes, appointmentsRes, prescriptionsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", patientId).maybeSingle(),
        supabase.from("appointments")
          .select("*")
          .eq("patient_id", patientId)
          .eq("doctor_id", doctorId)
          .order("appointment_date", { ascending: false })
          .limit(50),
        supabase.from("prescriptions")
          .select("*, prescription_items(*)")
          .eq("patient_id", patientId)
          .eq("doctor_id", doctorId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      setProfile(profileRes.data);
      setAppointments(appointmentsRes.data || []);
      setPrescriptions(prescriptionsRes.data || []);
      setLoading(false);
    };
    load();
  }, [open, patientId, doctorId]);

  const statusColor = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (s) {
      case "confirmed": return "default";
      case "completed": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Patient Medical History
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Patient Info */}
            <Card className="p-4 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{profile?.full_name || "Unknown Patient"}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email} · {profile?.phone || "No phone"}</p>
                </div>
              </div>
            </Card>

            <Tabs defaultValue="appointments" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="appointments" className="gap-1">
                  <CalendarCheck className="w-3.5 h-3.5" /> Appointments ({appointments.length})
                </TabsTrigger>
                <TabsTrigger value="prescriptions" className="gap-1">
                  <Pill className="w-3.5 h-3.5" /> Prescriptions ({prescriptions.length})
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px] mt-3">
                <TabsContent value="appointments" className="space-y-2 mt-0">
                  {appointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No previous appointments</p>
                  ) : appointments.map(apt => (
                    <Card key={apt.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-foreground">{apt.service_type}</p>
                          <p className="text-xs text-muted-foreground">
                            📅 {apt.appointment_date} · 🕐 {apt.appointment_time}
                          </p>
                          {apt.consultation_notes && (
                            <p className="text-xs text-primary mt-1">💊 {apt.consultation_notes}</p>
                          )}
                          {apt.follow_up_date && (
                            <p className="text-xs text-blue-500">📋 Follow-up: {apt.follow_up_date}</p>
                          )}
                        </div>
                        <Badge variant={statusColor(apt.status)} className="text-xs shrink-0">{apt.status}</Badge>
                      </div>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="prescriptions" className="space-y-2 mt-0">
                  {prescriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No prescriptions</p>
                  ) : prescriptions.map(rx => (
                    <Card key={rx.id} className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">
                            <FileText className="w-3.5 h-3.5 inline mr-1" />
                            {rx.diagnosis || "Prescription"}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(rx.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {rx.notes && <p className="text-xs text-muted-foreground">{rx.notes}</p>}
                        {rx.prescription_items?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {rx.prescription_items.map((item: any) => (
                              <div key={item.id} className="text-xs bg-muted/50 rounded px-2 py-1 flex items-center gap-2">
                                <Pill className="w-3 h-3 text-primary shrink-0" />
                                <span className="font-medium">{item.medicine_name}</span>
                                <span className="text-muted-foreground">
                                  {item.dosage} · {item.frequency} · {item.duration}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
