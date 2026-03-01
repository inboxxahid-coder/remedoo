import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function LabProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("labs").select("*").eq("user_id", session.user.id).maybeSingle();
      setProfile(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("labs").update({
      name: profile.name, location: profile.location, phone: profile.phone,
    }).eq("id", profile.id);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!profile) return <p className="text-center text-muted-foreground py-12">No linked lab profile</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Lab Profile</h1>
      <Card className="p-6 space-y-4">
        <div><Label>Name</Label><Input value={profile.name || ""} onChange={e => setProfile({ ...profile, name: e.target.value })} /></div>
        <div><Label>Location</Label><Input value={profile.location || ""} onChange={e => setProfile({ ...profile, location: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={profile.phone || ""} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></div>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
      </Card>
    </div>
  );
}
