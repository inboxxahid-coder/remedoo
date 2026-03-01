import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, CalendarOff, Bell, Save, X, Plus } from "lucide-react";

interface WorkingHours {
  [key: string]: string;
}

export default function DoctorSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    "Monday": "09:00-17:00",
    "Tuesday": "09:00-17:00",
    "Wednesday": "09:00-17:00",
    "Thursday": "09:00-17:00",
    "Friday": "09:00-17:00",
    "Saturday": "09:00-14:00",
    "Sunday": "closed",
  });
  const [vacationDates, setVacationDates] = useState<string[]>([]);
  const [newVacationDate, setNewVacationDate] = useState("");
  const [notifAppointment, setNotifAppointment] = useState(true);
  const [notifReminder, setNotifReminder] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: doctor } = await supabase
        .from("doctors")
        .select("id, working_hours, vacation_dates")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (doctor) {
        setDoctorId(doctor.id);
        if (doctor.working_hours && typeof doctor.working_hours === "object") {
          setWorkingHours(prev => ({ ...prev, ...(doctor.working_hours as WorkingHours) }));
        }
        if (doctor.vacation_dates) {
          setVacationDates(doctor.vacation_dates);
        }
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
    }).eq("id", doctorId);

    if (error) toast.error(error.message);
    else toast.success("Settings saved successfully");
    setSaving(false);
  };

  const addVacationDate = () => {
    if (!newVacationDate) return;
    if (vacationDates.includes(newVacationDate)) {
      toast.error("Date already added");
      return;
    }
    setVacationDates([...vacationDates, newVacationDate].sort());
    setNewVacationDate("");
  };

  const removeVacationDate = (date: string) => {
    setVacationDates(vacationDates.filter(d => d !== date));
  };

  const updateHours = (day: string, value: string) => {
    setWorkingHours(prev => ({ ...prev, [day]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-32 h-8 rounded" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!doctorId) {
    return <p className="text-center text-muted-foreground py-12">No linked doctor profile found</p>;
  }

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {/* Working Hours */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Working Hours</h2>
        </div>
        <div className="space-y-3">
          {days.map(day => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium text-foreground">{day}</span>
              <Input
                value={workingHours[day] || "closed"}
                onChange={e => updateHours(day, e.target.value)}
                placeholder="e.g. 09:00-17:00 or closed"
                className="flex-1"
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground mt-1">Format: HH:MM-HH:MM or "closed"</p>
        </div>
      </Card>

      {/* Vacation Dates */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarOff className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Vacation / Leave Dates</h2>
        </div>
        <div className="flex gap-2 mb-3">
          <Input
            type="date"
            value={newVacationDate}
            onChange={e => setNewVacationDate(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={addVacationDate}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
        {vacationDates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vacation dates set</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {vacationDates.map(date => (
              <Badge key={date} variant="secondary" className="gap-1 py-1">
                {date}
                <button onClick={() => removeVacationDate(date)} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Notification Preferences */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Appointment Notifications</Label>
              <p className="text-xs text-muted-foreground">Get notified for new and updated appointments</p>
            </div>
            <Switch checked={notifAppointment} onCheckedChange={setNotifAppointment} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Daily Reminders</Label>
              <p className="text-xs text-muted-foreground">Receive a summary of today's appointments</p>
            </div>
            <Switch checked={notifReminder} onCheckedChange={setNotifReminder} />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save All Settings"}
      </Button>
    </div>
  );
}
