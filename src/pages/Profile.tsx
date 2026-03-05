import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Mail, Phone, User, Save, Loader2, MapPin, LocateFixed, Lock, KeyRound } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import avatarMale from "@/assets/avatar-male.png";
import avatarFemale from "@/assets/avatar-female.png";
import avatarOther from "@/assets/avatar-other.png";

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", gender: "", address: "",
  });

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

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
        setAvatarUrl(data.avatar_url);
        setForm({
          full_name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
          gender: (data as any).gender || "",
          address: (data as any).address || "",
        });
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const getDefaultAvatar = (gender: string) => {
    if (gender === "male") return avatarMale;
    if (gender === "female") return avatarFemale;
    if (gender === "other") return avatarOther;
    return null;
  };

  const isDefaultAvatar = !avatarUrl || avatarUrl === avatarMale || avatarUrl === avatarFemale || avatarUrl === avatarOther;
  const displayAvatar = isDefaultAvatar ? getDefaultAvatar(form.gender) || avatarUrl : avatarUrl;

  const handleGenderChange = async (value: string) => {
    setForm(f => ({ ...f, gender: value }));
    // If user has no custom avatar (or is using a default one), update to match new gender
    if (isDefaultAvatar && profile) {
      const defaultAv = getDefaultAvatar(value);
      if (defaultAv) {
        setAvatarUrl(defaultAv);
        await supabase.from("profiles").update({ avatar_url: defaultAv } as any).eq("id", profile.id);
      }
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        gender: form.gender || null,
        address: form.address.trim() || null,
      } as any)
      .eq("id", profile.id);

    setSaving(false);
    if (error) toast.error("Failed to update profile");
    else toast.success("Profile updated!");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }

    setUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const ext = file.name.split(".").pop();
    const filePath = `${session.user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) { toast.error("Failed to upload avatar"); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", profile.id);

    setUploading(false);
    if (updateError) toast.error("Failed to save avatar");
    else { setAvatarUrl(publicUrl); toast.success("Avatar updated!"); }
  };

  const fetchGpsAddress = async () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          if (data.display_name) {
            setForm(f => ({ ...f, address: data.display_name }));
            // Save lat/lng too
            if (profile) {
              await supabase.from("profiles").update({
                latitude, longitude,
              } as any).eq("id", profile.id);
            }
            toast.success("Location detected!");
          } else {
            toast.error("Could not determine address");
          }
        } catch { toast.error("Failed to fetch address"); }
        finally { setLocatingGps(false); }
      },
      (err) => { setLocatingGps(false); toast.error(err.message || "Unable to get location"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePasswordReset = async () => {
    if (!form.email) { toast.error("No email found"); return; }
    setPasswordLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPasswordLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent to your email!");
  };

  const initials = form.full_name
    ? form.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
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
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-24 h-24 rounded-full bg-primary-foreground/20 border-4 border-primary-foreground/30 flex items-center justify-center overflow-hidden"
            >
              {displayAvatar ? (
                <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary-foreground">{initials}</span>
              )}
            </button>
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-md">
              {uploading ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" /> : <Camera className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
          <h2 className="text-lg font-semibold text-primary-foreground mt-3">{form.full_name || "Patient"}</h2>
          <p className="text-primary-foreground/70 text-sm">{form.email}</p>
        </div>
      </div>

      {/* Form */}
      <div className="px-5 -mt-6 space-y-4">
        {/* Basic Info */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-primary" /> Full Name</Label>
            <Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your full name" maxLength={100} />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-primary" /> Email</Label>
            <Input value={form.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-primary" /> Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" maxLength={20} />
          </div>

          {/* Gender Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-primary" /> Gender</Label>
            <RadioGroup value={form.gender} onValueChange={handleGenderChange} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male" className="flex items-center gap-2 cursor-pointer">
                  <img src={avatarMale} alt="Male" className="w-8 h-8 rounded-full" />
                  <span className="text-sm">Male</span>
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female" className="flex items-center gap-2 cursor-pointer">
                  <img src={avatarFemale} alt="Female" className="w-8 h-8 rounded-full" />
                  <span className="text-sm">Female</span>
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="flex items-center gap-2 cursor-pointer">
                  <img src={avatarOther} alt="Other" className="w-8 h-8 rounded-full" />
                  <span className="text-sm">Other</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Address with GPS */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-primary" /> Saved Address</Label>
            <Button variant="outline" size="sm" onClick={fetchGpsAddress} disabled={locatingGps} className="rounded-xl text-xs gap-1.5 border-primary text-primary">
              <LocateFixed className={`w-3.5 h-3.5 ${locatingGps ? "animate-spin" : ""}`} />
              {locatingGps ? "Locating..." : "Use GPS"}
            </Button>
          </div>
          <Textarea
            value={form.address}
            onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
            placeholder="Enter your address or use GPS to auto-detect..."
            className="rounded-xl resize-none"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">This address will be auto-filled in your orders</p>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>

        {/* Change Password */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <button
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="flex items-center justify-between w-full"
          >
            <Label className="flex items-center gap-2 text-sm cursor-pointer"><KeyRound className="w-4 h-4 text-primary" /> Change Password</Label>
            <Lock className="w-4 h-4 text-muted-foreground" />
          </button>
          {showPasswordSection && (
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                We'll send a password reset link to <span className="font-medium text-foreground">{form.email}</span>. Click the link in your email to set a new password.
              </p>
              <Button
                onClick={handlePasswordReset}
                disabled={passwordLoading}
                variant="outline"
                className="w-full rounded-xl border-primary text-primary"
              >
                <Mail className="w-4 h-4 mr-2" />
                {passwordLoading ? "Sending..." : "Send Password Reset Email"}
              </Button>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Profile;
