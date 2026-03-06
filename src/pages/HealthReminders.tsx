import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Bell, Pill, Syringe, Stethoscope, Calendar, Check, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";

const TYPES = [
  { value: "medicine", label: "Medicine", icon: Pill, color: "text-success", bg: "bg-success/10" },
  { value: "vaccination", label: "Vaccination", icon: Syringe, color: "text-primary", bg: "bg-primary/10" },
  { value: "checkup", label: "Health Checkup", icon: Stethoscope, color: "text-warning", bg: "bg-warning/10" },
  { value: "follow_up", label: "Follow-up", icon: Calendar, color: "text-accent-foreground", bg: "bg-accent" },
];

const RECURRENCE = [
  { value: "none", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

interface Reminder {
  id: string;
  type: string;
  title: string;
  description: string | null;
  reminder_date: string;
  reminder_time: string | null;
  recurrence: string;
  is_completed: boolean;
  family_member_id: string | null;
  family_members?: { name: string } | null;
}

export default function HealthReminders() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [familyMembers, setFamilyMembers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"upcoming" | "completed">("upcoming");
  const [form, setForm] = useState({
    type: "medicine", title: "", description: "", reminder_date: "",
    reminder_time: "", recurrence: "none", family_member_id: "",
  });

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login", { replace: true }); return; }
    const [remRes, famRes] = await Promise.all([
      supabase.from("health_reminders").select("*, family_members(name)")
        .eq("user_id", session.user.id).order("reminder_date"),
      supabase.from("family_members").select("id, name").eq("user_id", session.user.id),
    ]);
    setReminders(remRes.data || []);
    setFamilyMembers(famRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!form.title.trim() || !form.reminder_date) { toast.error("Title and date are required"); return; }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("health_reminders").insert({
      user_id: session.user.id,
      type: form.type,
      title: form.title.trim(),
      description: form.description || null,
      reminder_date: form.reminder_date,
      reminder_time: form.reminder_time || null,
      recurrence: form.recurrence,
      family_member_id: form.family_member_id || null,
    });
    toast.success("Reminder created! 🔔");
    setShowForm(false);
    setForm({ type: "medicine", title: "", description: "", reminder_date: "", reminder_time: "", recurrence: "none", family_member_id: "" });
    setSaving(false);
    loadData();
  };

  const toggleComplete = async (r: Reminder) => {
    await supabase.from("health_reminders").update({
      is_completed: !r.is_completed,
      completed_at: !r.is_completed ? new Date().toISOString() : null,
    }).eq("id", r.id);
    loadData();
  };

  const deleteReminder = async (id: string) => {
    await supabase.from("health_reminders").delete().eq("id", id);
    toast.success("Reminder deleted");
    loadData();
  };

  const filtered = reminders.filter(r => filter === "completed" ? r.is_completed : !r.is_completed);

  const dateLabel = (d: string) => {
    const date = parseISO(d);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isPast(date)) return "Overdue";
    return format(date, "MMM d, yyyy");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-primary page-header px-5 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground flex items-center gap-2"><Bell className="w-5 h-5" /> Health Reminders</h1>
        </div>
        <p className="text-primary-foreground/70 text-xs">Stay on top of your health schedule</p>
        <div className="flex gap-2 mt-3">
          {(["upcoming", "completed"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filter === f ? "bg-primary-foreground text-primary" : "bg-primary-foreground/20 text-primary-foreground"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3">
        <Button onClick={() => setShowForm(true)} className="w-full gap-2">
          <Plus className="w-4 h-4" /> Add Reminder
        </Button>

        {showForm && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">New Reminder</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Type</Label>
                <div className="flex gap-2 flex-wrap">
                  {TYPES.map(t => (
                    <button key={t.value} onClick={() => setForm(f => ({ ...f, type: t.value }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.type === t.value ? `${t.bg} ${t.color} border-current` : "border-border text-muted-foreground"}`}>
                      <t.icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Take Metformin" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Date *</Label>
                <Input type="date" value={form.reminder_date} onChange={e => setForm(f => ({ ...f, reminder_date: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Time</Label>
                <Input type="time" value={form.reminder_time} onChange={e => setForm(f => ({ ...f, reminder_time: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Repeat</Label>
                <Select value={form.recurrence} onValueChange={v => setForm(f => ({ ...f, recurrence: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{RECURRENCE.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">For Member</Label>
                <Select value={form.family_member_id} onValueChange={v => setForm(f => ({ ...f, family_member_id: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Self" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Self</SelectItem>
                    {familyMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Notes</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes" className="h-9 text-sm" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full h-9 text-sm">
              {saving ? "Saving..." : "Create Reminder"}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No {filter} reminders</p>
          </div>
        ) : (
          filtered.map(r => {
            const cfg = TYPES.find(t => t.value === r.type) || TYPES[0];
            const Icon = cfg.icon;
            const overdue = !r.is_completed && isPast(parseISO(r.reminder_date)) && !isToday(parseISO(r.reminder_date));
            return (
              <div key={r.id} className={`bg-card rounded-2xl border p-4 ${overdue ? "border-destructive/40" : "border-border"}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleComplete(r)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${r.is_completed ? "bg-success/20" : cfg.bg}`}>
                    {r.is_completed ? <Check className="w-5 h-5 text-success" /> : <Icon className={`w-5 h-5 ${cfg.color}`} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className={`font-semibold text-sm ${r.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{r.title}</h3>
                      <button onClick={() => deleteReminder(r.id)} className="p-1 rounded hover:bg-destructive/10">
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${overdue ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                        {dateLabel(r.reminder_date)}
                      </span>
                      {r.reminder_time && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {r.reminder_time.slice(0, 5)}
                        </span>
                      )}
                      {r.recurrence !== "none" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">{r.recurrence}</span>
                      )}
                      {r.family_members && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{(r.family_members as any).name}</span>
                      )}
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
}
