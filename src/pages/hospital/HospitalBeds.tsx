import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { BedDouble, Heart, AlertTriangle } from "lucide-react";

export default function HospitalBeds() {
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ total_beds: 0, available_beds: 0, total_icu_beds: 0, available_icu_beds: 0 });

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from("hospitals").select("*").eq("user_id", session.user.id).maybeSingle();
    if (data) {
      setHospital(data);
      setForm({
        total_beds: data.total_beds || 0,
        available_beds: data.available_beds || 0,
        total_icu_beds: data.total_icu_beds || 0,
        available_icu_beds: data.available_icu_beds || 0,
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!hospital) return;
    if (form.available_beds > form.total_beds) { toast.error("Available beds cannot exceed total beds"); return; }
    if (form.available_icu_beds > form.total_icu_beds) { toast.error("Available ICU beds cannot exceed total ICU beds"); return; }

    setSaving(true);
    const { error } = await supabase.from("hospitals").update(form).eq("id", hospital.id);
    if (error) { toast.error(error.message); }
    else {
      toast.success("Bed availability updated");
      logAuditAction({ action: "update_bed_availability", entityType: "hospital", entityId: hospital.id, details: form });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!hospital) return <p className="text-center text-muted-foreground py-12">No linked hospital</p>;

  const bedUtilization = form.total_beds > 0 ? Math.round(((form.total_beds - form.available_beds) / form.total_beds) * 100) : 0;
  const icuUtilization = form.total_icu_beds > 0 ? Math.round(((form.total_icu_beds - form.available_icu_beds) / form.total_icu_beds) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Bed & ICU Management</h1>

      {/* Utilization Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <BedDouble className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">General Beds</h3>
            <Badge variant={bedUtilization > 90 ? "destructive" : bedUtilization > 70 ? "secondary" : "default"}>
              {bedUtilization}% occupied
            </Badge>
          </div>
          <Progress value={bedUtilization} className="mb-2" />
          <p className="text-sm text-muted-foreground">{form.total_beds - form.available_beds} occupied · {form.available_beds} available · {form.total_beds} total</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <Heart className="w-5 h-5 text-rose-500" />
            <h3 className="font-semibold text-foreground">ICU Beds</h3>
            <Badge variant={icuUtilization > 90 ? "destructive" : icuUtilization > 70 ? "secondary" : "default"}>
              {icuUtilization}% occupied
            </Badge>
          </div>
          <Progress value={icuUtilization} className="mb-2" />
          <p className="text-sm text-muted-foreground">{form.total_icu_beds - form.available_icu_beds} occupied · {form.available_icu_beds} available · {form.total_icu_beds} total</p>
        </Card>
      </div>

      {(bedUtilization > 90 || icuUtilization > 90) && (
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <p className="font-semibold text-destructive">Critical: Bed capacity is running low!</p>
          </div>
        </Card>
      )}

      {/* Edit Form */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Update Availability</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Total Beds</Label><Input type="number" min={0} value={form.total_beds} onChange={e => setForm({ ...form, total_beds: Number(e.target.value) })} /></div>
          <div><Label>Available Beds</Label><Input type="number" min={0} max={form.total_beds} value={form.available_beds} onChange={e => setForm({ ...form, available_beds: Number(e.target.value) })} /></div>
          <div><Label>Total ICU Beds</Label><Input type="number" min={0} value={form.total_icu_beds} onChange={e => setForm({ ...form, total_icu_beds: Number(e.target.value) })} /></div>
          <div><Label>Available ICU Beds</Label><Input type="number" min={0} max={form.total_icu_beds} value={form.available_icu_beds} onChange={e => setForm({ ...form, available_icu_beds: Number(e.target.value) })} /></div>
        </div>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Update Bed Availability"}</Button>
      </Card>
    </div>
  );
}
