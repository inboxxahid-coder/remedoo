import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Mail, Phone, User, Save } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login", { replace: true }); return; }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (data) {
        setProfile(data);
        setForm({
          full_name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
        });
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
      })
      .eq("id", profile.id);

    setSaving(false);
    if (error) toast.error("Failed to update profile");
    else toast.success("Profile updated!");
  };

  const initials = form.full_name
    ? form.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="gradient-primary px-5 pt-10 pb-16 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-primary-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-primary-foreground">My Profile</h1>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary-foreground/20 border-4 border-primary-foreground/30 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary-foreground">{initials}</span>
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-md">
              <Camera className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-primary-foreground mt-3">{form.full_name || "Patient"}</h2>
          <p className="text-primary-foreground/70 text-sm">{form.email}</p>
        </div>
      </div>

      {/* Form */}
      <div className="px-5 -mt-6">
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-primary" /> Full Name
            </Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Your full name"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-primary" /> Email
            </Label>
            <Input value={form.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-primary" /> Phone
            </Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+1 234 567 8900"
              maxLength={20}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Profile;
