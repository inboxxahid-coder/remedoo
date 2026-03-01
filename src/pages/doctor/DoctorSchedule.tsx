import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { Clock, CalendarOff, Save, X, Plus, Zap, Users } from "lucide-react";

interface WorkingHours {
  [key: string]: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function DoctorSchedule() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    Object.fromEntries(DAYS.map(d => [d, d === "Sunday" ? "closed" : "09:00-17:00"]))
  );
  const [vacationDates, setVacationDates] = useState<string[]>([]);
  const [newVacationDate, setNewVacationDate] = useState("");
  const [consultationDuration, setConsultationDuration] = useState(15);
  const [maxAppointments, setMaxAppointments] = useState(20);
  const [emergencyAvailable, setEmergencyAvailable] = useState(false);

  // Blocked slots
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [newBlockDate, setNewBlockDate] = useState("");
  const [newBlockStart, setNewBlockStart] = useState("");
  const [newBlockEnd, setNewBlockEnd] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");
  const [isFullDay, setIsFullDay] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: doctor } = await supabase
        .from("doctors")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (doctor) {
        setDoctorId(doctor.id);
        if (doctor.working_hours && typeof doctor.working_hours === "object") {
          setWorkingHours(prev => ({ ...prev, ...(doctor.working_hours as WorkingHours) }));
        }
        if (doctor.vacation_dates) setVacationDates(doctor.vacation_dates);
        setConsultationDuration((doctor as any).consultation_duration ?? 15);
        setMaxAppointments((doctor as any).max_appointments_per_day ?? 20);
        setEmergencyAvailable((doctor as any).emergency_available ?? false);

        // Load blocked slots
        const { data: slots } = await supabase
          .from("doctor_blocked_slots" as any)
          .select("*")
          .eq("doctor_id", doctor.id)
          .order("blocked_date", { ascending: true });
        setBlockedSlots(slots || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!doctorId) return;
    setSaving(true);
    const { error } = await supabase.from("doctors").update({
      working_hours: workingHours,
      vacation_dates: vacationDates,
      consultation_duration: consultationDuration,
      max_appointments_per_day: maxAppointments,
      emergency_available: emergencyAvailable,
    } as any).eq("id", doctorId);

    if (error) toast.error(error.message);
    else {
      toast.success("Schedule saved successfully");
      logAuditAction({ action: "update_schedule", entityType: "doctor", entityId: doctorId });
    }
    setSaving(false);
  };

  const addVacationDate = () => {
    if (!newVacationDate) return;
    if (vacationDates.includes(newVacationDate)) { toast.error("Date already added"); return; }
    setVacationDates([...vacationDates, newVacationDate].sort());
    setNewVacationDate("");
  };

  const addBlockedSlot = async () => {
    if (!doctorId || !newBlockDate) { toast.error("Please select a date"); return; }
    if (!isFullDay && (!newBlockStart || !newBlockEnd)) { toast.error("Please provide time range"); return; }

    const { error } = await supabase.from("doctor_blocked_slots" as any).insert({
      doctor_id: doctorId,
      blocked_date: newBlockDate,
      start_time: isFullDay ? null : newBlockStart,
      end_time: isFullDay ? null : newBlockEnd,
      reason: newBlockReason || null,
      is_full_day: isFullDay,
    });

    if (error) { toast.error(error.message); return; }
    toast.success("Slot blocked");
    logAuditAction({ action: "block_slot", entityType: "blocked_slot", details: { date: newBlockDate } });

    // Reload
    const { data: slots } = await supabase
      .from("doctor_blocked_slots" as any)
      .select("*")
      .eq("doctor_id", doctorId)
      .order("blocked_date", { ascending: true });
    setBlockedSlots(slots || []);
    setNewBlockDate("");
    setNewBlockStart("");
    setNewBlockEnd("");
    setNewBlockReason("");
    setIsFullDay(false);
  };

  const removeBlockedSlot = async (id: string) => {
    await supabase.from("doctor_blocked_slots" as any).delete().eq("id", id);
    setBlockedSlots(prev => prev.filter(s => s.id !== id));
    toast.success("Block removed");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-32 h-8 rounded" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
    );
  }

  if (!doctorId) return <p className="text-center text-muted-foreground py-12">No linked doctor profile found</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Schedule & Availability</h1>

      {/* Consultation Settings */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Consultation Settings</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Consultation Duration (minutes)</Label>
            <Select value={String(consultationDuration)} onValueChange={v => setConsultationDuration(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 15, 20, 30, 45, 60].map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Max Appointments / Day</Label>
            <Input type="number" min={1} max={100} value={maxAppointments} onChange={e => setMaxAppointments(Number(e.target.value))} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div>
            <Label className="text-sm font-medium flex items-center gap-1">
              <Zap className="w-4 h-4 text-amber-500" /> Emergency Availability
            </Label>
            <p className="text-xs text-muted-foreground">Receive emergency alerts from your hospital</p>
          </div>
          <Switch checked={emergencyAvailable} onCheckedChange={setEmergencyAvailable} />
        </div>
      </Card>

      {/* Working Hours */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Working Hours</h2>
        </div>
        <div className="space-y-3">
          {DAYS.map(day => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium text-foreground">{day}</span>
              <Input
                value={workingHours[day] || "closed"}
                onChange={e => setWorkingHours(prev => ({ ...prev, [day]: e.target.value }))}
                placeholder="09:00-17:00 or closed"
                className="flex-1"
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Format: HH:MM-HH:MM or "closed"</p>
        </div>
      </Card>

      {/* Leave Dates */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarOff className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Leave / Vacation Dates</h2>
        </div>
        <div className="flex gap-2 mb-3">
          <Input type="date" value={newVacationDate} onChange={e => setNewVacationDate(e.target.value)} className="flex-1" />
          <Button variant="outline" size="sm" onClick={addVacationDate}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
        {vacationDates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leave dates set</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {vacationDates.map(date => (
              <Badge key={date} variant="secondary" className="gap-1 py-1">
                {date}
                <button onClick={() => setVacationDates(v => v.filter(d => d !== date))} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Blocked Slots */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">Block Time Slots</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={newBlockDate} onChange={e => setNewBlockDate(e.target.value)} />
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Input value={newBlockReason} onChange={e => setNewBlockReason(e.target.value)} placeholder="e.g. Personal" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isFullDay} onCheckedChange={setIsFullDay} />
            <Label className="text-sm">Full day block</Label>
          </div>
          {!isFullDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={newBlockStart} onChange={e => setNewBlockStart(e.target.value)} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={newBlockEnd} onChange={e => setNewBlockEnd(e.target.value)} />
              </div>
            </div>
          )}
          <Button variant="outline" onClick={addBlockedSlot}>
            <Plus className="w-4 h-4 mr-1" /> Block Slot
          </Button>
        </div>

        {blockedSlots.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Active Blocks</p>
            {blockedSlots.map((slot: any) => (
              <div key={slot.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <div className="text-sm">
                  <span className="font-medium text-foreground">{slot.blocked_date}</span>
                  {slot.is_full_day ? (
                    <span className="text-muted-foreground ml-2">Full day</span>
                  ) : (
                    <span className="text-muted-foreground ml-2">{slot.start_time}–{slot.end_time}</span>
                  )}
                  {slot.reason && <span className="text-muted-foreground ml-2">({slot.reason})</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeBlockedSlot(slot.id)}>
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Schedule"}
      </Button>
    </div>
  );
}
