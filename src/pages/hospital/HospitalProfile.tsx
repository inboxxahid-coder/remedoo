import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";

export default function HospitalProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("hospitals").select("*").eq("user_id", session.user.id).maybeSingle();
      setProfile(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("hospitals").update({
      name: profile.name, location: profile.location, phone: profile.phone,
      emergency_contact: profile.emergency_contact, is_government: profile.is_government,
      total_beds: profile.total_beds, available_beds: profile.available_beds,
      total_icu_beds: profile.total_icu_beds, available_icu_beds: profile.available_icu_beds,
    }).eq("id", profile.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated");
      logAuditAction({ action: "update_hospital_profile", entityType: "hospital", entityId: profile.id });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!profile) return <p className="text-center text-muted-foreground py-12">No linked hospital profile</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Hospital Profile</h1>
      <Card className="p-6 space-y-4">
        <div><Label>Name</Label><Input value={profile.name || ""} onChange={e => setProfile({ ...profile, name: e.target.value })} /></div>
        <div><Label>Location</Label><Input value={profile.location || ""} onChange={e => setProfile({ ...profile, location: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Phone</Label><Input value={profile.phone || ""} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></div>
          <div><Label>Emergency Contact</Label><Input value={profile.emergency_contact || ""} onChange={e => setProfile({ ...profile, emergency_contact: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Total Beds</Label><Input type="number" value={profile.total_beds || 0} onChange={e => setProfile({ ...profile, total_beds: Number(e.target.value) })} /></div>
          <div><Label>Available Beds</Label><Input type="number" value={profile.available_beds || 0} onChange={e => setProfile({ ...profile, available_beds: Number(e.target.value) })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Total ICU Beds</Label><Input type="number" value={profile.total_icu_beds || 0} onChange={e => setProfile({ ...profile, total_icu_beds: Number(e.target.value) })} /></div>
          <div><Label>Available ICU Beds</Label><Input type="number" value={profile.available_icu_beds || 0} onChange={e => setProfile({ ...profile, available_icu_beds: Number(e.target.value) })} /></div>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={profile.is_government || false} onCheckedChange={v => setProfile({ ...profile, is_government: v })} />
          <Label>Government Hospital</Label>
        </div>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
      </Card>
    </div>
  );
}
